import { FieldError, FieldValues, UseFormProps } from "react-hook-form";
import { ReactNode } from "react";

// Generic form action types (suitable for Next.js server actions and similar patterns)
export interface FormActionResult<T extends FieldValues = FieldValues> {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string | string[]>;
  redirectUrl?: string;
}

export type FormAction<T extends FieldValues = FieldValues> = (
  prevState: FormActionResult<T> | null,
  formData: FormData
) => Promise<FormActionResult<T>>;

// Validation types
export interface ValidationMessage {
  key: string;
  options: {
    count?: number;
    [key: string]: string | number | boolean | undefined;
  };
}

export type ValidationRule<T> =
  | T
  | {
      value: T;
      message: string | ValidationMessage;
    };

export type PatternKey =
  | "email"
  | "url"
  | "phone"
  | "slug"
  | "username"
  | "alphanumeric"
  | "numeric"
  | "alpha"
  | "postalCode"
  | "hexColor";

/**
 * Select option - label is optional when translation.options is enabled
 * - If label is omitted: Use value with default localePath for translation
 * - If label is string: Use as translation key (when enabled) or literal value
 */
export type SelectOption = {
  value: string | number;
  label?: string;
};
export type SelectOptions = SelectOption[];

// Field definition types
export interface BaseValidationRules {
  required?: ValidationRule<boolean>;
  requiredWhen?: {
    field: string;
    value: string | number | boolean;
  };
  minLength?: ValidationRule<number>;
  maxLength?: ValidationRule<number>;
  pattern?: ValidationRule<RegExp | PatternKey>;
  matchValue?: ValidationRule<string>;
  email?: boolean;
  min?: ValidationRule<number>;
  max?: ValidationRule<number>;
  step?: ValidationRule<number>;
  integer?: boolean;
  positive?: boolean;
  negative?: boolean;
  nonNegative?: boolean;
  nonPositive?: boolean;
  minRows?: ValidationRule<number>;
  maxRows?: ValidationRule<number>;
  mustBeTrue?: boolean;
  mustBeFalse?: boolean;
  // String-specific validations
  contains?: ValidationRule<string>;
  startsWith?: ValidationRule<string>;
  endsWith?: ValidationRule<string>;
  noWhitespace?: ValidationRule<boolean>;
  uppercase?: ValidationRule<boolean>;
  lowercase?: ValidationRule<boolean>;
}

export interface FormFieldDefinition {
  type: string; // Made extensible - no longer hardcoded union
  name?: string;
  /**
   * Field label - can be:
   * - `undefined`: Use default localePath when translation.labels.alwaysInclude is true, otherwise no label
   * - `true`: Explicitly use default localePath for translation
   * - `false`: Explicitly no label
   * - `string`: Use as translation key (when translation enabled) or literal value
   */
  label?: string | boolean;
  /**
   * Placeholder text - can be:
   * - `undefined`: Use default localePath when translation.placeholders.alwaysInclude is true, otherwise no placeholder
   * - `true`: Explicitly use default localePath for translation
   * - `false`: Explicitly no placeholder
   * - `string`: Use as translation key (when translation enabled) or literal value
   */
  placeholder?: string | boolean;
  options?: SelectOptions;
  optionsCallback?: () => Promise<SelectOptions>;
  readOnly?: boolean;
  defaultValue?: string | number | boolean | any[];
  validation?: BaseValidationRules;
  layout?: Record<string, any>; // Props to pass to LayoutItem component

  // For repeater fields - recursive field definitions
  fields?: FormDefinition;

  // Repeater-specific options
  hideHeader?: boolean;
  disableAddRow?: boolean;
  disableRemoveRow?: boolean;

  [key: string]: any; // Allow additional props for custom field types
}

export type FormDefinition = {
  [key: string]: FormFieldDefinition;
};

// Form options type
export type FormOptions<T extends FieldValues> = UseFormProps<T>;

// Component interface types
export interface FieldComponent<T = any> {
  name: string;
  value: T;
  onChange: (value: T) => void;
  error?: FieldError;
  [key: string]: any; // Additional props
}

// Enhanced component configuration for internal use
export interface ProcessedComponentConfig {
  component: React.ComponentType<any>;
  ignoreFieldWrapper: boolean;
  additionalProps: string[];
  /** If true, the component receives the full form config for rendering nested fields */
  injectFormConfig?: boolean;
}

// Translation configuration types
export interface TranslationCategoryConfig {
  /** Whether this category is enabled for translation */
  enabled?: boolean;
  /** Whether to always include this value (when omitted in definition). Default varies by category. */
  alwaysInclude?: boolean;
  /** Function to generate the translation key from the field/option key */
  localePath?: (key: string) => string;
}

export interface ValidationTranslationConfig {
  /** Whether validation messages should be translated. Default: true */
  enabled?: boolean;
  /** Function to generate the translation key from the validation rule key. Default: (key) => `form.validation.${key}` */
  localePath?: (key: string) => string;
}

/** Translation function signature - compatible with most i18n libraries */
export type TranslationFunction = (key: string, options?: Record<string, any>) => string;

export interface TranslationConfigObject {
  /**
   * Hook that returns a translation function.
   * Called internally by the form hook - must return a function with signature: (key, options?) => string
   *
   * This allows translation to work automatically without passing `function` at runtime.
   *
   * @example next-intl (works directly)
   * hook: useTranslations
   *
   * @example react-i18next (extract t from result)
   * hook: () => useTranslation().t
   *
   * @example react-intl (needs wrapper for different signature)
   * hook: () => {
   *   const intl = useIntl();
   *   return (key, opts) => intl.formatMessage({ id: key }, opts);
   * }
   */
  hook?: () => TranslationFunction;

