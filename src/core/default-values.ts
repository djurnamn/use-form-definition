/**
 * Default-value resolution for form fields.
 *
 * Deliberately React-free (no `useId` etc.) and split out of `utilities.ts` so the
 * schema layer - reached by the React-free `./server` entry through
 * `field-generators` → `registerFieldType` - can consult it without dragging React
 * into the server bundle. `utilities.ts` re-exports these for the existing import
 * surface.
 */

/**
 * Default values for custom field kinds registered via `registerFieldType`, keyed by
 * field type. Consulted by `getDefaultValueForField` so a boolean-valued custom kind
 * (e.g. a `visibility` toggle) seeds as `false` rather than the generic `""` - keeping
 * the react-hook-form default in step with the kind's coercing validator.
 *
 * A module-level registry, matching the built-in extension points (`registerFieldType` /
 * `registerFieldSchemaGenerator` / `registerPattern`): field kinds are static app config,
 * registered once at import time, so the same registration serves every form instance.
 */
const customFieldTypeDefaults: Record<string, unknown> = {};

/**
 * Record the default value for a custom field kind. Called by `registerFieldType`; not
 * usually called directly.
 */
export const registerFieldTypeDefault = (
  fieldType: string,
  defaultValue: unknown
): void => {
  customFieldTypeDefaults[fieldType] = defaultValue;
};

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
  }

  // A custom kind registered with a value type carries its own default (e.g. `false` for a
  // boolean kind); fall back to "" for genuinely unknown / string-valued kinds.
  if (field.type in customFieldTypeDefaults) {
    return customFieldTypeDefaults[field.type];
  }

  return "";
};

/**
 * Generate default values for all fields in a form definition
 *
 * @param definition - The form definition object
 * @returns An object with default values for each field
 */
export const generateDefaultValues = <
  T extends Record<string, { type: string; defaultValue?: unknown }>
>(
  definition: T
): Record<string, unknown> => {
  return Object.keys(definition).reduce((accumulator, key) => {
    const field = definition[key];
    const defaultValue = getDefaultValueForField(field);
    return { ...accumulator, [key]: defaultValue };
  }, {});
};
