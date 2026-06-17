// Core exports
export * from "./core/types";
export * from "./core/utilities";
export * from "./core/validation";
export { generateSchema, generateOptions } from "./core/schema";
export { generateSchemaAsync } from "./core/schema/schema-builder";
export { registerFieldSchemaGenerator } from "./core/schema/field-generators";
export * from "./core/types-inference";

// Hook exports
export { useFormDefinition } from "./hooks/useFormDefinition";
export type {
  UseFormDefinitionReturn,
  RenderedFieldProps,
  RenderedFieldBaseProps,
  RenderedFormProps,
} from "./hooks/useFormDefinition";
export { createFormDefinitionHook } from "./hooks/createFormDefinitionHook";
export type {
  FormDefinitionHook,
  FormDefinitionHookConfig,
  FormDefinitionHookOptions,
  AdvancedComponentConfig,
  ComponentConfig
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
  createDependentValidationRule
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
  TranslationConfig,
  TranslationConfigObject,
  TranslationCategoryConfig,
  ValidationTranslationConfig,
  TranslationFunction,
} from "./core/types";

// Re-export translation utilities
export {
  normalizeTranslationConfig,
  resolveTranslatableValue,
  resolveSelectOptions,
  createValidationTranslator,
} from "./core/utilities";

export type { NormalizedTranslationConfig } from "./core/utilities";

export { createField } from "./core/types";