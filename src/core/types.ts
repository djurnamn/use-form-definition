import { FieldError, FieldValues } from "react-hook-form";
import { ReactNode } from "react";
import type { PluginRegistry } from "./plugin-system";
// Type-only, so this stays erased at build time and the runtime cycle
// (field-generators imports this module) never forms.
import type { FieldValueType } from "./schema/field-generators";

// Generic form action types (suitable for Next.js server actions and similar patterns)
export interface FormActionResult<T extends FieldValues = FieldValues> {
  success?: boolean;
  message?: string;
  /** Parsed/validated data (typically present on success). */
  data?: T;
  /**
   * Field validation errors, keyed by field name. Values are display-ready strings
   * (already translated, if you're doing i18n) - `<RenderedForm>` shows them as-is.
   */
  errors?: Record<string, string | string[]>;
  redirectUrl?: string;
  /**
   * Raw submitted values (e.g. `Object.fromEntries(formData.entries())`). When present on a
   * failed result, `<RenderedForm>` re-populates the fields from this on a no-JS
   * validation-error round-trip.
   */
  values?: Record<string, unknown>;
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

/**
 * A named pattern: one of the built-ins, with completion, or the name of a pattern
 * registered with `registerPattern`. An unknown name is reported by the schema at run
 * time, not by the type.
 */
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
  | "hexColor"
  | (string & {});

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

/**
 * Validation rules shared by every field type.
 * Field-specific validation rule types extend this.
 */
export interface CommonValidationRules {
  required?: ValidationRule<boolean>;
  requiredWhen?: {
    field: string;
    value: string | number | boolean;
  };
}

/**
 * Permissive umbrella type for `FormFieldDefinition.validation`.
 *
 * Every rule from every field-specific type is optional here, so a definition
 * with a generic `type: string` still type-checks. For strict per-type
 * validation (e.g. only allowing `mustBeTrue` on checkbox fields), use the
 * `createField<T>()` helper or pick the specific rule type
 * (`StringValidationRules`, `NumberValidationRules`, etc.) directly.
 */
export interface BaseValidationRules extends CommonValidationRules {
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
  /**
   * The form field's HTML `name` attribute.
   *
   * When omitted, the library uses the key of this entry in the parent
   * `FormDefinition` object as the field's name (e.g. `{ email: { type: 'text' } }`
   * yields `name: 'email'`).
   *
   * ⚠ **Setting this to anything other than the definition key is broken - do not use
   * it.** Rendering keys by the name while defaults and the generated schema key by the
   * definition key, so the field ends up with two slots in react-hook-form, client
   * validation fails with the field filled in, and the server reports it missing. Measured;
   * see the `name` deprecation in the CHANGELOG for the cause and the decision it needs.
   *
   * @deprecated Setting a `name` different from the definition key has never worked and
   * is slated for removal; a development-mode warning fires when a definition does it.
   * The definition key already is the field's name - omit this.
   */
  name?: string;
  /**
   * Field label. Accepts:
   * - `undefined`: use the default localePath when `translation.labels.alwaysInclude` is true; otherwise no label
   * - `"auto"`: explicitly use the default localePath for translation (was `true` in v1)
   * - `"none"`: explicitly hide the label (was `false` in v1)
   * - any other string: use as the translation key (when translation enabled) or as a literal label
   *
   * Note: the special strings `"auto"` and `"none"` are reserved - a literal label of
   * `"auto"` or `"none"` is not supported. Use a different literal or a translation key.
   */
  label?: string | "auto" | "none";
  /**
   * Placeholder text. Accepts:
   * - `undefined`: use the default localePath when `translation.placeholders.alwaysInclude` is true; otherwise no placeholder
   * - `"auto"`: explicitly use the default localePath for translation (was `true` in v1)
   * - `"none"`: explicitly hide the placeholder (was `false` in v1)
   * - any other string: use as the translation key (when translation enabled) or as a literal placeholder
   */
  placeholder?: string | "auto" | "none";
  /**
   * Per-field explanatory text ("what does this value actually do"), rendered by the
   * `Field` wrapper under the control and associated with the input via `aria-describedby`.
   * Accepts the same forms as `placeholder`:
   * - `undefined`: use the default localePath when `translation.descriptions.alwaysInclude` is true; otherwise no description
   * - `"auto"`: explicitly use the default localePath for translation
   * - `"none"`: explicitly hide the description
   * - any other string: use as the translation key (when translation enabled) or as a literal description
   *
   * Note: a field type can allowlist `description` in its `additionalProps` (as the
   * djui binding does for `checkbox` and `switch`) - then it reaches the control
   * itself as the control's own inline description, not the wrapper.
   */
  description?: string | "auto" | "none";
  options?: SelectOptions;
  readOnly?: boolean;
  defaultValue?: string | number | boolean | any[];
  /**
   * Derive this field's value from a sibling field (referenced by its definition key)
   * while this field is *unclaimed* - a live-preview affordance for e.g. a slug that
   * auto-fills from a title until the user edits it by hand.
   *
   * While the target is empty or still equal to the last derived value, every change to
   * the source mirrors `transform(sourceValue)` into it (without marking it dirty). A
   * stored value (edit form) is never overwritten; a user edit stops derivation; clearing
   * the field re-arms it.
   *
   * The transform is resolved at runtime: the per-field {@link deriveTransform}, else the
   * kind-level transform registered via `registerFieldType(type, { deriveTransform })`,
   * else identity. Client-side only - server validation ignores this property entirely,
   * so a definition carrying it stays serializable and server-safe.
   */
  deriveFrom?: string;
  /**
   * Per-field transform for {@link deriveFrom}, overriding any kind-level registration.
   * A runtime function - client-side only, not serializable; omit it in definitions
   * shared with server code and rely on the kind-level registration instead.
   */
  deriveTransform?: (value: unknown) => unknown;
  validation?: BaseValidationRules;
  layout?: Record<string, any>; // Props to pass to LayoutItem component

