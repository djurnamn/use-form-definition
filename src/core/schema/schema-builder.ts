import { z } from "zod";
import { FormDefinition, FormFieldDefinition, FormConfig } from "../types";
import { getValidationRule, createMessage } from "../validation";
import { getFieldSchemaGenerator } from "./field-generators";
import { applyPlugins, ValidationContext as PluginValidationContext, PluginRegistry } from "../plugin-system";

/**
 * Cross-field validation rules that need to be applied at the schema level
 */
interface CrossFieldValidation {
  matchValue: { firstKey: string; secondKey: string; message: string }[];
  requiredWhen: { key: string; field: string; value: string | number | boolean }[];
}

/**
 * Generates a Zod schema for a single field using the appropriate field generator
 * Enhanced to support plugin-based validation
 */
export const generateFieldSchema = async (
  key: string,
  field: FormFieldDefinition,
  crossFieldValidation: CrossFieldValidation,
  definition?: FormDefinition,
  formData?: Record<string, any>,
  pluginRegistry?: PluginRegistry
): Promise<z.ZodTypeAny> => {
  // Get the appropriate schema generator for this field type
  const schemaGenerator = getFieldSchemaGenerator(field.type);

  // Generate the base schema
  let fieldSchema = schemaGenerator(field);

  // Apply plugins if available
  if (definition) {
    const context: PluginValidationContext = {
      fieldKey: key,
      field,
      definition,
      formData,
    };

    try {
      fieldSchema = await applyPlugins(context, fieldSchema, pluginRegistry);
    } catch (error) {
      console.warn(`Plugin application failed for field '${key}':`, error);
      // Continue with base schema if plugins fail
    }
  }

  // Handle cross-field validation rules
  if (field.validation?.matchValue) {
    const { value, message } = getValidationRule(
      field.validation.matchValue,
      "matchValue"
    );

    crossFieldValidation.matchValue.push({
      firstKey: key,
      secondKey: value,
      message,
    });
  }

  if (field.validation?.requiredWhen) {
    fieldSchema = fieldSchema.optional();
    crossFieldValidation.requiredWhen.push({
      key,
      field: field.validation.requiredWhen.field,
      value: field.validation.requiredWhen.value,
    });
  }

  return fieldSchema;
};

/**
 * Synchronous version of generateFieldSchema for backward compatibility
 */
export const generateFieldSchemaSync = (
  key: string,
  field: FormFieldDefinition,
  crossFieldValidation: CrossFieldValidation
): z.ZodTypeAny => {
  // Get the appropriate schema generator for this field type
  const schemaGenerator = getFieldSchemaGenerator(field.type);
  
  // Generate the base schema
  let fieldSchema = schemaGenerator(field);

  // Handle cross-field validation rules
  if (field.validation?.matchValue) {
    const { value, message } = getValidationRule(
      field.validation.matchValue,
      "matchValue"
    );

    crossFieldValidation.matchValue.push({
      firstKey: key,
      secondKey: value,
      message,
    });
  }

  if (field.validation?.requiredWhen) {
    fieldSchema = fieldSchema.optional();
    crossFieldValidation.requiredWhen.push({
      key,
      field: field.validation.requiredWhen.field,
      value: field.validation.requiredWhen.value,
    });
  }

  return fieldSchema;
};

/**
 * Applies cross-field validations (matchValue, requiredWhen) to the complete schema
 */
export const applyCrossFieldValidation = (
  schema: z.ZodTypeAny,
  definition: FormDefinition,
  crossFieldValidation: CrossFieldValidation
): z.ZodTypeAny => {
  let resultSchema = schema;

  // Apply value matching validation
  if (crossFieldValidation.matchValue.length > 0) {
    for (const { firstKey, secondKey, message } of crossFieldValidation.matchValue) {
      resultSchema = resultSchema.superRefine((data: any, context) => {
        if (data[firstKey] !== data[secondKey]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message,
            path: [firstKey],
          });
        }
      });
    }
  }

  // Apply requiredWhen validations
  if (crossFieldValidation.requiredWhen.length > 0) {
    for (const { key, field, value } of crossFieldValidation.requiredWhen) {
      resultSchema = resultSchema.refine(
        (data: any) => {
          if (data[field] === value) {
            const val = data[key];
            // A date kind (built-in or custom) has already turned its input into a Date;
            // anything else counts when it is not empty.
            if (val instanceof Date) return !isNaN(val.getTime());
            return val !== undefined && val !== null && val !== "";
          }
          return true;
        },
        {
          message: createMessage("required"),
          path: [key],
        }
      );
    }
  }

  return resultSchema;
};

