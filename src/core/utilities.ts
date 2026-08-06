import { TranslationConfig, TranslationCategoryConfig, SelectOption, TranslationFunction } from "./types";
import { translateValidationMessage } from "./validation-messages";
import { useId } from 'react';

// Default locale path functions
const defaultLocalePaths = {
  labels: (key: string) => `form.labels.${key}`,
  options: (key: string) => `form.options.${key}`,
  placeholders: (key: string) => `form.placeholders.${key}`,
  descriptions: (key: string) => `form.descriptions.${key}`,
  validation: (key: string) => `form.validation.${key}`,
};

/**
 * Normalized translation config with all defaults applied
 */
export interface NormalizedTranslationConfig {
  /** The resolved translation function (from hook or runtime function) */
  function?: TranslationFunction;
  labels: {
    enabled: boolean;
    alwaysInclude: boolean;
    localePath: (key: string) => string;
  };
  options: {
    enabled: boolean;
    alwaysInclude: boolean;
    localePath: (key: string) => string;
  };
  placeholders: {
    enabled: boolean;
    alwaysInclude: boolean;
    localePath: (key: string) => string;
  };
  descriptions: {
    enabled: boolean;
    alwaysInclude: boolean;
    localePath: (key: string) => string;
  };
  validation: {
    enabled: boolean;
    localePath: (key: string) => string;
  };
}

/**
 * Normalize translation config by applying defaults
 *
 * Supports:
 * - `true`: Enable all translation categories with defaults
 * - Object with `hook` or `function`: Implicitly enables all categories (like `true`)
 * - Object: Fine-grained control over each category
 *   - If a category object is provided, it's implicitly enabled (unless `enabled: false`)
 * - `undefined`: All categories disabled (except validation which is enabled by default)
 */
export const normalizeTranslationConfig = (config?: TranslationConfig): NormalizedTranslationConfig => {
  // Handle boolean shorthand: `translation: true` enables all categories
  const configObj = config === true ? {} : config;

  const translationFn = configObj?.function;

  // If hook or function is provided, implicitly enable all categories (like translation: true)
  // This allows minimal config: { hook: useTranslations } or { function: t }
  const hasTranslationSource = !!(configObj?.hook || translationFn);
  const enableAll = config === true || hasTranslationSource;

  // Helper: determine if category is enabled
  // - If category config exists (object provided), default to enabled
  // - If `translation: true` or hook/function provided, all are enabled
  // - Otherwise, default to false (except validation)
  const isEnabled = (categoryConfig: unknown) =>
    categoryConfig !== undefined || enableAll;

  return {
    function: translationFn,
    labels: {
      enabled: configObj?.labels?.enabled ?? isEnabled(configObj?.labels),
      alwaysInclude: configObj?.labels?.alwaysInclude ?? true, // When enabled, include by default
      localePath: configObj?.labels?.localePath ?? defaultLocalePaths.labels,
    },
    options: {
      enabled: configObj?.options?.enabled ?? isEnabled(configObj?.options),
      alwaysInclude: configObj?.options?.alwaysInclude ?? true, // When enabled, include by default
      localePath: configObj?.options?.localePath ?? defaultLocalePaths.options,
    },
    placeholders: {
      enabled: configObj?.placeholders?.enabled ?? isEnabled(configObj?.placeholders),
      alwaysInclude: configObj?.placeholders?.alwaysInclude ?? false, // Require explicit opt-in
      localePath: configObj?.placeholders?.localePath ?? defaultLocalePaths.placeholders,
    },
    descriptions: {
      enabled: configObj?.descriptions?.enabled ?? isEnabled(configObj?.descriptions),
      alwaysInclude: configObj?.descriptions?.alwaysInclude ?? false, // Require explicit opt-in
      localePath: configObj?.descriptions?.localePath ?? defaultLocalePaths.descriptions,
    },
    validation: {
      enabled: configObj?.validation?.enabled ?? true, // Enabled by default
      localePath: configObj?.validation?.localePath ?? defaultLocalePaths.validation,
    },
  };
};

/**
 * Resolve a translatable field value (label, placeholder).
 *
 * Accepts `"auto"` to mean "use the default localePath for this fieldKey",
 * `"none"` to mean "explicit opt-out", `undefined` to defer to
 * `categoryConfig.alwaysInclude`, or any other string as a literal label or
 * translation key.
 */
