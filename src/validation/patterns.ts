import { z } from "zod";
import { ValidationRule } from "../core/types";
import { sharedStore } from "../core/registry";

/**
 * Pattern validation rules for common formats
 */

export interface PatternDefinition {
  pattern: RegExp;
  message: string;
  description?: string;
}

/**
 * Built-in pattern definitions
 */
export const patterns: Record<string, PatternDefinition> = {
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: "Please enter a valid email address",
    description: "Standard email format validation",
  },
  url: {
    pattern: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    message: "Please enter a valid URL",
    description: "HTTP/HTTPS URL format validation",
  },
  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message: "Please enter a valid phone number",
    description: "International phone number format",
  },
  slug: {
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    message: "Please enter a valid slug (lowercase letters, numbers, and hyphens only)",
    description: "URL-friendly slug format",
  },
  username: {
    pattern: /^[a-zA-Z0-9._-]+$/,
    message: "Username can only contain letters, numbers, dots, underscores, and hyphens",
    description: "Standard username format",
  },
  alphanumeric: {
    pattern: /^[a-zA-Z0-9]+$/,
    message: "Only letters and numbers are allowed",
    description: "Alphanumeric characters only",
  },
  numeric: {
    pattern: /^\d+$/,
    message: "Only numbers are allowed",
    description: "Numeric characters only",
  },
  alpha: {
    pattern: /^[a-zA-Z]+$/,
    message: "Only letters are allowed",
    description: "Alphabetic characters only",
  },
  postalCode: {
    pattern: /^[A-Z0-9]{3,10}$/i,
    message: "Please enter a valid postal code",
    description: "Generic postal code format",
  },
  hexColor: {
    pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    message: "Please enter a valid hex color code",
    description: "Hex color code format (#RGB or #RRGGBB)",
  },
};

/**
 * Patterns registered by consumers. Shared with every copy of the library in the
 * process (the other entry point included), see `core/registry`; the built-ins above
 * stay module-local.
 */
const customPatterns = sharedStore<Record<string, PatternDefinition>>("patterns", () => ({}));

/**
 * Get pattern definition by name: a registered pattern, else a built-in
 */
export const getPattern = (name: string): PatternDefinition | undefined => {
  return customPatterns[name] ?? patterns[name];
};

/**
 * Creates a pattern validation from a rule
 */
export const createPatternValidation = (
  rule: ValidationRule<RegExp | string>,
  defaultMessage?: string
) => {
  if (rule instanceof RegExp) {
    return {
      pattern: rule,
      message: defaultMessage || "invalidFormat",
    };
  }
  
  if (typeof rule === "string") {
    const pattern = getPattern(rule);
    if (pattern) {
      return {
        pattern: pattern.pattern,
        message: defaultMessage || pattern.message,
      };
    }
    throw new Error(`Unknown pattern: ${rule}`);
  }
  
  if (typeof rule === "object" && "value" in rule) {
    if (rule.value instanceof RegExp) {
      return {
        pattern: rule.value,
        message: typeof rule.message === "string" ? rule.message : (defaultMessage || "invalidFormat"),
      };
    }
    
    if (typeof rule.value === "string") {
      const pattern = getPattern(rule.value);
      if (pattern) {
        return {
          pattern: pattern.pattern,
          message: typeof rule.message === "string" ? rule.message : (defaultMessage || pattern.message),
        };
      }
      throw new Error(`Unknown pattern: ${rule.value}`);
    }
  }
  
  throw new Error("Invalid pattern rule");
};

/**
 * Applies pattern validation to a string schema
 */
export const applyPatternValidation = (
  schema: z.ZodString,
  rule: ValidationRule<RegExp | string>,
  defaultMessage?: string
): z.ZodString => {
  const { pattern, message } = createPatternValidation(rule, defaultMessage);
  return schema.regex(pattern, { message });
};

const samePattern = (a: PatternDefinition, b: PatternDefinition): boolean =>
  a.pattern.source === b.pattern.source &&
  a.pattern.flags === b.pattern.flags &&
  a.message === b.message;

/**
 * Register a custom pattern. The registration is shared with every copy of the library
 * in the process and outlives a hot reload, so the same registration may run more than
 * once: registering a name again with the same pattern and message is a no-op, while a
 * different definition under a taken name (a built-in's included) is an error.
 */
export const registerPattern = (
  name: string,
  definition: PatternDefinition
): void => {
  const existing = getPattern(name);
  if (existing) {
    if (samePattern(existing, definition)) return;
    throw new Error(`Pattern "${name}" is already registered`);
  }
  customPatterns[name] = definition;
};

/**
 * Get all available pattern names
 */
export const getAvailablePatterns = (): string[] => {
  return Array.from(new Set([...Object.keys(patterns), ...Object.keys(customPatterns)]));
};

/**
 * Validate a value against a pattern
 */
export const validatePattern = (
  value: string,
  patternName: string
): boolean => {
  const pattern = getPattern(patternName);
  if (!pattern) {
    return false;
  }
  return pattern.pattern.test(value);
};