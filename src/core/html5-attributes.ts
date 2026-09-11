import { FormFieldDefinition, ValidationRule } from "./types";
import { getPattern } from "../validation/patterns";

/**
 * Derives native HTML5 validation attributes from a field's `validation` rules.
 *
 * Opt-in via the `emitHtml5Attributes` config flag. When off, this is never
 * called and the rendered output is unchanged. When on, the derived attributes
 * are merged into the field's props so the browser can apply constraint
 * validation as a no-JS layer alongside react-hook-form / the server action -
 * the counterpart to the `noValidate` opt-out.
 *
 * The mapping mirrors `field-generators.ts` (which maps the same `validation`
 * rules to Zod) so the two stay consistent. Attributes are emitted only on the
 * field types where the corresponding HTML attribute is valid.
 *
 * Scope: `required`, `pattern`, `minLength`, `maxLength`, `min`, `max`, `step`.
 */

// Field types where a `pattern` attribute is valid HTML.
const PATTERN_TYPES = new Set(["text", "search", "url", "tel", "email", "password"]);
// Field types where `minlength` / `maxlength` are valid HTML.
const LENGTH_TYPES = new Set(["text", "search", "url", "tel", "email", "password", "textarea"]);
// Field types where `min` / `max` are valid HTML.
const RANGE_TYPES = new Set(["number", "range", "date", "datetime-local", "month", "week", "time"]);

/** Unwrap a `ValidationRule<T>` to its raw value (the `{ value, message }` form or the bare value). */
const ruleValue = <T>(rule: ValidationRule<T> | undefined): T | undefined => {
  if (rule === undefined || rule === null) return undefined;
  if (typeof rule === "object" && rule !== null && "value" in rule) {
    return (rule as { value: T }).value;
  }
  return rule as T;
};

/**
 * Resolves a `pattern` rule to a regex source string for the HTML `pattern` attribute.
 * Mirrors `field-generators.ts`: a named pattern key resolves to its RegExp's `.source`;
 * an inline RegExp uses its `.source`. An unknown string key emits nothing (as the Zod
 * mapping also skips it).
 */
const resolvePatternSource = (pattern: RegExp | string | undefined): string | undefined => {
  if (pattern instanceof RegExp) return pattern.source;
  if (typeof pattern === "string") {
    const named = getPattern(pattern);
    return named ? named.pattern.source : undefined;
  }
  return undefined;
};

/**
 * Formats a `min` / `max` bound for the HTML attribute. Numbers and strings pass
 * through; a `Date` is formatted to the type's expected string shape.
 */
const formatRangeBound = (
  value: number | string | Date | undefined,
  type: string
): number | string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" || typeof value === "string") return value;
  if (value instanceof Date) {
    const iso = value.toISOString();
    return type === "datetime-local" ? iso.slice(0, 16) : iso.slice(0, 10);
  }
  return undefined;
};

export const deriveHtml5Attributes = (
  field: FormFieldDefinition
): Record<string, string | number | boolean> => {
  const attrs: Record<string, string | number | boolean> = {};
  const validation = field.validation;
  if (!validation) return attrs;

  const { type } = field;

  // required - only when unconditionally required. A `requiredWhen` rule depends on
  // another field's value at runtime, so it can't become a static `required` attribute.
  // For checkboxes, `mustBeTrue` is the "must be checked" rule, which maps to `required`.
  const required = ruleValue(validation.required);
  const isRequired = required === true || (type === "checkbox" && validation.mustBeTrue === true);
  if (isRequired && !validation.requiredWhen) {
    attrs.required = true;
  }

  // pattern - text-like types only (not textarea, not number).
  if (PATTERN_TYPES.has(type) && validation.pattern !== undefined) {
    const source = resolvePatternSource(ruleValue(validation.pattern));
    if (source !== undefined) attrs.pattern = source;
  }

  // minlength / maxlength - text-like types and textarea.
  if (LENGTH_TYPES.has(type)) {
    const minLength = ruleValue(validation.minLength);
    const maxLength = ruleValue(validation.maxLength);
    if (typeof minLength === "number") attrs.minLength = minLength;
    if (typeof maxLength === "number") attrs.maxLength = maxLength;
  }

  // min / max / step - number / range / date-like types only. `step` has no Zod
  // counterpart (it's a display/UX-only constraint), so there's nothing to mirror.
  if (RANGE_TYPES.has(type)) {
    const min = formatRangeBound(ruleValue(validation.min), type);
    const max = formatRangeBound(ruleValue(validation.max), type);
    if (min !== undefined) attrs.min = min;
    if (max !== undefined) attrs.max = max;

    const step = ruleValue(validation.step);
    if (typeof step === "number") attrs.step = step;
  }

  return attrs;
};