export const resolveTranslatableValue = (
  value: string | undefined,
  fieldKey: string,
  categoryConfig: NormalizedTranslationConfig['labels'], // Same shape for all categories
  t?: (key: string, options?: Record<string, any>) => string
): string | undefined => {
  // Explicit opt-out
  if (value === 'none') {
    return undefined;
  }

  // If translation not enabled for this category, only literal strings pass through
  if (!categoryConfig.enabled) {
    return value === 'auto' ? undefined : value;
  }

  // Translation IS enabled, but no translator function available
  if (!t) {
    return value === 'auto' ? undefined : value;
  }

  // Determine the translation key
  let translationKey: string | undefined;

  if (value === 'auto') {
    translationKey = categoryConfig.localePath(fieldKey);
  } else if (typeof value === 'string') {
    translationKey = value;
  } else if (value === undefined && categoryConfig.alwaysInclude) {
    translationKey = categoryConfig.localePath(fieldKey);
  }

  if (translationKey) {
    return t(translationKey);
  }

  return undefined;
};

/**
 * Resolve select option labels with translation support
 *
 * @param options - The select options from the field definition
 * @param optionsConfig - The translation options config
 * @param t - The translation function
 * @returns Options with resolved labels
 */
export const resolveSelectOptions = (
  options: SelectOption[] | undefined,
  optionsConfig: NormalizedTranslationConfig['options'],
  t?: (key: string, options?: Record<string, any>) => string
): SelectOption[] | undefined => {
  if (!options) return undefined;

  return options.map((option) => {
    let resolvedLabel: string;

    if (!optionsConfig.enabled) {
      // Translation not enabled - use label as-is, or stringify value
      resolvedLabel = option.label ?? String(option.value);
    } else if (!t) {
      // No t function - use label as-is, or stringify value
      resolvedLabel = option.label ?? String(option.value);
    } else if (option.label !== undefined) {
      // Explicit label = use as translation key
      resolvedLabel = t(option.label);
    } else if (optionsConfig.alwaysInclude) {
      // No label + alwaysInclude = use value with localePath
      resolvedLabel = t(optionsConfig.localePath(String(option.value)));
    } else {
      // No label, not alwaysInclude = stringify value
      resolvedLabel = String(option.value);
    }

    return {
      ...option,
      label: resolvedLabel,
    };
  });
};

/**
 * Create a validation message translator
 *
 * @param validationConfig - The validation translation config
 * @param t - The translation function
 * @returns A function that translates validation keys
 */
export const createValidationTranslator = (
  validationConfig: NormalizedTranslationConfig['validation'],
  t?: (key: string, options?: Record<string, any>) => string
) => {
  return (key: string, options?: Record<string, any>): string => {
    if (!validationConfig.enabled) {
      // Translation disabled - return built-in message
      return translateValidationMessage(key, options);
    }

    // Build the full translation key using localePath
    const fullKey = validationConfig.localePath(key);

    if (t) {
      return t(fullKey, options);
    }

    // No t function - use built-in messages
    return translateValidationMessage(key, options);
  };
};

// Field name utilities
export const getFieldName = (key: string, field: { name?: string }): string => {
  return field.name || key;
};

// Default value generation
//
// The implementations live in the React-free `./default-values` module so the schema
// layer (reached by the server entry) can consult them without pulling React in. They
// are re-exported here to keep the historical `from "./utilities"` import surface.
export {
  getDefaultValueForField,
  generateDefaultValues,
  registerFieldTypeDefault,
} from "./default-values";

// Field ID utilities

/**
 * Generates a unique ID for form elements
 * Priority: explicit id prop > name prop > generated unique ID
 */
export const useFieldId = (name: string, explicitId?: string): string => {
  const generatedId = useId();

  if (explicitId) {
    return explicitId;
  }

  if (name) {
    return name;
  }

  return generatedId;
};

/**
 * Non-hook version for cases where hooks can't be used
 */
export const generateFieldId = (name: string, explicitId?: string): string => {
  if (explicitId) {
    return explicitId;
  }

  if (name) {
    return name;
  }

  // Fallback to a simple unique identifier
  return `field-${Math.random().toString(36).substring(2, 11)}`;
};