/**
 * Main schema generation function - refactored for modularity
 * Enhanced to support async plugin validation
 */
export const generateSchemaAsync = async <T extends FormDefinition = FormDefinition>(
  definition: T,
  formData?: Record<string, any>,
  pluginRegistry?: PluginRegistry
): Promise<z.ZodTypeAny> => {
  const crossFieldValidation: CrossFieldValidation = {
    matchValue: [],
    requiredWhen: [],
  };

  // Generate field schemas with plugin support
  const fieldSchemaPromises = Object.keys(definition).map(async (key) => {
    const field = definition[key];
    const fieldSchema = await generateFieldSchema(key, field, crossFieldValidation, definition, formData, pluginRegistry);
    return { key, fieldSchema };
  });

  const fieldSchemaResults = await Promise.all(fieldSchemaPromises);
  const fieldSchemas = fieldSchemaResults.reduce((accumulator, { key, fieldSchema }) => {
    accumulator[key] = fieldSchema;
    return accumulator;
  }, {} as Record<string, z.ZodTypeAny>);

  // Create the base object schema
  let schema: z.ZodTypeAny = z.object(fieldSchemas);

  // Apply cross-field validations
  schema = applyCrossFieldValidation(schema, definition, crossFieldValidation);

  return schema;
};

/**
 * Main schema generation function - synchronous for backward compatibility
 */
export const generateSchema = <T extends FormDefinition = FormDefinition>(definition: T): z.ZodTypeAny => {
  const crossFieldValidation: CrossFieldValidation = {
    matchValue: [],
    requiredWhen: [],
  };

  // Generate field schemas (synchronous)
  const fieldSchemas = Object.keys(definition).reduce((accumulator, key) => {
    const field = definition[key];
    const fieldSchema = generateFieldSchemaSync(key, field, crossFieldValidation);
    accumulator[key] = fieldSchema;
    return accumulator;
  }, {} as Record<string, z.ZodTypeAny>);

  // Create the base object schema
  let schema: z.ZodTypeAny = z.object(fieldSchemas);

  // Apply cross-field validations
  schema = applyCrossFieldValidation(schema, definition, crossFieldValidation);

  return schema;
};

/**
 * Validation context for extensibility
 */
export interface ValidationContext {
  fieldKey: string;
  field: FormFieldDefinition;
  definition: FormDefinition;
  crossFieldValidation: CrossFieldValidation;
}

/**
 * Custom field validator function type
 */
export type CustomFieldValidator = (
  context: ValidationContext
) => z.ZodTypeAny | Promise<z.ZodTypeAny>;

/**
 * Registry for custom field validators
 */
const customFieldValidators: Record<string, CustomFieldValidator> = {};

/**
 * Register a custom field validator
 */
export const registerCustomFieldValidator = (
  fieldType: string,
  validator: CustomFieldValidator
): void => {
  customFieldValidators[fieldType] = validator;
};

/**
 * Get custom field validator if registered
 */
export const getCustomFieldValidator = (
  fieldType: string
): CustomFieldValidator | undefined => {
  return customFieldValidators[fieldType];
};

/**
 * Enhanced field schema generation that supports custom validators
 */
export const generateFieldSchemaWithCustomValidators = async (
  key: string,
  field: FormFieldDefinition,
  definition: FormDefinition,
  crossFieldValidation: CrossFieldValidation,
  formData?: Record<string, any>,
  pluginRegistry?: PluginRegistry
): Promise<z.ZodTypeAny> => {
  // Check for custom validator first
  const customValidator = getCustomFieldValidator(field.type);

  if (customValidator) {
    const context: ValidationContext = {
      fieldKey: key,
      field,
      definition,
      crossFieldValidation,
    };

    return await customValidator(context);
  }

  // Fall back to standard field schema generation
  return await generateFieldSchema(key, field, crossFieldValidation, definition, formData, pluginRegistry);
};