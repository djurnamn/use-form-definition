import { z } from "zod";
import { sharedStore } from "../registry";
import { FormFieldDefinition, FormDefinition, SchemaOnlyRowProperty } from "../types";
import { getValidationRule, createMessage } from "../validation";
import { getPattern } from "../../validation/patterns";
import {
  getDefaultValueForField,
  registerFieldTypeDefault,
} from "../default-values";
import { registerDeriveTransform, type DeriveTransform } from "../derive";
import { registerFieldTypeMirror } from "../mirror";

/**
 * Field schema generators for different field types
 * Each function creates a Zod schema for a specific field type
 */

/**
 * Normalizes a blank submitted value to `undefined` ("no value set").
 *
 * A form control that the user left empty submits an empty string (react-hook-form
 * keeps `""`, and an HTML form posts `""` in FormData) rather than `undefined`. For
 * coerced field types that would turn `""` into a wrong concrete value - `Number("")`
 * is `0`, `new Date("")` is an Invalid Date - this collapses a blank (empty or
 * whitespace-only) string to `undefined` *before* coercion, so an optional blank field
 * stays absent and a required blank field is caught by the normal required check.
 * Non-string and non-blank values pass through untouched.
 */
const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/**
 * Creates a string field schema (text, email, password, etc.)
 */
export const createStringFieldSchema = (field: FormFieldDefinition): z.ZodTypeAny => {
  let baseSchema: z.ZodTypeAny = z.string();

  // Check if field uses conditional required (requiredWhen)
  // If so, we need to skip validations on empty values
  const hasConditionalRequired = Boolean(field.validation?.requiredWhen);

  // Apply string-specific validations
  if (field.validation?.minLength) {
    const { value, message } = getValidationRule(
      field.validation.minLength,
      "minLength"
    );
    if (hasConditionalRequired) {
      // Use refine to skip validation on empty strings for conditional fields
      baseSchema = baseSchema.refine(
        (val) => val === "" || val.length >= value,
        { message }
      );
    } else {
      baseSchema = (baseSchema as z.ZodString).min(value, { message });
    }
  }

  if (field.validation?.maxLength) {
    const { value, message } = getValidationRule(
      field.validation.maxLength,
      "maxLength"
    );
    if (hasConditionalRequired) {
      // Use refine to skip validation on empty strings for conditional fields
      baseSchema = baseSchema.refine(
        (val) => val === "" || val.length <= value,
        { message }
      );
    } else {
      baseSchema = (baseSchema as z.ZodString).max(value, { message });
    }
  }

  if (field.validation?.pattern) {
    const { value, message } = getValidationRule(
      field.validation.pattern,
      "pattern"
    );

    if (typeof value === "string") {
      const pattern = getPattern(value);
      if (pattern) {
        if (hasConditionalRequired) {
          baseSchema = baseSchema.refine(
            (val) => val === "" || pattern.pattern.test(val),
            { message: createMessage("invalidFormat") }
          );
        } else {
          baseSchema = (baseSchema as z.ZodString).regex(pattern.pattern, {
            message: createMessage("invalidFormat"),
          });
        }
      }
    } else {
      if (hasConditionalRequired) {
        baseSchema = baseSchema.refine(
          (val) => val === "" || value.test(val),
          { message }
        );
      } else {
        baseSchema = (baseSchema as z.ZodString).regex(value, { message });
      }
    }
  }

  // Apply contains validation
  if (field.validation?.contains) {
    const { value, message } = getValidationRule(
      field.validation.contains,
      "contains"
    );
    if (hasConditionalRequired) {
      baseSchema = baseSchema.refine(
        (val) => val === "" || val.includes(value),
        { message }
      );
    } else {
      baseSchema = baseSchema.refine(
        (val) => val.includes(value),
        { message }
      );
    }
  }

  // Apply startsWith validation
  if (field.validation?.startsWith) {
    const { value, message } = getValidationRule(
      field.validation.startsWith,
      "startsWith"
    );
    if (hasConditionalRequired) {
      baseSchema = baseSchema.refine(
        (val) => val === "" || val.startsWith(value),
        { message }
      );
    } else {
      baseSchema = baseSchema.refine(
        (val) => val.startsWith(value),
        { message }
      );
    }
  }

  // Apply endsWith validation
  if (field.validation?.endsWith) {
    const { value, message } = getValidationRule(
      field.validation.endsWith,
      "endsWith"
    );
    if (hasConditionalRequired) {
      baseSchema = baseSchema.refine(
        (val) => val === "" || val.endsWith(value),
        { message }
      );
    } else {
      baseSchema = baseSchema.refine(
        (val) => val.endsWith(value),
        { message }
      );
    }
  }

  // Apply noWhitespace validation
  if (field.validation?.noWhitespace) {
    const { value, message } = getValidationRule(
      field.validation.noWhitespace,
      "noWhitespace"
    );
    if (value) {
      if (hasConditionalRequired) {
        baseSchema = baseSchema.refine(
          (val) => val === "" || !/\s/.test(val),
          { message }
        );
      } else {
        baseSchema = baseSchema.refine(
          (val) => !/\s/.test(val),
          { message }
        );
      }
    }
  }

  // Apply uppercase validation
  if (field.validation?.uppercase) {
    const { value, message } = getValidationRule(
      field.validation.uppercase,
      "uppercase"
    );
    if (value) {
      if (hasConditionalRequired) {
        baseSchema = baseSchema.refine(
          (val) => val === "" || val === val.toUpperCase(),
          { message }
        );
      } else {
        baseSchema = baseSchema.refine(
          (val) => val === val.toUpperCase(),
          { message }
        );
      }
    }
  }

  // Apply lowercase validation
  if (field.validation?.lowercase) {
    const { value, message } = getValidationRule(
      field.validation.lowercase,
      "lowercase"
    );
    if (value) {
      if (hasConditionalRequired) {
        baseSchema = baseSchema.refine(
          (val) => val === "" || val === val.toLowerCase(),
          { message }
        );
      } else {
        baseSchema = baseSchema.refine(
          (val) => val === val.toLowerCase(),
          { message }
        );
      }
    }
  }

  // Handle required validation
  if (field.validation?.required) {
    const { value, message } = getValidationRule(
      field.validation.required,
      "required"
    );
    return (baseSchema as z.ZodString).min(value ? 1 : 0, { message });
  } else if (!field.validation?.requiredWhen) {
    return baseSchema.optional();
  }

  return baseSchema;
};