  // For repeater fields - recursive field definitions
  fields?: FormDefinition;

  /**
   * For repeater fields - properties every row carries that no cell renders.
   *
   * A row's generated schema is a plain object over `fields`, and a plain object strips
   * what it does not declare: a row carrying state beyond its cells parses *successfully*
   * while losing everything undeclared, on both the client resolver and
   * `generateDataValidator`. Declare that state here and it survives the parse, validated,
   * with no rendering consequence - a repeater renders exactly `fields`, so an existing
   * repeater component needs no change to honour this.
   *
   * Entries speak validation, not rendering (see {@link SchemaOnlyRowProperty}).
   *
   * @example A class row whose cells are `key` and `level`, carrying game state written elsewhere
   * ```ts
   * classes: {
   *   type: "repeater",
   *   fields: {
   *     key: { type: "select", label: "labels.class" },
   *     level: { type: "select", label: "labels.level" },
   *   },
   *   schemaOnlyRowProperties: {
   *     subclass: { valueType: "string" },
   *     hasAddedStartingEquipment: { valueType: "boolean", defaultsTo: false },
   *     feature_selections: { validatesAs: "selectionMap" },
   *   },
   * }
   * ```
   */
  schemaOnlyRowProperties?: Record<string, SchemaOnlyRowProperty>;

  // Repeater-specific options
  hideHeader?: boolean;
  disableAddRow?: boolean;
  disableRemoveRow?: boolean;