  /**
   * Translation function passed at runtime (overrides hook result if both provided)
   * Use this when you need a specific namespace or want to override the default hook.
   *
   * @example Override with specific namespace
   * const t = useTranslations('forms');
   * useFormDefinition(definition, { config: { translation: { function: t } } });
   */
  function?: TranslationFunction;

  /**
   * @deprecated Use `function` instead. Will be removed in next major version.
   */
  t?: TranslationFunction;

  /**
   * Label translation config
   * - enabled: false by default
   * - alwaysInclude: true by default (when enabled, labels are auto-generated unless explicitly false)
   * - localePath: (key) => `form.labels.${key}` by default
   */
  labels?: TranslationCategoryConfig;

  /**
   * Select option label translation config
   * - enabled: false by default
   * - alwaysInclude: true by default (when enabled, option labels use value as key unless label provided)
   * - localePath: (key) => `form.options.${key}` by default
   */
  options?: TranslationCategoryConfig;

  /**
   * Placeholder translation config
   * - enabled: false by default
   * - alwaysInclude: false by default (placeholders require explicit `placeholder: true` or string)
   * - localePath: (key) => `form.placeholders.${key}` by default
   */
  placeholders?: TranslationCategoryConfig;

  /**
   * Validation message translation config
   * - enabled: true by default
   * - localePath: (key) => `form.validation.${key}` by default
   */
  validation?: ValidationTranslationConfig;
}

/**
 * Translation configuration
 *
 * Can be:
 * - `true`: Enable all translation categories with defaults (labels, options, placeholders, validation)
 * - Object: Fine-grained control over each category
 */
export type TranslationConfig = true | TranslationConfigObject;

// Configuration types
export interface FormConfig {
  fieldTypes: Record<string, ProcessedComponentConfig>;  // Now stores processed config
  components: {
    Form?: React.ComponentType<any>;
    Field?: React.ComponentType<any>;
    LayoutContainer?: React.ComponentType<any> | false;
    LayoutItem?: React.ComponentType<any> | false;
    SubmitButton?: React.ComponentType<any> | false;
  };
  translation?: TranslationConfig;
  /**
   * Optional plugin registry for SSR-safe plugin management
   * If not provided, the global plugin registry will be used
   */
  pluginRegistry?: any; // Using 'any' to avoid circular dependency with plugin-system.ts
}


// Response helper types
export interface Meta {
  offset: number;
  limit: number;
  totalCount: number;
}

// Field-specific validation rule types
export interface StringValidationRules {
  required?: ValidationRule<boolean>;
  minLength?: ValidationRule<number>;
  maxLength?: ValidationRule<number>;
  pattern?: ValidationRule<RegExp | string>;
  matchValue?: ValidationRule<string>;
  email?: boolean;
  // Advanced string validations
  contains?: ValidationRule<string>;
  startsWith?: ValidationRule<string>;
  endsWith?: ValidationRule<string>;
  noWhitespace?: ValidationRule<boolean>;
  uppercase?: ValidationRule<boolean>;
  lowercase?: ValidationRule<boolean>;
}

export interface NumberValidationRules {
  required?: ValidationRule<boolean>;
  min?: ValidationRule<number>;
  max?: ValidationRule<number>;
  step?: ValidationRule<number>;
  integer?: boolean;
  positive?: boolean;
  negative?: boolean;
  nonNegative?: boolean;
  nonPositive?: boolean;
}

export interface DateValidationRules {
  required?: ValidationRule<boolean>;
  min?: ValidationRule<Date | string>;
  max?: ValidationRule<Date | string>;
  requiredWhen?: {
    field: string;
    value: string | number | boolean;
  };
}

export interface ArrayValidationRules {
  required?: ValidationRule<boolean>;
  minRows?: ValidationRule<number>;
  maxRows?: ValidationRule<number>;
  minLength?: ValidationRule<number>;
  maxLength?: ValidationRule<number>;
}

export interface SelectValidationRules {
  required?: ValidationRule<boolean>;
}

export interface BooleanValidationRules {
  required?: ValidationRule<boolean>;
  mustBeTrue?: boolean;
  mustBeFalse?: boolean;
}

// Field type to validation rules mapping
export type FieldTypeValidationMap = {
  text: StringValidationRules;
  email: StringValidationRules;
  password: StringValidationRules;
  textarea: StringValidationRules;
  url: StringValidationRules;
  tel: StringValidationRules;
  search: StringValidationRules;
  
  number: NumberValidationRules;
  range: NumberValidationRules;
  
  date: DateValidationRules;
  'datetime-local': DateValidationRules;
  time: DateValidationRules;
  month: DateValidationRules;
  week: DateValidationRules;
  
  select: SelectValidationRules;
  radio: SelectValidationRules;
  
  checkbox: BooleanValidationRules;
  
  repeater: ArrayValidationRules;
  multiselect: ArrayValidationRules;
  
  file: StringValidationRules;
  hidden: StringValidationRules;
  color: StringValidationRules;
};

// Helper to create a field definition with proper validation typing
export function createField<T extends keyof FieldTypeValidationMap>(
  type: T,
  config: Omit<FormFieldDefinition, 'type'> & { validation?: FieldTypeValidationMap[T] }
): FormFieldDefinition & { type: T; validation?: FieldTypeValidationMap[T] } {
  return {
    type,
    ...config,
  } as FormFieldDefinition & { type: T; validation?: FieldTypeValidationMap[T] };
}