/**
 * Creates a number field schema
 */
export const createNumberFieldSchema = (field: FormFieldDefinition): z.ZodTypeAny => {
  // A blank/whitespace value means "no number set". Normalize it to undefined *before*
  // coercion - `Number("")` is `0`, so without this an optional blank would submit as `0`
  // and a required blank would slip past the required check as `0`. A real "0" (or any
  // other non-blank value) is untouched and still coerces to its number.
  let numberSchema: z.ZodTypeAny = z.preprocess(
    blankToUndefined,
    z.coerce.number().optional()
  );

  // Apply numeric validations
  if (field.validation?.min !== undefined) {
    const { value: minValue, message: minMessage } = getValidationRule(
      field.validation.min,
      "min"
    );

    numberSchema = numberSchema.refine(
      (val) => val === undefined || val >= minValue,
      { message: minMessage }
    );
  }

  if (field.validation?.max !== undefined) {
    const { value: maxValue, message: maxMessage } = getValidationRule(
      field.validation.max,
      "max"
    );

    numberSchema = numberSchema.refine(
      (val) => val === undefined || val <= maxValue,
      { message: maxMessage }
    );
  }

  // Handle required validation
  if (field.validation?.required) {
    numberSchema = numberSchema.refine((val) => val !== undefined, {
      message: createMessage("required"),
    });
  }

  return numberSchema;
};

/**
 * Creates a date field schema
 */
export const createDateFieldSchema = (field: FormFieldDefinition): z.ZodTypeAny => {
  // Coerce a string or Date to a Date. `.optional()` lets a genuinely-absent value through
  // so the blank-normalization below (undefined) doesn't hit the string/date union.
  const toDate = z
    .string()
    .or(z.date())
    .transform((arg) => new Date(arg))
    .optional();

  // Handle required validation
  if (field.validation?.required) {
    const { value, message } = getValidationRule(
      field.validation.required,
      "required"
    );
    // A blank/whitespace value means "no date set". Normalize it to undefined *before* the
    // Date transform - `new Date("")` is an Invalid Date, which `.optional()` (guarding only
    // undefined) would not catch - so the required check below reports the friendly required
    // message instead of leaking an Invalid Date.
    return z.preprocess(
      blankToUndefined,
      toDate.refine(
        (val) => val instanceof Date && !isNaN(val.getTime()),
        { message }
      )
    );
  }

  // Optional (and requiredWhen, which the schema builder makes optional + adds its cross-field
  // rule to): a blank stays absent instead of becoming an Invalid Date.
  return z.preprocess(blankToUndefined, toDate);
};