  [key: string]: any; // Allow additional props for custom field types
}

export type FormDefinition = {
  [key: string]: FormFieldDefinition;
};

/**
 * A property every row of a repeater carries that no cell renders - state written into the
 * row by something other than the repeater's own controls.
 *
 * It declares how the value **validates**, never how it looks, so nothing here names a
 * control: `valueType` for the built-in value semantics, or `validatesAs` to borrow the
 * validator of a kind registered with `registerFieldType` (the same registry a rendered
 * field's `type` reads). Provide exactly one. The rendering vocabulary a field definition
 * carries - `type`, `label`, `options`, `layout` - is not accepted; a property block
 * carrying it warns rather than silently doing nothing.
 */
export interface SchemaOnlyRowProperty {
  /**
   * The value's built-in semantics: validates like `text` / `number` / `checkbox` / `date`
   * respectively, with the same coercions on the wire rail.
   */
  valueType?: FieldValueType;
  /**
   * A field kind registered with `registerFieldType` whose *validator* this property
   * borrows - the path for a shape the built-in value types cannot express (an object, an
   * array, a record). The kind must be registered wherever the schema is generated, which
   * for a form validated on both rails means both bundles.
   */
  validatesAs?: string;
  /**
   * Validation rules, resolved exactly as a field's `validation` block is - including the
   * translated message convention. Issues nest in the row's error tree at
   * `[rowIndex][propertyKey]`, reachable with `getNestedError`.
   */
  validation?: BaseValidationRules;
  /**
   * The value the **parse** fills in when a row omits this property.
   *
   * Deliberately not `defaultValue`: a field's `defaultValue` seeds react-hook-form's
   * defaults and never touches the schema, whereas nothing renders or seeds a schema-only
   * property, so the parse is the only place a value can land. It lands on both rails,
   * which is what gives a freshly added row its stamp.
   */
  defaultsTo?: unknown;
}

// Enhanced component configuration for internal use
export interface ProcessedComponentConfig {
  component: React.ComponentType<any>;
  ignoreFieldWrapper: boolean;
  additionalProps: string[];
  /** If true, the component receives the full form config for rendering nested fields */
  injectFormConfig?: boolean;
}

/**
 * Nested field renderer function type
 *
 * Provided to components that need to render a nested field by name (e.g. Repeater
 * rendering each row's fields). Injected by useFormDefinition via the
 * `injectFormConfig` mechanism on a field type's `ProcessedComponentConfig`.
 */
export type NestedFieldRenderer = (
  fieldKey: string,
  fieldDefinition: FormFieldDefinition,
  value: unknown,
  onChange: (value: unknown) => void,
  error?: FieldError,
  namePrefix?: string
) => ReactNode;

/**
 * Internal props injected by `useFormDefinition` into a field component when its
 * `ProcessedComponentConfig` has `injectFormConfig: true`.
 *
 * These are how complex field components (e.g. Repeater) access the surrounding
 * form's config - so nested fields render with the same registered components,
 * translation, and defaults as the parent form.
 *
 * The `__` prefix marks these as library-injected and not user-facing: end users
 * never set them; they appear via the injection mechanism only. A custom complex
 * field component that needs them should declare these props on its props
 * interface (typically via `extends Partial<InternalComponentProps>`).
 *
 * @example
 * ```ts
 * interface MyComplexFieldProps extends Partial<InternalComponentProps> {
 *   name: string;
 *   // ... your own props
 * }
 * ```
 *
 * And register the component with `injectFormConfig: true`:
 * ```ts
 * myComplex: {
 *   component: MyComplexField,
 *   injectFormConfig: true,
 *   // ...
 * }
 * ```
 */
export interface InternalComponentProps {
  /** The full form config, for resolving nested field types and translation. */
  __formConfig: FormConfig;
  /** Renderer that emits a nested field with the same setup as the parent form. */
  __renderNestedField: NestedFieldRenderer;
  /** Default-value resolver, for seeding new rows / nested instances. */
  __getDefaultValueForField: (field: { type: string; defaultValue?: unknown }) => unknown;
  /**
   * Resolve a nested field's display label with the parent form's translation config.
   * Returns the translated string when a `translation.hook` is configured, the raw label
   * otherwise, or `undefined` when the field has no label. Lets a complex component (e.g.
   * a Repeater rendering its own column headers) translate labels the same way the cells do.
   */
  __resolveFieldLabel: (fieldKey: string, fieldDefinition: FormFieldDefinition) => string | undefined;
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
   * - alwaysInclude: false by default (placeholders require explicit `placeholder: "auto"` or a string)
   * - localePath: (key) => `form.placeholders.${key}` by default
   */
  placeholders?: TranslationCategoryConfig;

