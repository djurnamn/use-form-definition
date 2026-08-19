/**
 * Default English messages for validation errors.
 * Shared between client (utilities.ts) and server (server.ts) code.
 *
 * This file intentionally has no React dependencies to support server-side usage.
 */
export const defaultValidationMessages: Record<
  string,
  string | ((options?: Record<string, any>) => string)
> = {
  required: "This field is required",
  minLength: (options) => `Must be at least ${options?.count ?? 0} characters`,
  maxLength: (options) =>
    `Must be no more than ${options?.count ?? 0} characters`,
  min: (options) => `Must be at least ${options?.count ?? 0}`,
  max: (options) => `Must be no more than ${options?.count ?? 0}`,
  pattern: "Invalid format",
  matchValue: "Values do not match",
  mustBeTrue: "This must be checked",
  mustBeFalse: "This must not be checked",
  minRows: (options) => `Must have at least ${options?.count ?? 0} rows`,
  maxRows: (options) => `Must have no more than ${options?.count ?? 0} rows`,
  contains: (options) => `Must contain "${options?.value ?? ""}"`,
  startsWith: (options) => `Must start with "${options?.value ?? ""}"`,
  endsWith: (options) => `Must end with "${options?.value ?? ""}"`,
  noWhitespace: "Cannot contain spaces",
  uppercase: "Must be uppercase",
  lowercase: "Must be lowercase",
  invalid: "Invalid value",
  invalidFormat: "Invalid format",
  invalidSelection: "Invalid selection",
  invalidSelections: "Contains invalid selection(s)",
  // Whole-form rather than per-field: raised when a submit is blocked but nothing that
  // failed is on screen, so without it the button would simply appear dead. Deliberately
  // uncounted - react-hook-form drops errors for never-registered fields, so at the moment
  // this fires the failing set is genuinely unknown.
  errorsNotVisible: "Some fields need attention, but are not currently shown",
};

/**
 * Translates a validation message using the provided messages dictionary.
 * Falls back to converting the key to readable text if not found.
 */
export const translateValidationMessage = (
  key: string,
  options?: Record<string, any>,
  messages: Record<string, string | ((options?: Record<string, any>) => string)> = defaultValidationMessages
): string => {
  const message = messages[key];

  if (message) {
    if (typeof message === "function") {
      return message(options);
    }
    return message;
  }

  // Fallback for unknown keys - convert dot notation to readable text
  const parts = key.split(".");
  const lastPart = parts[parts.length - 1];
  return lastPart
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};