/**
 * Creates a select field schema
 */
export const createSelectFieldSchema = (field: FormFieldDefinition): z.ZodTypeAny => {
  let selectSchema: z.ZodTypeAny;

  if (field.options) {
    const allowedValues = field.options.map((option) =>
      String(option.value)
    );

    selectSchema = z.enum(allowedValues as [string, ...string[]], {
      message: createMessage("invalidSelection"),
    });
  } else {
    selectSchema = z.string();
  }

  // Handle required validation
  if (field.validation?.required) {
    const { value, message } = getValidationRule(
      field.validation.required,
      "required"
    );
    selectSchema = selectSchema.refine((val) => !!val, { message });
  } else {
    selectSchema = selectSchema.optional();
  }

  return selectSchema;
};

/**
 * Creates a multiselect field schema
 *
 * The wire encoding on a native post is one JSON string under the field's name - the
 * repeater's convention, applied here for the same reason: `generateDataValidator`
 * flattens a posted `FormData` with `Object.fromEntries`, which collapses duplicate
 * names last-wins, so native multi-entry posting (`<select multiple>`'s default) cannot
 * deliver an array. A multiselect control must post its selection as JSON in a single
 * entry; the preprocess below decodes it, and client-side array values pass through
 * untouched.
 */
export const createMultiselectFieldSchema = (field: FormFieldDefinition): z.ZodTypeAny => {
  let multiselectSchema: z.ZodTypeAny = z.preprocess((value) => {
    // A posted wire value: JSON string (or "" for an empty selection).
    if (typeof value === "string") {
      if (value.trim() === "") {
        return [];
      }
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Same failure shape as the repeater: a mangled wire value degrades to an
        // empty selection with a warning, not a crashed parse.
      }
      console.warn("Invalid JSON in multiselect field, defaulting to empty selection");
      return [];
    }

    // Client-side (react-hook-form) values are already arrays.
    return value;
  }, z.array(z.string()));

  // Validate against allowed options
  if (field.options && field.options.length > 0) {
    const allowedValues = field.options.map((option) =>
      String(option.value)
    );

    multiselectSchema = multiselectSchema.refine(
      (values: string[]) =>
        values?.every((value: string) => allowedValues.includes(value)),
      {
        message: createMessage("invalidSelections"),
      }
    );
  }

  // Handle required validation
  if (field.validation?.required) {
    const { value, message } = getValidationRule(
      field.validation.required,
      "required"
    );
    if (value) {
      return multiselectSchema.refine(
        (arr) => arr && arr.length > 0,
        { message }
      );
    }
  }
  
  return multiselectSchema.optional();
};

/**
 * Creates a checkbox field schema
 */
export const createCheckboxFieldSchema = (field: FormFieldDefinition): z.ZodTypeAny => {
  let checkboxSchema: z.ZodTypeAny = z.coerce.boolean();

  // Handle mustBeTrue validation (checkbox must be checked)
  if (field.validation?.mustBeTrue) {
    checkboxSchema = checkboxSchema.refine((val) => val === true, {
      message: createMessage("mustBeTrue"),
    });
  }

  // Handle mustBeFalse validation (checkbox must be unchecked)
  if (field.validation?.mustBeFalse) {
    checkboxSchema = checkboxSchema.refine((val) => val === false, {
      message: createMessage("mustBeFalse"),
    });
  }

  // Handle required validation (for checkboxes, required usually means "must be true")
  if (field.validation?.required) {
    const { value, message } = getValidationRule(
      field.validation.required,
      "required"
    );

    return checkboxSchema.refine((val) => val === value, {
      message,
    });
  }

  return checkboxSchema;
};

/**
 * Creates a custom field schema (fallback for unknown types)
 */