  /**
   * Field description translation config
   * - enabled: false by default
   * - alwaysInclude: false by default (descriptions require explicit `description: "auto"` or a string)
   * - localePath: (key) => `form.descriptions.${key}` by default
   */
  descriptions?: TranslationCategoryConfig;

  /**
   * Section label translation config (the `label` handed to the `Section` component slot
   * for each declared section)
   * - enabled: false by default
   * - alwaysInclude: true by default when enabled (like labels - a section's label is its
   *   primary presentation)
   * - localePath: (key) => `form.sections.${key}` by default
   */
  sections?: TranslationCategoryConfig;

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
    /**
     * Form-level message region, rendered inside the `<form>` above the fields whenever the
     * form carries a whole-form message (a server-action envelope `message`, or a react-hook-form
     * `root` error). Receives `{ message, status }`. Defaults to the built-in `FormMessage`
     * (minimal, accessible: `role="alert"` for errors). Set to `false` to opt out of the region.
     */
    FormMessage?: React.ComponentType<any> | false;
    LayoutContainer?: React.ComponentType<any> | false;
    LayoutItem?: React.ComponentType<any> | false;
    Actions?: React.ComponentType<any> | false;
    /**
     * Wrapper rendered around each section (see the `sections` hook option and
     * `RenderedSection`). Receives `{ name, label, active, children }` - `label` resolves
     * through the `sections` translation category (falling back to the section name), and
     * `active` is false when the section's fields are rendering as value mirrors. Defaults
     * to a plain fragment, so declaring sections changes no DOM until a wrapper is
     * configured; the natural non-default implementation is
     * `<fieldset><legend>{label}</legend>{children}</fieldset>`. Set to `false` to force
     * the fragment explicitly.
     */
    Section?: React.ComponentType<any> | false;
  };
  translation?: TranslationConfig;
  /**
   * Optional plugin registry for SSR-safe plugin management.
   * If not provided, the global plugin registry is used.
   */
  pluginRegistry?: PluginRegistry;
  /**
   * Set `noValidate` on the rendered `<form>`, disabling the browser's built-in HTML5
   * constraint validation (e.g. the `<input type="email">` bubble). Useful when you want
   * react-hook-form / your server action to be the sole validators. Default: `false`.
   * Overridable per form via `<RenderedForm noValidate>`.
   */
  noValidate?: boolean;
  /**
   * Emit native HTML5 validation attributes (`required`, `pattern`, `minLength`,
   * `maxLength`, `min`, `max`) on rendered inputs, derived from each field's
   * `validation` rules. Gives a no-JS HTML5 validation layer alongside
   * react-hook-form / your server action - the counterpart to `noValidate`.
   * Default: `false` (output is unchanged when off).
   */
  emitHtml5Attributes?: boolean;
}


// Field-specific validation rule types
// Each extends CommonValidationRules to share required/requiredWhen.

export interface StringValidationRules extends CommonValidationRules {
  minLength?: ValidationRule<number>;
  maxLength?: ValidationRule<number>;
  pattern?: ValidationRule<RegExp | PatternKey>;
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

export interface NumberValidationRules extends CommonValidationRules {
  min?: ValidationRule<number>;
  max?: ValidationRule<number>;
  step?: ValidationRule<number>;
  integer?: boolean;
  positive?: boolean;
  negative?: boolean;
  nonNegative?: boolean;
  nonPositive?: boolean;
}

export interface DateValidationRules extends CommonValidationRules {
  min?: ValidationRule<Date | string>;
  max?: ValidationRule<Date | string>;
}

export interface ArrayValidationRules extends CommonValidationRules {
  minRows?: ValidationRule<number>;
  maxRows?: ValidationRule<number>;
  minLength?: ValidationRule<number>;
  maxLength?: ValidationRule<number>;
}

export interface SelectValidationRules extends CommonValidationRules {}

export interface BooleanValidationRules extends CommonValidationRules {
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

