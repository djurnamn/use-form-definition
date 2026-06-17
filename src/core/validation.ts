import { ValidationRule } from "./types";

/**
 * Creates a JSON-encoded validation message for Zod schema errors.
 *
 * Why JSON encoding? Zod's validation messages must be strings, but we need to pass
 * structured data (message key + interpolation options like `{count: 5}`) through them
 * for translation support. The JSON format `["minLength", {"count": 5}]` allows us to:
 *
 * 1. Store the translation key and interpolation options in a single string
 * 2. Parse it later in the UI layer to translate with the correct values
 * 3. Support i18n libraries that need `t('minLength', { count: 5 })` style calls
 *
 * The message is decoded by `parseValidationError` in useFormDefinition.tsx.
 */
export const createMessage = (
  key: string,
  options: { count?: number; [key: string]: string | number | boolean | undefined } = {}
): string => {
  return JSON.stringify([key, options]);
};

// Validation types that include a count option in their message
const countValidationTypes = new Set([
  "minLength",
  "maxLength",
  "minRows",
  "maxRows",
  "min",
  "max",
]);

// Validation types that include the constraint value in their message, so a
// translation can say *what* the string must contain/start with/end with.
const valueValidationTypes = new Set([
  "contains",
  "startsWith",
  "endsWith",
]);

// Get validation rule helper
export const getValidationRule = <T>(
  rule: ValidationRule<T> | undefined,
  type: string
): { value: T; message: string } => {
  if (
    rule &&
    typeof rule === "object" &&
    "value" in rule &&
    "message" in rule
  ) {
    if (typeof rule.message === "string") {
      return {
        value: rule.value,
        message: createMessage(rule.message),
      };
    }
    return {
      value: rule.value,
      message: createMessage(rule.message.key, rule.message.options),
    };
  }

  // Types that include count in their message options
  if (countValidationTypes.has(type)) {
    return {
      value: rule as T,
      message: createMessage(type, { count: rule as number }),
    };
  }

  // Types that include the constraint value in their message options
  if (valueValidationTypes.has(type)) {
    return {
      value: rule as T,
      message: createMessage(type, { value: rule as string }),
    };
  }

  // All other types use the type name as the message key
  return {
    value: rule as T,
    message: createMessage(type),
  };
};