export const createCustomFieldSchema = (field: FormFieldDefinition): z.ZodTypeAny => {
  // For custom fields, we start with a basic string schema
  // Users can override this by providing their own field schema generators
  let customSchema = z.string();

  // Apply basic validations if they exist
  if (field.validation?.minLength) {
    const { value, message } = getValidationRule(
      field.validation.minLength,
      "minLength"
    );
    customSchema = customSchema.min(value, { message });
  }

  if (field.validation?.maxLength) {
    const { value, message } = getValidationRule(
      field.validation.maxLength,
      "maxLength"
    );
    customSchema = customSchema.max(value, { message });
  }

  if (field.validation?.required) {
    const { value, message } = getValidationRule(
      field.validation.required,
      "required"
    );
    return customSchema.min(value ? 1 : 0, { message });
  } else if (!field.validation?.requiredWhen) {
    return customSchema.optional();
  }

  return customSchema;
};

/**
 * The definition keys that describe how a field *looks*. Meaningless on a schema-only row
 * property - nothing renders it - so their presence is a misunderstanding worth naming
 * rather than a no-op worth ignoring.
 */
const RENDERING_ONLY_KEYS = [
  "type",
  "label",
  "placeholder",
  "description",
  "options",
  "layout",
  "readOnly",
  "deriveFrom",
  "deriveTransform",
  "defaultValue",
] as const;

/**
 * The schema for one schema-only row property.
 *
 * A property declares how its value *validates*, never how it looks: `valueType` for the
 * built-in value semantics, or `validatesAs` to borrow the validator of a kind registered
 * with `registerFieldType`. Both resolve to the same generators a cell of that kind would
 * use, so a property's `validation` rules behave exactly as a field's do - and its issues
 * nest in the row's error tree at `[rowIndex][propertyKey]`, reachable with `getNestedError`.
 *
 * `defaultsTo` becomes a zod default rather than a form default: no control renders a
 * schema-only property and no repeater seeds one into a new row, so the parse is the only
 * place a value can land - and it lands on both rails.
 */
