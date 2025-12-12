import { TranslationConfig, TranslationCategoryConfig, SelectOption, TranslationFunction } from "./types";
import { translateValidationMessage } from "./validation-messages";
import { useId } from 'react';

// Default locale path functions
const defaultLocalePaths = {
  labels: (key: string) => `form.labels.${key}`,
  options: (key: string) => `form.options.${key}`,
  placeholders: (key: string) => `form.placeholders.${key}`,
  validation: (key: string) => `form.validation.${key}`,
};

/**
 * Normalized translation config with all defaults applied
 */
export interface NormalizedTranslationConfig {
  /** The resolved translation function (from hook or runtime function) */
  function?: TranslationFunction;
  /** @deprecated Use `function` instead */
  t?: TranslationFunction;
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

  // Support both 'function' and deprecated 't', with 'function' taking precedence
  const translationFn = configObj?.function ?? configObj?.t;

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
    t: translationFn, // Keep for backward compatibility
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
    validation: {
      enabled: configObj?.validation?.enabled ?? true, // Enabled by default
      localePath: configObj?.validation?.localePath ?? defaultLocalePaths.validation,
    },
  };
};

/**
 * Resolve a translatable field value (label, placeholder)
 *
 * @param value - The value from the field definition (undefined, true, false, or string)
 * @param fieldKey - The field key (used for default localePath)
 * @param categoryConfig - The translation category config (labels, placeholders)
 * @param t - The translation function
 * @returns The resolved string value, or undefined if no value
 */
export const resolveTranslatableValue = (
  value: string | boolean | undefined,
  fieldKey: string,
  categoryConfig: NormalizedTranslationConfig['labels'], // Same shape for all categories
  t?: (key: string, options?: Record<string, any>) => string
): string | undefined => {
  // Explicitly false = no value
  if (value === false) {
    return undefined;
  }

  // If translation not enabled for this category
  if (!categoryConfig.enabled) {
    // Return string values as-is (literal), ignore true/undefined
    return typeof value === 'string' ? value : undefined;
  }

  // Translation IS enabled
  if (!t) {
    // No t function, can't translate - return string as-is or undefined
    return typeof value === 'string' ? value : undefined;
  }

  // Determine the translation key
  let translationKey: string | undefined;

  if (typeof value === 'string') {
    // String value = use as translation key directly
    translationKey = value;
  } else if (value === true) {
    // Explicit true = use default localePath
    translationKey = categoryConfig.localePath(fieldKey);
  } else if (value === undefined && categoryConfig.alwaysInclude) {
    // Undefined + alwaysInclude = use default localePath
    translationKey = categoryConfig.localePath(fieldKey);
  }

  // If we have a key, translate it
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
/**
 * Generate the appropriate default value for a field based on its type
 *
 * @param field - The field definition
 * @returns The default value for the field type
 */
export const getDefaultValueForField = (field: {
  type: string;
  defaultValue?: unknown;
}): unknown => {
  // If field has an explicit defaultValue, use it
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  // Otherwise, determine default based on field type
  switch (field.type) {
    case "checkbox":
      return false;
    case "multiselect":
    case "repeater":
      return [];
    case "number":
      return 0;
    default:
      return "";
  }
};

/**
 * Generate default values for all fields in a form definition
 *
 * @param definition - The form definition object
 * @returns An object with default values for each field
 */
export const generateDefaultValues = <T extends Record<string, { type: string; defaultValue?: unknown }>>(
  definition: T
): Record<string, unknown> => {
  return Object.keys(definition).reduce((accumulator, key) => {
    const field = definition[key];
    const defaultValue = getDefaultValueForField(field);
    return { ...accumulator, [key]: defaultValue };
  }, {});
};

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