import { z } from "zod";
import { FormFieldDefinition, FormDefinition } from "../types";
import { getValidationRule, createMessage } from "../validation";
import { patterns } from "../../validation/patterns";

/**
 * Field schema generators for different field types
 * Each function creates a Zod schema for a specific field type
 */

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
      const pattern = patterns[value];
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
  let numberSchema: z.ZodTypeAny = z.coerce.number().optional();

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
  let dateSchema = z
    .string()
    .or(z.date())
    .transform((arg) => new Date(arg));

  // Handle required validation
  if (field.validation?.required) {
    const { value, message } = getValidationRule(
      field.validation.required,
      "required"
    );
    return dateSchema.refine(
      (val) => val !== null && !isNaN(val.getTime()),
      { message }
    );
  } else if (!field.validation?.requiredWhen) {
    return dateSchema.optional();
  }

  return dateSchema;
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
 */
export const createMultiselectFieldSchema = (field: FormFieldDefinition): z.ZodTypeAny => {
  let multiselectSchema: z.ZodTypeAny = z.array(z.string());

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
  return fieldSchemaGenerators[fieldType as keyof typeof fieldSchemaGenerators] || fieldSchemaGenerators.default;
};

/**
 * Registers a custom field schema generator
 */
export const registerFieldSchemaGenerator = (
  fieldType: string,
  generator: (field: FormFieldDefinition) => z.ZodTypeAny
) => {
  (fieldSchemaGenerators as any)[fieldType] = generator;
};