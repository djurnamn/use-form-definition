/**
 * Validation rules for use-form-definition
 *
 * This module provides pattern-based validation rules that can be
 * used in form definitions.
 *
 * @example
 * ```typescript
 * import { patterns, registerPattern } from 'use-form-definition';
 *
 * // Use a predefined pattern
 * const definition = {
 *   email: { type: 'email', validation: { pattern: 'email' } }
 * };
 *
 * // Register a custom pattern
 * registerPattern('companyEmail', {
 *   pattern: /@company\.com$/,
 *   message: 'Must be a company email'
 * });
 * ```
 */

// Pattern validation rules
export {
  patterns,
  createPatternValidation,
  applyPatternValidation,
  registerPattern,
  getAvailablePatterns,
  getPattern,
  validatePattern,
} from "./patterns";

export type {
  PatternDefinition,
} from "./patterns";

// Import patterns for use in the registry below
import { patterns } from "./patterns";

/**
 * Validation rule registry for extensibility
 */
export interface ValidationRuleRegistry {
  [key: string]: {
    pattern?: RegExp;
    validate?: (value: unknown) => boolean;
    message?: string;
  };
}

/**
 * Default validation rule registry
 * Users can extend this by adding their own validation rules
 */
export const defaultValidationRegistry: ValidationRuleRegistry = {
  // Pattern-based validations
  email: {
    pattern: patterns.email.pattern,
    message: patterns.email.message,
  },
  url: {
    pattern: patterns.url.pattern,
    message: patterns.url.message,
  },
  phone: {
    pattern: patterns.phone.pattern,
    message: patterns.phone.message,
  },
  slug: {
    pattern: patterns.slug.pattern,
    message: patterns.slug.message,
  },
  username: {
    pattern: patterns.username.pattern,
    message: patterns.username.message,
  },

  // Function-based validations
  positive: {
    validate: (value: unknown) => typeof value === 'number' && value > 0,
    message: "Must be a positive number",
  },
  negative: {
    validate: (value: unknown) => typeof value === 'number' && value < 0,
    message: "Must be a negative number",
  },
  integer: {
    validate: (value: unknown) => typeof value === 'number' && Number.isInteger(value),
    message: "Must be a whole number",
  },
};

/**
 * Register a custom validation rule
 */
export const registerValidationRule = (
  name: string,
  rule: ValidationRuleRegistry[string]
): void => {
  defaultValidationRegistry[name] = rule;
};

/**
 * Get all available validation rule names
 */
export const getAvailableValidationRules = (): string[] => {
  return Object.keys(defaultValidationRegistry);
};

/**
 * Get a validation rule by name
 */
export const getValidationRule = (
  name: string
): ValidationRuleRegistry[string] | undefined => {
  return defaultValidationRegistry[name];
};
