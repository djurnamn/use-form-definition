// Core exports
export * from "./core/types";
export * from "./core/utilities";
export * from "./core/validation";
export { generateSchema, generateOptions } from "./core/schema";
export { generateSchemaAsync } from "./core/schema/schema-builder";
export {
  registerFieldSchemaGenerator,
  registerFieldType,
} from "./core/schema/field-generators";
export type {
  FieldValueType,
  FieldTypeRegistration,
} from "./core/schema/field-generators";
export { registerDeriveTransform } from "./core/derive";
export type { DeriveTransform } from "./core/derive";
export * from "./core/types-inference";

// Hook exports
export { useFormDefinition } from "./hooks/useFormDefinition";
export type {
  UseFormDefinitionReturn,
  SectionsApi,
  RenderedFieldProps,
  RenderedFieldBaseProps,
  RenderedFormProps,
} from "./hooks/useFormDefinition";
export { createFormDefinitionHook } from "./hooks/createFormDefinitionHook";
export type {
  FormDefinitionHook,
  FormDefinitionHookConfiguration,
  FormDefinitionHookOptions,
  AdvancedComponentConfiguration,
  ComponentConfiguration,
  // Deprecated aliases, kept until the next major version
  FormDefinitionHookConfig,
  AdvancedComponentConfig,
  ComponentConfig,
} from "./hooks/createFormDefinitionHook";

// Component exports
export * from "./components";

// Configuration exports
export * from "./configuration";

// Plugin system exports
export * from "./core/plugin-system";
export {
  PluginRegistry,
  createPluginRegistry,
  applyPlugins,
  builtInPlugins,
  ValidationComposer,
  createAsyncValidationRule,
  createDependentValidationRule,
} from "./core/plugin-system";

// Validation exports
export {
  // Pattern validation rules
  patterns,
  createPatternValidation,
  applyPatternValidation,
  registerPattern,
  getAvailablePatterns,
  getPattern,
  validatePattern,

  // Validation registry
  defaultValidationRegistry,
  registerValidationRule as registerValidationRuleGlobal,
  getAvailableValidationRules,
  getValidationRule as getValidationRuleGlobal,
} from "./validation";

export type {
  PatternDefinition,
  ValidationRuleRegistry as GlobalValidationRuleRegistry,
} from "./validation";

// Re-export commonly used types for convenience
export type {
  FormDefinition,
  FormFieldDefinition,
  FormConfiguration,
  FormConfig,
  FormActionResult,
  FormAction,
  SelectOptions,
  SelectOption,
  ValidationRule,
  BaseValidationRules,
  StringValidationRules,
  NumberValidationRules,
  DateValidationRules,
  ArrayValidationRules,
  SelectValidationRules,
  BooleanValidationRules,
  FieldTypeValidationMap,
  // Translation types
  TranslationConfiguration,
  TranslationConfigurationObject,
  TranslationCategoryConfiguration,
  ValidationTranslationConfiguration,
  TranslationFunction,
  // Deprecated aliases, kept until the next major version
  TranslationConfig,
  TranslationConfigObject,
  TranslationCategoryConfig,
  ValidationTranslationConfig,
} from "./core/types";

// Re-export translation utilities
export {
  normalizeTranslationConfiguration,
  normalizeTranslationConfig,
  resolveTranslatableValue,
  resolveSelectOptions,
  createValidationTranslator,
} from "./core/utilities";

export type {
  NormalizedTranslationConfiguration,
  NormalizedTranslationConfig,
} from "./core/utilities";

export { createField } from "./core/types";

// Sections: the partition type, and the error-to-section helper (also on ./server, for
// actions putting the failing sections in a no-JS result envelope).
export { sectionsWithErrors, sectionOf } from "./core/sections";
export type { FormSections } from "./core/sections";
export { getNestedError } from "./core/nested-errors";
export type {
  NestedFieldError,
  NestedFieldErrorMap,
  NestedFieldErrorList,
} from "./core/nested-errors";
export type { MirrorEncoder } from "./core/mirror";