export const createSchemaOnlyPropertySchema = (
  propertyKey: string,
  property: SchemaOnlyRowProperty,
  context = `schemaOnlyRowProperties.${propertyKey}`
): z.ZodTypeAny => {
  const { valueType, validatesAs, validation, defaultsTo } = property;
  const strayRendering = RENDERING_ONLY_KEYS.filter(key => key in property);

  if (!valueType && !validatesAs) {
    throw new Error(
      `${context}: nothing here says how the value validates. ` +
        (strayRendering.includes("type")
          ? `\`type\` names a control, and a schema-only row property renders none. `
          : "") +
        `Declare \`valueType: "string" | "number" | "boolean" | "date"\`, or ` +
        `\`validatesAs: "<a kind registered with registerFieldType>"\`.`
    );
  }

  if (strayRendering.length > 0) {
    console.warn(
      `${context}: ${strayRendering.map(key => `\`${key}\``).join(", ")} ` +
        `${strayRendering.length === 1 ? "is" : "are"} ignored - a schema-only row property ` +
        `declares validation, not a control. ` +
        (strayRendering.includes("defaultValue")
          ? "Use `defaultsTo` for the value the parse fills in when a row omits this property. "
          : "")
    );
  }

  const generator = validatesAs
    ? resolveRegisteredValidator(
        validatesAs,
        context,
        "Register it with `registerFieldType` first (in both bundles), or use `valueType`."
      )
    : valueTypeSchemaGenerators[valueType as FieldValueType];

  if (!generator) {
    throw new Error(
      `${context}: unknown valueType "${valueType}". ` +
        `Expected one of: ${Object.keys(valueTypeSchemaGenerators).join(", ")}.`
    );
  }

  // The generators read a field definition, so hand them the property's validation rules
  // under the resolved kind. Everything else on a field definition is rendering vocabulary
  // the generators do not consult.
  const schema = generator({
    type: validatesAs ?? (valueType as string),
    validation,
  } as FormFieldDefinition);

  return defaultsTo !== undefined ? schema.default(defaultsTo) : schema;
};

/**
 * Creates a repeater field schema
 * 
 * This creates a schema for an array of objects where each object
 * matches the structure defined by the repeater's fields
 */
export const createRepeaterFieldSchema = (field: FormFieldDefinition): z.ZodTypeAny => {
  if (!field.fields) {
    console.warn('Repeater field missing fields definition, defaulting to array of any');
    return z.array(z.any()).optional();
  }

  // We need to import generateSchema to avoid circular dependency
  // For now, we'll create a simple object schema
  const fieldSchemas: Record<string, z.ZodTypeAny> = {};
  
  // Generate schema for each field in the repeater
  Object.keys(field.fields).forEach(fieldKey => {
    const subField = field.fields![fieldKey];
    const generator = getFieldSchemaGenerator(subField.type);
    
    // Prevent infinite recursion by limiting nested repeaters
    if (subField.type === 'repeater') {
      console.warn('Nested repeaters not yet supported, using any array');
      fieldSchemas[fieldKey] = z.array(z.any()).optional();
    } else {
      fieldSchemas[fieldKey] = generator(subField);
    }
  });

  // Merge the schema-only row properties: state every row carries that no cell renders.
  // A plain `z.object` strips what it does not declare, so an undeclared property parses
  // away silently - which is the whole reason this seam exists.
  if (field.schemaOnlyRowProperties) {
    Object.keys(field.schemaOnlyRowProperties).forEach(propertyKey => {
      if (propertyKey in fieldSchemas) {
        throw new Error(
          `schemaOnlyRowProperties.${propertyKey}: "${propertyKey}" is already a rendered ` +
            `cell of this repeater. A row property is the part of the row \`fields\` does ` +
            `not cover - remove one of the two declarations.`
        );
      }
      fieldSchemas[propertyKey] = createSchemaOnlyPropertySchema(
        propertyKey,
        field.schemaOnlyRowProperties![propertyKey]
      );
    });
  }

  // Create the row schema (each item in the array)
  const rowSchema = z.object(fieldSchemas);
  
  // Create array schema with preprocessing for JSON strings
  let repeaterSchema: z.ZodTypeAny = z.preprocess((value) => {
    // Handle JSON string input (from hidden form field)
    if (typeof value === "string") {
      if (value.trim() === "") {
        return [];
      }
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        console.warn('Invalid JSON in repeater field, defaulting to empty array');
        return [];
      }
    }
    
    // Handle array input
    if (Array.isArray(value)) {
      return value;
    }
    
    // Default to empty array
    return [];
  }, z.array(rowSchema));

  // Apply row count validations
  if (field.validation?.minRows !== undefined) {
    const { value: minRows, message } = getValidationRule(
      field.validation.minRows,
      "minRows"
    );
    repeaterSchema = repeaterSchema.refine(
      (rows) => rows.length >= minRows,
      { message }
    );
  }

  if (field.validation?.maxRows !== undefined) {
    const { value: maxRows, message } = getValidationRule(
      field.validation.maxRows,
      "maxRows"
    );
    repeaterSchema = repeaterSchema.refine(
      (rows) => rows.length <= maxRows,
      { message }
    );
  }

  // Handle required validation
  if (field.validation?.required) {
    const { value, message } = getValidationRule(
      field.validation.required,
      "required"
    );
    
    if (value) {
      return repeaterSchema.refine(
        (rows) => rows.length > 0,
        { message }
      );
    }
  }

  return repeaterSchema.optional();
};

/**
 * Generators registered by consumers, keyed by kind. Shared across bundles and entry
 * points; consulted before the built-ins below.
 */
const customFieldSchemaGenerators = sharedStore<
  Record<string, (field: FormFieldDefinition) => z.ZodTypeAny>
>("field-schema-generators", () => ({}));

/**
 * Field schema generator registry
 * Maps field types to their schema generator functions
 */
export const fieldSchemaGenerators = {
  // String-based fields
  text: createStringFieldSchema,
  email: createStringFieldSchema,
  password: createStringFieldSchema,
  textarea: createStringFieldSchema,
  
  // Numeric fields
  number: createNumberFieldSchema,
  
  // Date fields
  date: createDateFieldSchema,
  "datetime-local": createDateFieldSchema,
  
  // Selection fields
  select: createSelectFieldSchema,
  multiselect: createMultiselectFieldSchema,
  
  // Boolean fields
  checkbox: createCheckboxFieldSchema,
  
  // Array fields
  repeater: createRepeaterFieldSchema,
  
  // Default fallback
  default: createCustomFieldSchema,
};

/**
 * Gets the appropriate schema generator for a field type
 */
export const getFieldSchemaGenerator = (fieldType: string) => {
  return (
    customFieldSchemaGenerators[fieldType] ||
    fieldSchemaGenerators[fieldType as keyof typeof fieldSchemaGenerators] ||
    fieldSchemaGenerators.default
  );
};

/**
 * Registers a custom field schema generator. A registration wins over a built-in kind
 * of the same name, and is shared with every copy of the library in the process (the
 * other entry point included), see `core/registry`.
 */
