/**
 * Schema generation module
 *
 * Generates Zod schemas from form definitions out of composable, testable parts.
 */

// Main schema generation
export {
  generateSchema,
  generateSchemaAsync,
  generateFieldSchema,
  generateFieldSchemaSync,
  applyCrossFieldValidation,
  registerCustomFieldValidator,
  getCustomFieldValidator,
  generateFieldSchemaWithCustomValidators,
} from "./schema-builder";

export { generateOptions } from "./options";
export { generateDataValidator } from "./data-validator";

export type { CustomFieldValidator, ValidationContext } from "./schema-builder";

// Field schema generators
export {
  createStringFieldSchema,
  createNumberFieldSchema,
  createDateFieldSchema,
  createSelectFieldSchema,
  createMultiselectFieldSchema,
  createCheckboxFieldSchema,
  createCustomFieldSchema,
  createSchemaOnlyPropertySchema,
  fieldSchemaGenerators,
  getFieldSchemaGenerator,
  registerFieldSchemaGenerator,
  registerFieldType,
} from "./field-generators";

export type { FieldValueType, FieldTypeRegistration } from "./field-generators";

// Re-export the main generateSchema function as the default export
export { generateSchema as default } from "./schema-builder";
