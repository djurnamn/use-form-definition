/**
 * Schema generation module
 * 
 * This module provides a modular approach to generating Zod schemas from form definitions.
 * It replaces the monolithic schema generation function with composable, testable parts.
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

// Re-export utilities from parent module
export { generateOptions, generateDataValidator } from "../schema";

export type {
  CustomFieldValidator,
  ValidationContext,
} from "./schema-builder";

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

export type {
  FieldValueType,
  FieldTypeRegistration,
} from "./field-generators";

// Re-export the main generateSchema function as the default export
// This maintains backward compatibility with the existing API
export { generateSchema as default } from "./schema-builder";