export const registerFieldSchemaGenerator = (
  fieldType: string,
  generator: (field: FormFieldDefinition) => z.ZodTypeAny
) => {
  customFieldSchemaGenerators[fieldType] = generator;
};

/**
 * The value semantics a custom field kind can declare.
 *
 * Determines how the kind validates on *both* the client resolver (`generateOptions`) and
 * the server data validator (`generateDataValidator`), plus the field's default value:
 * - `"string"`  - validates like `text` (default `""`)
 * - `"number"`  - validates like `number`, coercing the posted string (default `0`)
 * - `"boolean"` - validates like `checkbox`, coercing the posted `"on"`/`"true"` (default `false`)
 * - `"date"`    - validates like `date`, coercing string/Date (default `""`)
 */
export type FieldValueType = "string" | "number" | "boolean" | "date";

/** Maps a declared value type to the built-in generator that validates it. */
const valueTypeSchemaGenerators: Record<
  FieldValueType,
  (field: FormFieldDefinition) => z.ZodTypeAny
> = {
  string: createStringFieldSchema,
  number: createNumberFieldSchema,
  boolean: createCheckboxFieldSchema,
  date: createDateFieldSchema,
};

/** The natural default value for each value type (mirrors getDefaultValueForField). */
const valueTypeDefaults: Record<FieldValueType, unknown> = {
  string: "",
  number: 0,
  boolean: false,
  date: "",
};

/**
 * The generator registered for a field kind, for the two places that *borrow* a kind's
 * validator by name rather than by rendering a field of it: `registerFieldType`'s
 * `validatesAs`, and a repeater's schema-only row properties.
 *
 * An unregistered kind resolves to `createCustomFieldSchema` (the `z.string()` fallback),
 * which would silently validate the borrower as a string - so an unregistered name is an
 * error here rather than a quiet degradation.
 */
const resolveRegisteredValidator = (
  kind: string,
  context: string,
  remedy: string
): ((field: FormFieldDefinition) => z.ZodTypeAny) => {
  const registered =
    customFieldSchemaGenerators[kind] ??
    fieldSchemaGenerators[kind as keyof typeof fieldSchemaGenerators];
  if (!registered || registered === createCustomFieldSchema) {
    throw new Error(
      `${context}: no field kind "${kind}" is registered to borrow a validator from. ${remedy}`
    );
  }
  return registered;
};

/**
 * How a custom field kind should validate. Provide exactly one of `valueType`, `validatesAs`,
 * or `generator` (checked in that order of precedence: `generator` > `validatesAs` >
 * `valueType`). A registration carrying only `deriveTransform` is also valid - it attaches
 * the transform to a kind whose validation is already registered (or a built-in) without
 * touching it.
 */
export interface FieldTypeRegistration {
  /**
   * Validate the kind by its value semantics - the ergonomic path for the common case of
   * "this custom kind is really a boolean/number/date/string". See {@link FieldValueType}.
   */
  valueType?: FieldValueType;
  /**
   * Borrow an existing registered kind's validator by name (e.g. `"checkbox"`, `"select"`,
   * `"number"`). Use when you want a built-in kind's exact validator - including option/enum
   * handling for `"select"` - rather than a bare value type. The named kind must already
   * be registered.
   */
  validatesAs?: string;
  /**
   * @deprecated Renamed to {@link FieldTypeRegistration.validatesAs}, which says what it
   * does (borrow a registered kind's *validator*) and frees the word `schema` to mean a
   * zod schema. Still honoured - `validatesAs` wins if both are set - and slated for
   * removal in the next major.
   */
  schema?: string;
  /**
   * A fully custom Zod generator, for when neither a value type nor an alias fits. Equivalent
   * to {@link registerFieldSchemaGenerator}, but co-registered with the default value below.
   */
  generator?: (field: FormFieldDefinition) => z.ZodTypeAny;
  /**
   * Override the field's default value. Defaults to the resolved value type's natural default
   * (`""` / `0` / `false`), the aliased kind's default, or `""` for a bare `generator`.
   */
  defaultValue?: unknown;
  /**
   * Kind-level transform for `deriveFrom` fields of this kind: when a field of this kind
   * declares `deriveFrom: "<sibling>"`, changes to the sibling mirror
   * `deriveTransform(sourceValue)` into it while it is unclaimed (see
   * `FormFieldDefinition.deriveFrom`). A per-field `deriveTransform` on the definition
   * takes precedence. Client-side behaviour only - the registration is harmless in a
   * server bundle, where `deriveFrom` is inert.
   */
  deriveTransform?: DeriveTransform;
  /**
   * Custom wire encoding for the kind's section value mirror (see `RenderedSection`) -
   * how a field of this kind posts its value from an *inactive* section, where no
   * control is mounted. Rarely needed: without it the encoding derives from the value's
   * runtime type (boolean pair, JSON for arrays/objects, `String(value)` otherwise),
   * which is correct for any kind whose control posts the conventional encodings.
   * Provide it when the kind's control posts something the derivation would not
   * reproduce; return `null` for "this value cannot mirror".
   */
  mirror?: import("../mirror").MirrorEncoder;
}

