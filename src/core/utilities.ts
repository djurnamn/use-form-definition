import {
  TranslationConfiguration,
  SelectOption,
  TranslationFunction,
} from "./types";
import { translateValidationMessage } from "./validation-messages";
import { useId } from "react";

// Default locale path functions
const defaultLocalePaths = {
  labels: (key: string) => `form.labels.${key}`,
  options: (key: string) => `form.options.${key}`,
  placeholders: (key: string) => `form.placeholders.${key}`,
  descriptions: (key: string) => `form.descriptions.${key}`,
  sections: (key: string) => `form.sections.${key}`,
  validation: (key: string) => `form.validation.${key}`,
};

/**
 * Normalized translation configuration with all defaults applied
 */
export interface NormalizedTranslationConfiguration {
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
  sections: {
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
 * @deprecated Use `NormalizedTranslationConfiguration` instead. `NormalizedTranslationConfig` is kept as an alias until the next major
 * version.
 */
export type NormalizedTranslationConfig = NormalizedTranslationConfiguration;

/**
 * Normalize translation configuration by applying defaults
 *
 * Supports:
 * - `true`: Enable all translation categories with defaults
 * - Object with `hook` or `function`: Implicitly enables all categories (like `true`)
 * - Object: Fine-grained control over each category
 *   - If a category object is provided, it's implicitly enabled (unless `enabled: false`)
 * - `undefined`: All categories disabled (except validation which is enabled by default)
 */
export const normalizeTranslationConfiguration = (
  configuration?: TranslationConfiguration,
): NormalizedTranslationConfiguration => {
  // Handle boolean shorthand: `translation: true` enables all categories
  const configurationObject = configuration === true ? {} : configuration;

  const translationFunction = configurationObject?.function;

  // If hook or function is provided, implicitly enable all categories (like translation: true)
  // This allows minimal configuration: { hook: useTranslations } or { function: t }
  const hasTranslationSource = !!(
    configurationObject?.hook || translationFunction
  );
  const enableAll = configuration === true || hasTranslationSource;

  // Helper: determine if category is enabled
  // - If category configuration exists (object provided), default to enabled
  // - If `translation: true` or hook/function provided, all are enabled
  // - Otherwise, default to false (except validation)
  const isEnabled = (categoryConfiguration: unknown) =>
    categoryConfiguration !== undefined || enableAll;

  return {
    function: translationFunction,
    labels: {
      enabled:
        configurationObject?.labels?.enabled ??
        isEnabled(configurationObject?.labels),
      alwaysInclude: configurationObject?.labels?.alwaysInclude ?? true, // When enabled, include by default
      localePath:
        configurationObject?.labels?.localePath ?? defaultLocalePaths.labels,
    },
    options: {
      enabled:
        configurationObject?.options?.enabled ??
        isEnabled(configurationObject?.options),
      alwaysInclude: configurationObject?.options?.alwaysInclude ?? true, // When enabled, include by default
      localePath:
        configurationObject?.options?.localePath ?? defaultLocalePaths.options,
    },
    placeholders: {
      enabled:
        configurationObject?.placeholders?.enabled ??
        isEnabled(configurationObject?.placeholders),
      alwaysInclude: configurationObject?.placeholders?.alwaysInclude ?? false, // Require explicit opt-in
      localePath:
        configurationObject?.placeholders?.localePath ??
        defaultLocalePaths.placeholders,
    },
    descriptions: {
      enabled:
        configurationObject?.descriptions?.enabled ??
        isEnabled(configurationObject?.descriptions),
      alwaysInclude: configurationObject?.descriptions?.alwaysInclude ?? false, // Require explicit opt-in
      localePath:
        configurationObject?.descriptions?.localePath ??
        defaultLocalePaths.descriptions,
    },
    sections: {
      enabled:
        configurationObject?.sections?.enabled ??
        isEnabled(configurationObject?.sections),
      alwaysInclude: configurationObject?.sections?.alwaysInclude ?? true, // Like labels - primary presentation
      localePath:
        configurationObject?.sections?.localePath ??
        defaultLocalePaths.sections,
    },
    validation: {
      enabled: configurationObject?.validation?.enabled ?? true, // Enabled by default
      localePath:
        configurationObject?.validation?.localePath ??
        defaultLocalePaths.validation,
    },
  };
};

/**
 * @deprecated Use `normalizeTranslationConfiguration` instead. `normalizeTranslationConfig` is kept as an alias until the next major
 * version.
 */
export const normalizeTranslationConfig = normalizeTranslationConfiguration;

/**
 * Resolve a translatable field value (label, placeholder).
 *
 * Accepts `"auto"` to mean "use the default localePath for this fieldKey",
 * `"none"` to mean "explicit opt-out", `undefined` to defer to
 * `categoryConfiguration.alwaysInclude`, or any other string as a literal label or
 * translation key.
 */
export const resolveTranslatableValue = (
  value: string | undefined,
  fieldKey: string,
  categoryConfiguration: NormalizedTranslationConfiguration["labels"], // Same shape for all categories
  t?: (key: string, options?: Record<string, any>) => string,
): string | undefined => {
  // Explicit opt-out
  if (value === "none") {
    return undefined;
  }

  // If translation not enabled for this category, only literal strings pass through
  if (!categoryConfiguration.enabled) {
    return value === "auto" ? undefined : value;
  }

  // Translation IS enabled, but no translator function available
  if (!t) {
    return value === "auto" ? undefined : value;
  }

  // Determine the translation key
  let translationKey: string | undefined;

  if (value === "auto") {
    translationKey = categoryConfiguration.localePath(fieldKey);
  } else if (typeof value === "string") {
    translationKey = value;
  } else if (value === undefined && categoryConfiguration.alwaysInclude) {
    translationKey = categoryConfiguration.localePath(fieldKey);
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
 * @param optionsConfiguration - The translation options configuration
 * @param t - The translation function
 * @returns Options with resolved labels
 */
export const resolveSelectOptions = (
  options: SelectOption[] | undefined,
  optionsConfiguration: NormalizedTranslationConfiguration["options"],
  t?: (key: string, options?: Record<string, any>) => string,
): SelectOption[] | undefined => {
  if (!options) return undefined;

  return options.map((option) => {
    let resolvedLabel: string;

    if (!optionsConfiguration.enabled) {
      // Translation not enabled - use label as-is, or stringify value
      resolvedLabel = option.label ?? String(option.value);
    } else if (!t) {
      // No t function - use label as-is, or stringify value
      resolvedLabel = option.label ?? String(option.value);
    } else if (option.label !== undefined) {
      // Explicit label = use as translation key
      resolvedLabel = t(option.label);
    } else if (optionsConfiguration.alwaysInclude) {
      // No label + alwaysInclude = use value with localePath
      resolvedLabel = t(optionsConfiguration.localePath(String(option.value)));
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
 * @param validationConfiguration - The validation translation configuration
 * @param t - The translation function
 * @returns A function that translates validation keys
 */
export const createValidationTranslator = (
  validationConfiguration: NormalizedTranslationConfiguration["validation"],
  t?: (key: string, options?: Record<string, any>) => string,
) => {
  return (key: string, options?: Record<string, any>): string => {
    if (!validationConfiguration.enabled) {
      // Translation disabled - return built-in message
      return translateValidationMessage(key, options);
    }

    // Build the full translation key using localePath
    const fullKey = validationConfiguration.localePath(key);

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
