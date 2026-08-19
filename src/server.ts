/**
 * Server-safe exports for use-form-definition
 *
 * This entry point exports only utilities that don't depend on React,
 * making them safe to use in server-side contexts like Next.js Server Actions,
 * API routes, or any Node.js environment.
 *
 * Usage:
 * ```typescript
 * import { generateDataValidator, generateSchema, parseValidationErrors } from 'use-form-definition/server';
 * ```
 */

// Core types (no React dependency)
export * from "./core/types";

// Shared validation messages (no React dependency)
import { translateValidationMessage } from "./core/validation-messages";

// ============================================================================
// Server-safe error message parsing
// ============================================================================

/**
 * Parse a validation error message from its JSON format to a human-readable string
 *
 * The library stores error messages in JSON format for i18n support:
 * `["minLength", {"count": 2}]`
 *
 * This function converts them to readable messages using built-in English defaults
 * or a custom translate function.
 */
export const parseErrorMessage = (
  errorMessage: string,
  translate?: (key: string, options?: Record<string, unknown>) => string
): string => {
  const t = translate ?? translateValidationMessage;

  // Handle validation error message (JSON string)
  if (errorMessage.startsWith('[')) {
    try {
      const [errorKey, errorOptions] = JSON.parse(errorMessage);
      return t(errorKey, errorOptions);
    } catch {
      return errorMessage;
    }
  }

  // Handle regular string - attempt translation
  return t(errorMessage);
};

/**
 * Parse all validation errors from a Zod SafeParseError result
 *
 * @example
 * ```typescript
 * const result = validator(formData);
 * if (!result.success) {
 *   const errors = parseValidationErrors(result.error.issues);
 *   // { name: ["This field is required"], email: ["Invalid format"] }
 * }
 * ```
 */
export const parseValidationErrors = (
  issues: Array<{ path: (string | number)[]; message: string }>,
  translate?: (key: string, options?: Record<string, unknown>) => string
): Record<string, string[]> => {
  const errors: Record<string, string[]> = {};

  for (const issue of issues) {
    const field = issue.path[0]?.toString() || "form";
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(parseErrorMessage(issue.message, translate));
  }

  return errors;
};

// Schema generation (Zod only, no React)
export { generateSchema } from "./core/schema/schema-builder";

// Data validator for server-side validation (React-free module - importing
// it from ./core/schema would drag @hookform/resolvers → react-hook-form
// into the server bundle)
export { generateDataValidator } from "./core/schema/data-validator";

// Custom field-kind registration (React-free). Exported here too so a custom kind's value
// type is registered in the *server* bundle - `generateDataValidator` resolves schemas by
// field type, so the registration must run wherever the validator does.
export {
  registerFieldType,
  registerFieldSchemaGenerator,
} from "./core/schema/field-generators";
export type {
  FieldValueType,
  FieldTypeRegistration,
} from "./core/schema/field-generators";

// Derive-transform registration (React-free). Exported here so shared config modules that
// register a kind's `deriveTransform` can be imported by the server bundle too - the
// registry is inert on the server (`deriveFrom` is a client-only live-preview affordance).
export { registerDeriveTransform } from "./core/derive";
export type { DeriveTransform } from "./core/derive";

// Validation utilities (Zod only, no React)
export {
  // Pattern validation rules
  patterns,
  createPatternValidation,
  applyPatternValidation,
  registerPattern,
  getAvailablePatterns,
  getPattern,
  validatePattern,

  // Validation registry
  defaultValidationRegistry,
  registerValidationRule as registerValidationRuleGlobal,
  getAvailableValidationRules,
  getValidationRule as getValidationRuleGlobal,
} from "./validation";

export type {
  PatternDefinition,
  ValidationRuleRegistry as GlobalValidationRuleRegistry,
} from "./validation";

// Re-export commonly used types
export type {
  FormDefinition,
  FormFieldDefinition,
  FormActionResult,
  SelectOptions,
  ValidationRule,
  BaseValidationRules,
  StringValidationRules,
  NumberValidationRules,
  DateValidationRules,
  ArrayValidationRules,
  SelectValidationRules,
  BooleanValidationRules,
  FieldTypeValidationMap,
} from "./core/types";

export { createField } from "./core/types";

/**
 * The form's own submitted values, for echoing back as `FormActionResult.values` on a
 * failed result.
 *
 * A posted `FormData` carries more than the form's fields: React's progressive-enhancement
 * bookkeeping (`$ACTION_REF_*`, `$ACTION_*`, `$ACTION_KEY`) rides every no-JS submit. That
 * is not a field, and `values` is not inert - `useFormDefinition` spreads it over the
 * generated defaults to seed `useForm()` on the no-JS round trip, so whatever is echoed
 * lands in the form model.
 *
 * `handleServerSubmit` already strips `$ACTION*` on the **JS** path; this applies the same
 * rule on the path where it actually matters, in one place, so every action does not have
 * to know React's reserved names itself.
 *
 * ```ts
 * return { success: false, errors, values: extractSubmittedValues(formData) };
 * ```
 *
 * The guard is a `$ACTION` prefix match, so ordinary fields called `action` or
 * `transaction` are untouched.
 */
export const extractSubmittedValues = (
  formData: FormData
): Record<string, FormDataEntryValue> =>
  Object.fromEntries(
    Array.from(formData.entries()).filter(([name]) => !name.startsWith("$ACTION"))
  );