/**
 * Register a custom field kind *with its value semantics*.
 *
 * Unregistered custom kinds validate as `z.string()` everywhere (see `createCustomFieldSchema`),
 * which makes a non-string custom kind - e.g. a `visibility` toggle whose value is a boolean -
 * impossible: the client resolver would run the boolean through a string schema, and the server
 * would parse the posted checkbox `"on"` as a string. This registers the kind so it validates
 * with the right value type on both paths and seeds the right default value, while the rendering
 * side (the `components` / `fieldTypes` map) still picks its own component by kind.
 *
 * Call it once at module scope, from code imported by *both* the client and server bundles, so
 * `generateOptions` and `generateDataValidator` agree - a module-level registration, like
 * `registerFieldSchemaGenerator` / `registerPattern`.
 *
 * @example Alias the checkbox validator for a boolean toggle kind
 * ```ts
 * registerFieldType("visibility", { valueType: "boolean" });
 * // or, to reuse checkbox's exact validator (mustBeTrue/mustBeFalse rules and all):
 * registerFieldType("visibility", { schema: "checkbox" });
 * ```
 */
export const registerFieldType = (
  fieldType: string,
  registration: FieldTypeRegistration
): void => {
  const { valueType, generator, defaultValue, deriveTransform, mirror } = registration;
  // `schema` is the deprecated spelling of `validatesAs`; the new name wins when both are set.
  const validatesAs = registration.validatesAs ?? registration.schema;

  if (deriveTransform) {
    registerDeriveTransform(fieldType, deriveTransform);
  }
  if (mirror) {
    registerFieldTypeMirror(fieldType, mirror);
  }

  // A deriveTransform-only registration attaches the transform without disturbing the
  // kind's existing (or built-in) validation and default value.
  if (!generator && !validatesAs && !valueType && deriveTransform) {
    if (defaultValue !== undefined) {
      registerFieldTypeDefault(fieldType, defaultValue);
    }
    return;
  }

  let resolvedGenerator: (field: FormFieldDefinition) => z.ZodTypeAny;
  let resolvedDefault: unknown;

  if (generator) {
    resolvedGenerator = generator;
    resolvedDefault = "";
  } else if (validatesAs) {
    // Name the key the caller actually wrote - being told about `validatesAs` when you
    // wrote `schema` reads as the wrong error.
    const borrowKey = registration.validatesAs !== undefined ? "validatesAs" : "schema";
    resolvedGenerator = resolveRegisteredValidator(
      validatesAs,
      `registerFieldType("${fieldType}", { ${borrowKey}: "${validatesAs}" })`,
      "Register it first, or use `valueType` / `generator`."
    );
    resolvedDefault = getDefaultValueForField({ type: validatesAs });
  } else if (valueType) {
    const generatorForValueType = valueTypeSchemaGenerators[valueType];
    if (!generatorForValueType) {
      throw new Error(
        `registerFieldType("${fieldType}"): unknown valueType "${valueType}". ` +
          `Expected one of: ${Object.keys(valueTypeSchemaGenerators).join(", ")}.`
      );
    }
    resolvedGenerator = generatorForValueType;
    resolvedDefault = valueTypeDefaults[valueType];
  } else {
    throw new Error(
      `registerFieldType("${fieldType}"): provide one of \`valueType\`, \`validatesAs\`, ` +
        `\`generator\`, or \`deriveTransform\`.`
    );
  }

  registerFieldSchemaGenerator(fieldType, resolvedGenerator);
  registerFieldTypeDefault(
    fieldType,
    defaultValue !== undefined ? defaultValue : resolvedDefault
  );
};
