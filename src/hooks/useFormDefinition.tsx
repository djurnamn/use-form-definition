import React, { ReactNode, useMemo, useState, FormEvent, useEffect, useRef, useActionState, startTransition } from "react";
import { Controller, FieldValues, UseFormReturn, DefaultValues, useForm, useFormState, FieldError, Control } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormDefinition,
  FormConfig,
  FormFieldDefinition,
  FormActionResult,
  SelectOption,
  NestedFieldRenderer,
} from "../core/types";
import { generateSchema, generateOptions } from "../core/schema";
import { deriveHtml5Attributes } from "../core/html5-attributes";
import { resolveDeriveTransform } from "../core/derive";
import { generateSchema as generateSchemaFromBuilder } from "../core/schema/schema-builder";
import { generateDataValidator } from "../core/schema/data-validator";
import { FormSections, sectionOf, sectionsWithErrors } from "../core/sections";
import { mirrorWireValues } from "../core/mirror";
import { createFormConfig } from "../configuration/createFormConfig";
import {
  getFieldName,
  generateDefaultValues,
  getDefaultValueForField,
  generateFieldId,
  normalizeTranslationConfig,
  resolveTranslatableValue,
  resolveSelectOptions,
  createValidationTranslator,
  type NormalizedTranslationConfig,
} from "../core/utilities";
import Field from "../components/Field";
import { FormMessage, FormMessageStatus } from "../components/FormMessage";

/**
 * Parse validation error message
 * Converts JSON-encoded validation messages to human-readable strings
 */
const parseValidationError = (
  errorMessage: string,
  translateValidation: (key: string, options?: Record<string, any>) => string
): string => {
  // Handle validation error message (JSON string from schema-builder)
  if (errorMessage.startsWith('[')) {
    try {
      const [errorKey, errorOptions] = JSON.parse(errorMessage);
      return translateValidation(errorKey, errorOptions);
    } catch (e) {
      // Silently ignore invalid validation message format
      return errorMessage;
    }
  }

  // Handle regular string - attempt translation
  return translateValidation(errorMessage);
};

/**
 * Translate every message in a react-hook-form error node, preserving its shape.
 *
 * A flat field's error is a single `FieldError`; translating its `message` is the whole
 * job. A structured field's (the repeater, a custom kind whose generator returns an
 * array/object schema) is a nested tree: the resolver roots each item issue under the
 * top-level key, so `errors.classes` is an array of per-item error objects. Walking the
 * tree keeps item errors addressable (`error[0].level.message`) with the same translated
 * messages a flat field gets - the previous flat-only handling reduced the tree to
 * `message: undefined`, which is how item errors rendered nowhere.
 *
 * Server-tagged errors (`type: 'server'`) already carry display-ready strings and pass
 * through untouched. `ref` values are react-hook-form's control handles, not error
 * nodes, and are carried over without being walked into. `types` (criteriaMode 'all')
 * holds messages keyed by rule, so its string values translate too.
 */
/**
 * How a message learns which field it is for, at one level of an error tree.
 * `translate` carries that field's label and key into every message's options;
 * `item` steps into an item field declared under it (a repeater column), or returns
 * nothing for a key that is not a declared item field, so that level keeps its scope.
 */
interface MessageScope {
  translate: (key: string, options?: Record<string, any>) => string;
  item?: (key: string) => MessageScope | undefined;
}

/**
 * The message scope for a field: every message translation receives `field` (the
 * resolved label, or the key when there is none) and `fieldKey` (the definition key)
 * alongside its own options, so a translation can read "{field} is required"; one
 * that does not use them is unaffected. An item error inside a structured field (a
 * repeater cell) names the item field it belongs to, with its key path as the key
 * (`classes.level`); a nested key that is not a declared item field keeps the parent's.
 */
const messageScopeFor = (
  translateValidation: (key: string, options?: Record<string, any>) => string,
  translationConfig: Parameters<typeof resolveFieldPresentationData>[2],
  scopeKey: string,
  definition: FormFieldDefinition,
  label: string | undefined
): MessageScope => ({
  translate: (messageKey, options) =>
    translateValidation(messageKey, { field: label ?? scopeKey, fieldKey: scopeKey, ...(options ?? {}) }),
  item: (itemKey) => {
    const itemField = definition.fields?.[itemKey];
    if (!itemField) return undefined;
    return messageScopeFor(
      translateValidation,
      translationConfig,
      `${scopeKey}.${itemKey}`,
      itemField,
      resolveFieldPresentationData(itemField, itemKey, translationConfig).label
    );
  },
});

const translateErrorNode = (node: unknown, scope: MessageScope): any => {
  if (Array.isArray(node)) {
    return node.map((item) => (item == null ? item : translateErrorNode(item, scope)));
  }
  if (!node || typeof node !== 'object') return node;

  const source = node as Record<string, unknown>;
  if (source.type === 'server') return node;

  const translated: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (key === 'ref') {
      translated[key] = value;
    } else if (key === 'message' && typeof value === 'string') {
      translated[key] = parseValidationError(value, scope.translate);
    } else if (key === 'types' && value && typeof value === 'object') {
      translated[key] = Object.fromEntries(
        Object.entries(value).map(([rule, ruleMessage]) => [
          rule,
          typeof ruleMessage === 'string'
            ? parseValidationError(ruleMessage, scope.translate)
            : ruleMessage,
        ])
      );
    } else if (value && typeof value === 'object') {
      translated[key] = translateErrorNode(value, scope.item?.(key) ?? scope);
    } else {
      translated[key] = value;
    }
  }
  return translated;
};

/**
 * Resolved field presentation data (label, placeholder, options)
 * Used to avoid duplicating translation resolution logic
 */
interface ResolvedFieldData {
  label: string | undefined;
  placeholder: string | undefined;
  description: string | undefined;
  options: SelectOption[] | undefined;
}

/**
 * Resolves field presentation data (label, placeholder, options) with translation support
 * Centralizes the translation resolution logic to avoid duplication
 */
const resolveFieldPresentationData = (
  field: FormFieldDefinition,
  fieldKey: string,
  translationConfig: {
    labels: { enabled: boolean; alwaysInclude: boolean; localePath: (key: string) => string };
    placeholders: { enabled: boolean; alwaysInclude: boolean; localePath: (key: string) => string };
    descriptions: { enabled: boolean; alwaysInclude: boolean; localePath: (key: string) => string };
    options: { enabled: boolean; alwaysInclude: boolean; localePath: (key: string) => string };
    function?: (key: string, options?: Record<string, any>) => string;
  }
): ResolvedFieldData => {
  const label = resolveTranslatableValue(
    field.label,
    fieldKey,
    translationConfig.labels,
    translationConfig.function
  );

  const placeholder = resolveTranslatableValue(
    field.placeholder,
    fieldKey,
    translationConfig.placeholders,
    translationConfig.function
  );

  const description = resolveTranslatableValue(
    field.description,
    fieldKey,
    translationConfig.descriptions,
    translationConfig.function
  );

  const options = resolveSelectOptions(
    field.options,
    translationConfig.options,
    translationConfig.function
  );

  return { label, placeholder, description, options };
};

/**
 * Library-specific props that should NOT be passed to DOM elements
 * These props are used by the library for configuration but should be filtered out
 * before being spread onto actual input components
 */
const LIBRARY_PROPS: Record<string, true> = {
  validation: true,
  label: true,
  placeholder: true,
  // The Field wrapper's explanatory text - filtered from controls so it never
  // lands as a DOM attribute; a field type's `additionalProps` can allowlist it
  // back (e.g. a binding's `checkbox`/`switch`), and there it is the control's
  // own inline description.
  description: true,
  type: true,
  fields: true,
  hideHeader: true,
  disableAddRow: true,
  disableRemoveRow: true,
  layout: true,
  options: true,
  readOnly: true,
  defaultValue: true,
  deriveFrom: true,
  deriveTransform: true,
};

/**
 * Filters out library-specific props from field props
 * Allows additional props specified in the component config to pass through
 */
const filterLibraryProps = (
  props: Record<string, any>,
  additionalAllowedProps: string[] = []
): Record<string, any> => {
  const filtered: Record<string, any> = {};
  const allowedSet = new Set(additionalAllowedProps);

  for (const key in props) {
    // Skip library props unless explicitly allowed for this component type
    if (LIBRARY_PROPS[key] && !allowedSet.has(key)) {
      continue;
    }
    filtered[key] = props[key];
  }

  return filtered;
};

/**
 * Point the control's `aria-describedby` at the description element the default
 * `Field` wrapper is about to render (`<fieldId>-description`). The built-in
 * controls only fall back to their error id when no `aria-describedby` prop is
 * passed, so the injected value must carry the error id too when an error shows.
 * Only applies with the default wrapper - a custom `Field` renders the
 * description its own way, with ids this hook can't know about.
 */
const injectDescriptionDescribedBy = (
  componentProps: Record<string, any>,
  fieldProps: Record<string, any>,
  fieldName: string,
  error: FieldError | undefined
): void => {
  const description = fieldProps.description;
  if (typeof description !== 'string' || !description) return;

  const descriptionId = `${generateFieldId(fieldName, componentProps.id)}-description`;
  componentProps['aria-describedby'] = [
    componentProps['aria-describedby'],
    error?.message ? `${fieldName}-error` : undefined,
    descriptionId,
  ]
    .filter(Boolean)
    .join(' ');
};

export type { NestedFieldRenderer };

/**
 * Creates a nested field renderer function that uses the form config
 * to render fields consistently with the parent form
 */
const createNestedFieldRenderer = (
  config: FormConfig,
  translateValidation: (key: string, options?: Record<string, any>) => string,
  translationConfig: Parameters<typeof resolveFieldPresentationData>[2]
): NestedFieldRenderer => {
  return (
    fieldKey: string,
    fieldDefinition: FormFieldDefinition,
    value: unknown,
    onChange: (value: unknown) => void,
    error?: FieldError,
    namePrefix?: string
  ): ReactNode => {
    const componentConfig = config.fieldTypes[fieldDefinition.type];

    if (!componentConfig) {
      console.warn(`No component registered for field type: ${fieldDefinition.type}`);
      return <span key={namePrefix}>Unknown field type: {fieldDefinition.type}</span>;
    }

    const Component = componentConfig.component;

    // Wrap onChange to handle both native events and direct values
    // Native form elements pass event objects, while some custom components pass values directly
    const wrappedOnChange = (eventOrValue: unknown) => {
      // Check if it's a native DOM event
      if (eventOrValue && typeof eventOrValue === 'object' && 'target' in eventOrValue) {
        const event = eventOrValue as React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
        const target = event.target;

        // Handle checkboxes specially
        if (target.type === 'checkbox') {
          onChange((target as HTMLInputElement).checked);
        } else {
          // For number inputs, convert to number if appropriate
          const rawValue = target.value;
          if (fieldDefinition.type === 'number' && rawValue !== '') {
            onChange(Number(rawValue));
          } else {
            onChange(rawValue);
          }
        }
      } else {
        // It's a direct value (from custom components)
        onChange(eventOrValue);
      }
    };

    // Nested fields get the same translation resolution as top-level ones
    // (options labels, placeholder, description) - only the label stays
    // suppressed, since in repeater context labels are typically in the header.
    const { placeholder: resolvedPlaceholder, description: resolvedDescription, options: resolvedOptions } =
      resolveFieldPresentationData(fieldDefinition, fieldKey, translationConfig);

    const fieldProps = {
      name: namePrefix || fieldKey,
      value,
      onChange: wrappedOnChange,
      error,
      ...fieldDefinition,
      ...(resolvedPlaceholder !== undefined ? { placeholder: resolvedPlaceholder } : {}),
      ...(resolvedDescription !== undefined ? { description: resolvedDescription } : {}),
      ...(resolvedOptions ? { options: resolvedOptions } : {}),
      // In repeater context, labels are typically in the header
      label: undefined,
    };

    // Filter library props, allowing additional props for this component type
    const componentProps = filterLibraryProps(fieldProps, componentConfig.additionalProps);

    return <Component key={namePrefix} {...componentProps} />;
  };
};

/**
 * Server action function type for RenderedForm / useFormDefinition's `serverAction` option.
 */
export type ServerAction<TFormData extends FieldValues> = (
  prevState: FormActionResult<TFormData> | null,
  formData: FormData
) => Promise<FormActionResult<TFormData>>;

/**
 * A no-op server action used so `useActionState` can be called unconditionally even when no
 * `serverAction` is configured. It is never dispatched in that case.
 */
const NOOP_SERVER_ACTION: ServerAction<any> = async (prevState) => prevState ?? {};

/**
 * Form definition hook options
 *
 * The `form` option accepts two patterns:
 * 1. Omitted - useForm is called internally (simplest)
 * 2. Full UseFormReturn object - pass the entire useForm() result for full control
 */
interface UseFormDefinitionOptions<T extends FormDefinition> {
  /**
   * Form instance from react-hook-form
   * - If omitted, useForm() is called internally with auto-generated options
   * - If provided, the full UseFormReturn object is used
   *
   * **Trade-off worth knowing before you reach for this.** The no-JS validation-error
   * round trip re-populates the fields by merging the action's echoed `values` into the
   * defaults *of the form this hook constructs*. A form you construct yourself was built
   * before this hook ran and cannot see that result, so passing `form` **silently disables
   * no-JS re-population** - a user without JS loses what they typed. If you only need
   * starting values, pass {@link UseFormDefinitionOptions.defaultValues} instead and let
   * the hook own the form; reach for `form` when you genuinely need the instance during
   * render (a state bridge, cross-field effects) and either accept the loss or have no
   * server action at all. Passing both `form` and `serverAction` warns in development.
   */
  form?: UseFormReturn<any>;
  /**
   * Initial values for the internally-created form - an edit form's stored record.
   *
   * Merged over the definition's own generated defaults, and *under* a failed server
   * action's echoed `values`, so a no-JS validation-error round trip re-populates what the
   * user typed rather than resetting to the record.
   *
   * **Prefer this to building the form yourself** when all you need is starting values.
   * Passing `form` makes the consumer the owner of `defaultValues`, and the no-JS
   * re-population above is applied where the internal form is constructed - so a
   * consumer-supplied form silently loses it (see the `form` option). Ignored when `form`
   * is passed, since there is nothing left to construct.
   */
  defaultValues?: FieldValues;
  /**
   * The form's partition into named sections: section name to the definition keys it
   * contains, in declared order. Purely presentational - the definition and the generated
   * schema know nothing about it.
   *
   * What it enables, each activated by one more thing:
   * - by itself, with a zero-config `<RenderedForm />`: the fields render grouped, each
   *   group wrapped in the `Section` component slot (a fragment by default) - structural
   *   grouping on one page.
   * - with `currentSection` on `RenderedForm`: the active section renders its controls
   *   and every other section renders its fields as **value mirrors** (hidden inputs
   *   carrying the current values), so the posted `FormData` is always the whole form -
   *   tabs and wizard steps post completely, on both the JS and no-JS submit paths,
   *   with no extra mechanism.
   * - the hook's returned `sections` API: per-section validation
   *   (`sections.validate('lore')` for a wizard's Continue gate), membership lookups,
   *   and `sections.withErrors(...)` for tab badges.
   *
   * With custom `children`, wrap each region in the returned `RenderedSection` instead of
   * (or as well as) declaring this map - membership is then observed from rendering, and
   * when both are present a development-mode check warns on drift between them.
   *
   * A field listed in no section renders as always-visible content. Never treat the
   * partition as a server-side write filter: a posted `FormData` is client-supplied, so
   * what was rendered is not a boundary the server can rely on.
   */
  sections?: FormSections<T>;
  config?: Partial<FormConfig>;
  /**
   * Server action for the form (e.g. a Next.js Server Action).
   *
   * When provided, `useFormDefinition` manages a `useActionState()` for it:
   * - `<RenderedForm>` wires it via `<form action={...}>`, so the form submits and is
   *   validated server-side **without JavaScript** (progressive enhancement). With JS,
   *   react-hook-form layers client-side validation on top (the internal form uses
   *   `mode: 'onTouched'` so the user gets feedback before submitting).
   * - The returned `actionState` is the latest result - render your success / result view
   *   from it (it survives SSR / no-JS, unlike an `onSuccess` callback).
   * - The returned `isPending` reflects the in-flight submission.
   *
   * The server action should return display-ready (and, for i18n, already-translated)
   * error strings in `errors` - `<RenderedForm>` shows them as-is. To re-populate the
   * fields on a no-JS validation-error round-trip, also return `values` (e.g.
   * `Object.fromEntries(formData.entries())`).
   *
   * This is also accepted as a prop on `<RenderedForm>` for backwards compatibility, but
   * passing it here is preferred - only the hook option exposes `actionState`.
   */
  serverAction?: ServerAction<z.infer<ReturnType<typeof generateSchema<T>>>>;
}

/**
 * The first-class, always-typed props of the RenderedField component.
 *
 * The standard runtime overrides (`disabled`, `options`, `label`, `placeholder`,
 * `description`, `className`, `style`) override the definition's default and are
 * typed here.
 * Custom forwarded extras are added on top by {@link RenderedFieldProps}.
 */
export interface RenderedFieldBaseProps<T extends FormDefinition> {
  /** The field name from the form definition */
  name: keyof T & string;
  /** Runtime override: disable the field (overrides any definition default) */
  disabled?: boolean;
  /** Runtime override: select options (replaces v1's `optionsCallback` - load async data in your component and pass it here) */
  options?: SelectOption[];
  /** Runtime override: label string (or `false` to hide). Bypasses translation. */
  label?: string | boolean;
  /** Runtime override: placeholder string (or `false` to hide). Bypasses translation. */
  placeholder?: string | boolean;
  /** Runtime override: description string (or `false` to hide). Bypasses translation. */
  description?: string | boolean;
  /** Runtime override: forwarded to the field component */
  className?: string;
  /** Runtime override: forwarded to the field component */
  style?: React.CSSProperties;
  /** Custom render function for the field (escape hatch - receives the raw field definition) */
  render?: (field: T[keyof T]) => ReactNode;
}

/**
 * Props for the RenderedField component.
 *
 * `Extras` describes the custom runtime props your field components accept -
 * the keys you declare in each field type's `additionalProps` allowlist. It
 * defaults to a permissive record, so untyped usage keeps compiling unchanged.
 * Pass a concrete shape (via the second type argument to {@link useFormDefinition})
 * to get typo-checking and value types on forwarded extras:
 *
 * @example
 * ```tsx
 * const { RenderedField } = useFormDefinition<typeof def, { tooltip?: string }>(def);
 * <RenderedField name="email" tooltip="We never share it." /> // ✓ typed
 * <RenderedField name="email" toolttip="..." />                 // ✗ typo caught
 * ```
 *
 * Extras are still filtered at runtime against the field type's `additionalProps`
 * config; typing `Extras` only adds compile-time checking on top.
 */
export type RenderedFieldProps<
  T extends FormDefinition,
  Extras extends Record<string, unknown> = Record<string, unknown>,
> = RenderedFieldBaseProps<T> & Partial<Extras>;

/**
 * Props for the RenderedForm component
 */
export interface RenderedFormProps<TFormData extends FieldValues> {
  /** Submit handler receiving validated form data (client-side). Ignored when a server action is configured. */
  onSubmit?: (data: TFormData) => void | Promise<void>;
  /**
   * Server action for form submission - an alternative to passing `serverAction` to
   * `useFormDefinition()`. The hook option is preferred (it also exposes `actionState`);
   * passing it here keeps it working but `actionState` won't be available from the hook.
   */
  serverAction?: ServerAction<TFormData>;
  /** Callback when the server action succeeds (client-side only - for SSR/no-JS, render from the hook's `actionState`). */
  onSuccess?: (result: FormActionResult<TFormData>) => void;
  /** Callback when the server action fails (client-side only). */
  onError?: (result: FormActionResult<TFormData>) => void;
  /**
   * Whether to show the actions slot (default: true). Ignored when `children` is provided.
   *
   * @deprecated Configure the slot instead: `config: { components: { Actions: false } }` on
   * the hook (or a custom component there to replace it). One mechanism, per form, already
   * honored by the renderer - this boolean is a redundant second switch and will be removed
   * in the next major.
   */
  showActions?: boolean;
  /**
   * Custom layout for the form body. When provided, these children are rendered inside the
   * form element **instead of** the automatic field grid (`LayoutContainer` / `LayoutItem`
   * per-field layout), while `RenderedForm` keeps owning all form wiring: the `<form action>`
   * / `onSubmit` progressive-enhancement path, `actionState` → `form.setError`, no-JS value
   * re-population, and the `onSuccess` / `onError` callbacks.
   *
   * Compose the body from the hook's `RenderedField` (each still shows server-action errors on
   * SSR / no-JS) and `Actions`, arranged however you like:
   *
   * ```tsx
   * const { RenderedForm, RenderedField, Actions } = useFormDefinition(def, { serverAction });
   * <RenderedForm>
   *   <MyTwoColumnLayout
   *     left={<RenderedField name="image" />}
   *     right={<><RenderedField name="name" /><RenderedField name="slug" /></>}
   *   />
   *   <RenderedField name="description" />
   *   <Actions />
   * </RenderedForm>
   * ```
   *
   * `showActions` is ignored in this mode - place `<Actions />` yourself.
   */
  children?: ReactNode;
  /**
   * Set `noValidate` on the `<form>`, disabling the browser's built-in HTML5 constraint
   * validation. Overrides the hook/config `noValidate` for this form.
   */
  noValidate?: boolean;
  /**
   * The `method` attribute on the rendered `<form>`.
   *
   * Only meaningful for a **client-only** form (one wired with `onSubmit` and no server
   * action), and only before React hydrates - once the submit handler is attached it calls
   * `preventDefault()` and the browser never uses the method. It defaults to `"post"`,
   * because the browser's own default (`"get"`) serializes every field into the URL on a
   * pre-hydration submit, which for a sign-in or password-reset form leaks credentials into
   * browser history, the `Referer` header of anything the page later loads, and every access
   * log in front of the app.
   *
   * Pass `"get"` explicitly where a query string is the point - a search or filter form that
   * should be linkable and shareable.
   *
   * Ignored when a server action is configured: React owns the method there (it POSTs to its
   * own action endpoint), and overriding it would break that path.
   */
  method?: 'get' | 'post';
  /**
   * The active section, when the form is partitioned (see the `sections` hook option and
   * `RenderedSection`). Controlled by the app - tabs, wizard steps, a router param; the
   * library never changes it, it only renders accordingly: the active section's fields
   * as controls, every other section's fields as value mirrors (hidden inputs carrying
   * their current values), so the post always contains the whole form.
   *
   * Omitted: every section renders its controls (structural grouping only). Matching no
   * section: everything mirrors - coherent but almost certainly a typo, so development
   * builds warn. Content outside any section always renders.
   */
  currentSection?: string;
  /** Additional props to pass to the form element */
  className?: string;
  /** Additional props to pass to the form element */
  style?: React.CSSProperties;
}

/**
 * Membership questions about a partitioned form (see the `sections` hook option and
 * `RenderedSection`), answered from the declared `sections` map when one was given,
 * otherwise from membership observed while rendering. Navigation - which section is
 * current, whether to advance - stays app state; this API only answers questions, which
 * is what makes an app-owned wizard gate one line:
 *
 * ```ts
 * const next = async () => {
 *   if (await sections.validate(steps[step])) setStep(step + 1);
 * };
 * ```
 */
export interface SectionsApi {
  /** Validate one section's fields (react-hook-form `trigger` with focus-on-first-error). Vacuously true for an unknown or empty section. */
  validate: (name: string) => Promise<boolean>;
  /** The section that declares a field, or `undefined` for a field in no section. */
  of: (fieldKey: string) => string | undefined;
  /** The sections carrying at least one of these errors, in declared order - tab badges, jump-to-first-failing. */
  withErrors: (errors?: Record<string, unknown>) => string[];
  /** The declared field list for a section. */
  fields: (name: string) => string[];
}

export interface UseFormDefinitionReturn<
  T extends FormDefinition,
  TFormData extends FieldValues = z.infer<ReturnType<typeof generateSchema<T>>>,
  Extras extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * The react-hook-form instance
   * - If form was passed to useFormDefinition, this is that same instance
   * - If form was omitted, this is the internally created instance
   */
  form: UseFormReturn<TFormData>;

  /**
   * Component to render a single field from the definition
   * @example <RenderedField name="email" />
   */
  RenderedField: React.FC<RenderedFieldProps<T, Extras>>;

  /**
   * Component to render the entire form with all fields
   * @example <RenderedForm onSubmit={handleSubmit} />
   */
  RenderedForm: React.FC<RenderedFormProps<TFormData>>;

  /**
   * Wraps a region of a custom layout as a named section. With `currentSection` on
   * `RenderedForm`, an inactive section's `RenderedField`s render as value mirrors
   * (hidden inputs carrying their current values) instead of controls, so the post
   * always contains the whole form; without it, sections are structural grouping only.
   * Renders the `Section` component slot (a fragment by default) around its children.
   * @example
   * <RenderedSection name="lore">
   *   <RenderedField name="summary" />
   * </RenderedSection>
   */
  RenderedSection: React.FC<{ name: string; children?: ReactNode }>;

  /**
   * Membership questions about the form's sections - per-section validation for a
   * wizard's Continue gate, error-to-section mapping for tab badges. See {@link SectionsApi}.
   */
  sections: SectionsApi;

  /**
   * Configured Form wrapper component for custom layouts
   * Falls back to a basic <form> element if not configured
   */
  Form: React.ComponentType<React.FormHTMLAttributes<HTMLFormElement>>;

  /**
   * Configured Actions component (form action area - submit button(s), cancel, etc.)
   * Falls back to a basic <button type="submit"> if not configured
   */
  Actions: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>;

  /**
   * Configured FormMessage component (the form-level message region).
   * `RenderedForm` renders this automatically above the fields when the form carries a
   * whole-form message; it's also returned here for manual composition. Falls back to the
   * built-in `FormMessage` if not configured; `null` when the slot is set to `false` (opted out).
   */
  FormMessage: React.ComponentType<{ message: string; status?: FormMessageStatus }> | null;

  /**
   * Configured LayoutContainer component for grid layouts
   * Returns null if not configured
   */
  LayoutContainer: React.ComponentType<{ children: ReactNode }> | null;

  /**
   * Configured LayoutItem component for grid items
   * Returns null if not configured
   */
  LayoutItem: React.ComponentType<{ children: ReactNode; [key: string]: any }> | null;

  /**
   * Latest result returned by the configured `serverAction`.
   * `null` until the first submission, or if no `serverAction` was provided.
   * Use this to render your success / result view (it works on SSR / without JS).
   */
  actionState: FormActionResult<TFormData> | null;

  /** Whether the configured `serverAction` is currently running. `false` if no `serverAction` was provided. */
  isPending: boolean;

  /**
   * The bound action to pass to `<form action={...}>` for the configured `serverAction`.
   * `null` if no `serverAction` was provided. Mostly internal - `<RenderedForm>` wires it for you.
   */
  formAction: ((formData: FormData) => void) | null;

  validateData: (formData: FormData) => z.SafeParseReturnType<unknown, unknown>;
  generateSchema: () => ReturnType<typeof generateSchema<T>>;
  generateOptions: () => ReturnType<typeof generateOptions<T>>;

  // Type helpers
  _types: z.infer<ReturnType<typeof generateSchema<T>>>;
}

// ============================================================================
// Render context + standalone render helpers
//
// `RenderedField` / `RenderedForm` are created once per hook instance (stable component
// identities) and read everything that changes per render from `ctxRef.current`. This avoids
// recreating those components - and remounting the whole form subtree - every time the parent
// re-renders (config / translationConfig / translateValidation are fresh objects each render).
// ============================================================================

interface RenderContext<T extends FormDefinition> {
  definition: T;
  form: UseFormReturn<any>;
  config: FormConfig;
  translationConfig: NormalizedTranslationConfig;
  translateValidation: (key: string, options?: Record<string, any>) => string;
  /** The `serverAction` from the hook option (undefined if not provided). */
  serverAction: ServerAction<any> | undefined;
  /** Action state managed by the hook (only meaningful when `serverAction` is set). */
  actionState: FormActionResult<any> | null;
  formAction: ((formData: FormData) => void) | null;
  isPending: boolean;
  /** The declared partition from the hook's `sections` option (undefined if not provided). */
  sections: FormSections<any> | undefined;
  /**
   * The active section, written by `RenderedForm` from its `currentSection` prop during
   * its own render - safe for `RenderedSection` to read, because children *execute*
   * after the parent's function body even though their elements are constructed before.
   */
  currentSection: string | undefined;
  /**
   * Membership as observed from rendering: definition key -> section name. Under the
   * mirror model every section's every field renders on every pass (as control or as
   * mirror), so this is complete after first paint - which is what makes it a valid
   * source for the sections API when no `sections` option was declared, and the
   * declared-vs-rendered drift check in development. Lives on a ref so parent
   * re-renders (which rebuild this ctx object) cannot wipe it.
   */
  sectionRegistry: Map<string, string>;
  /** Section names seen during the current render pass - for the unmatched-`currentSection` warning. */
  seenSectionNames: Set<string>;
}

/**
 * Which section encloses the currently rendering `RenderedField`, and whether it is the
 * active one. `null` outside any `RenderedSection`. Module-level: the value is scoped by
 * the provider, so hook instances cannot leak into one another.
 */
const SectionContext = React.createContext<{ name: string; active: boolean } | null>(null);

/**
 * The `label` handed to the `Section` component slot: the section name resolved through
 * the `sections` translation category (`form.sections.<name>` by default), falling back
 * to the name itself when the category is disabled or no translator is configured.
 */
const resolveSectionLabel = (
  name: string,
  translationConfig: NormalizedTranslationConfig
): string =>
  resolveTranslatableValue(
    undefined,
    name,
    translationConfig.sections,
    translationConfig.function
  ) ?? name;

/**
 * A field's value mirror: what renders in place of its control inside an inactive
 * section. Hidden inputs carrying the wire encoding of the current value (see
 * `core/mirror.ts` for the per-kind contract), marked `data-ufd-mirror` so the
 * off-screen-errors visibility test can tell a mirror from a real control.
 *
 * Rendered through the same `Controller` as the control would be, deliberately: the
 * field stays registered (so `trigger()` keeps its errors rather than dropping a
 * never-registered field), and the mirror stays live when something writes the value
 * while it is unmounted-as-a-control - `deriveFrom` into a field on another section
 * being the case that matters.
 */
const FieldMirror = <T extends FormDefinition>({
  ctx,
  definitionKey,
}: {
  ctx: RenderContext<T>;
  definitionKey: keyof T;
}) => {
  const field = ctx.definition[definitionKey as string];
  if (!field) return null;
  const fieldName = getFieldName(String(definitionKey), field);

  return (
    <Controller
      name={fieldName as any}
      control={ctx.form.control}
      render={({ field: controllerField }) => {
        const wire = mirrorWireValues(field.type, controllerField.value);
        if (wire === null) return <></>;
        return (
          <>
            {wire.map((value, index) => (
              <input
                key={index}
                type="hidden"
                name={fieldName}
                value={value}
                data-ufd-mirror=""
              />
            ))}
          </>
        );
      }}
    />
  );
};

/**
 * Renders a single field. `serverErrors` (when provided by `RenderedForm`) is the error map
 * from a server action result; it's rendered directly so SSR / no-JS shows server-side
 * validation errors. On the client the same data also ends up on react-hook-form (as a
 * `type: 'server'` error via `form.setError`), which then owns/clears it.
 */
const renderField = <T extends FormDefinition>(
  ctx: RenderContext<T>,
  definitionKey: keyof T,
  runtimeOverrides: Record<string, any> = {},
  customRender?: (field: T[keyof T]) => ReactNode,
  serverErrors?: Record<string, string | string[]>
): ReactNode => {
  const { definition, form, config, translationConfig, translateValidation } = ctx;

  // FormDefinition keys are always strings, but TypeScript doesn't narrow keyof T
  const key = definitionKey as string;
  const field = definition[definitionKey];

  if (!field) {
    throw new Error(`Field ${key} not found in definition`);
  }

  const fieldName = getFieldName(key, field);

  // Opt-in native HTML5 validation attributes derived from the field's validation rules.
  // Undefined (and thus a no-op merge) unless `emitHtml5Attributes` is enabled, so the
  // flag-off render output is unchanged.
  const html5Attrs = config.emitHtml5Attributes ? deriveHtml5Attributes(field) : undefined;

  // If custom render function is provided, use it
  if (customRender) {
    return customRender(field);
  }

  // If no form control is provided, render static field
  if (!form?.control) {
    const componentConfig = config.fieldTypes[field.type];
    if (!componentConfig) {
      return <div>Component not found for field type: {field.type}</div>;
    }

    const Component = componentConfig.component;
    const FieldWrapper = config.components.Field || Field;

    const shouldIgnoreWrapper = componentConfig.ignoreFieldWrapper;

    const { label: fieldLabel, placeholder: fieldPlaceholder, description: fieldDescription, options: resolvedOptions } =
      resolveFieldPresentationData(field, key, translationConfig);

    const fieldProps = {
      ...field,
      ...(html5Attrs ?? {}),
      name: fieldName,
      label: fieldLabel,
      placeholder: fieldPlaceholder,
      description: fieldDescription,
      ...(resolvedOptions ? { options: resolvedOptions } : {}),
      ...runtimeOverrides,
    };

    const componentProps = filterLibraryProps(fieldProps, componentConfig.additionalProps);

    if (!shouldIgnoreWrapper && !config.components.Field) {
      injectDescriptionDescribedBy(componentProps, fieldProps, fieldName, undefined);
    }

    if (componentConfig.injectFormConfig) {
      componentProps.__formConfig = config;
      componentProps.__renderNestedField = createNestedFieldRenderer(config, translateValidation, translationConfig);
      componentProps.__getDefaultValueForField = getDefaultValueForField;
      componentProps.__resolveFieldLabel = (fieldKey: string, fieldDefinition: FormFieldDefinition) =>
        resolveFieldPresentationData(fieldDefinition, fieldKey, translationConfig).label;
    }

    if (shouldIgnoreWrapper) {
      return <Component key={key} {...componentProps} />;
    }

    return (
      <FieldWrapper key={key} {...fieldProps}>
        <Component {...componentProps} />
      </FieldWrapper>
    );
  }

  // Render with form control
  return (
    <Controller
      key={key}
      name={fieldName as any}
      control={form.control}
      render={({ field: controllerField, fieldState }) => {
        const componentConfig = config.fieldTypes[field.type];
        if (!componentConfig) {
          return <div>Component not found for field type: {field.type}</div>;
        }

        const Component = componentConfig.component;
        const FieldWrapper = config.components.Field || Field;

        const shouldIgnoreWrapper = componentConfig.ignoreFieldWrapper;

        // Resolve the error to display:
        // - react-hook-form client errors carry JSON-encoded messages → parse + translate
        //   them, through the whole tree: a structured field's error is a nested tree of
        //   per-item errors, and it reaches the component with its shape intact so item
        //   errors can render at the item (the built-in Repeater does; a custom kind
        //   reads it with `getNestedError`)
        // - errors set from a server action result are tagged `type: 'server'` and already
        //   contain a display-ready string → show verbatim (don't re-translate)
        // - if there's no RHF error yet, fall back to the raw server error map (this is the
        //   path that runs during SSR / without JS, before the setError effect can run)
        const { label: fieldLabel, placeholder: fieldPlaceholder, description: fieldDescription, options: resolvedOptions } =
          resolveFieldPresentationData(field, key, translationConfig);

        // Every message translation learns which field it is for, see `messageScopeFor`.
        const messageScope = messageScopeFor(translateValidation, translationConfig, key, field, fieldLabel);

        let displayError: FieldError | undefined;
        if (fieldState.error) {
          displayError = translateErrorNode(fieldState.error, messageScope) as FieldError;
        } else {
          const raw = serverErrors?.[key] ?? serverErrors?.[fieldName];
          if (raw) {
            displayError = {
              type: 'server',
              message: Array.isArray(raw) ? raw.join(', ') : raw,
            } as FieldError;
          }
        }

        const fieldProps = {
          ...field,
          ...controllerField,
          ...(html5Attrs ?? {}),
          label: fieldLabel,
          placeholder: fieldPlaceholder,
          description: fieldDescription,
          error: displayError,
          ...(resolvedOptions ? { options: resolvedOptions } : {}),
          ...runtimeOverrides,
        };

        const componentProps = filterLibraryProps(fieldProps, componentConfig.additionalProps);

        if (!shouldIgnoreWrapper && !config.components.Field) {
          injectDescriptionDescribedBy(componentProps, fieldProps, fieldName, displayError);
        }

        if (componentConfig.injectFormConfig) {
          componentProps.__formConfig = config;
          componentProps.__renderNestedField = createNestedFieldRenderer(config, translateValidation, translationConfig);
          componentProps.__getDefaultValueForField = getDefaultValueForField;
          componentProps.__resolveFieldLabel = (fieldKey: string, fieldDefinition: FormFieldDefinition) =>
            resolveFieldPresentationData(fieldDefinition, fieldKey, translationConfig).label;
        }

        if (shouldIgnoreWrapper) {
          return <Component {...componentProps} />;
        }

        return (
          <FieldWrapper {...fieldProps}>
            <Component {...componentProps} />
          </FieldWrapper>
        );
      }}
    />
  );
};

// Helper to render the actions slot.
// - `Actions: false` is an explicit opt-out - no actions rendered at all.
// - `Actions: <Component>` (truthy) renders the registered component.
// - `Actions: undefined` (not configured) renders a default <button type="submit">.
const renderActions = (config: FormConfig): ReactNode => {
  const Actions = config.components.Actions;
  if (Actions === false) return null;
  return Actions ? <Actions /> : <button type="submit">Submit</button>;
};

/**
 * Form-level message region, rendered inside the `<form>` above the fields.
 *
 * Surfaces a whole-form message from either channel, so a component binding gets a first-class
 * place to show it instead of rendering outside the form:
 *  - a server-action envelope `message` (`actionState.message`), with severity derived from the
 *    result's `success` flag (`error` / `success` / `info`); and
 *  - a client-side whole-form error the resolver / consumer produces as react-hook-form's `root`
 *    error (`form.setError('root', ...)`), always `error` severity.
 *
 * The envelope message takes precedence when both are present. Renders nothing when there is no
 * message, or when the `FormMessage` slot is set to `false`. Its own component subscribes to the
 * `root` error via `useFormState` so a client-side root error appears/clears reactively without
 * re-rendering the whole field grid.
 */
interface FormMessageSlotProps {
  config: FormConfig;
  control: Control<any>;
  /** Whole-form message from a server-action envelope, if any. */
  envelopeMessage?: string;
  /**
   * A message `RenderedForm` itself raised (today: the off-screen-errors notice). Lowest
   * precedence - it only ever speaks when nothing else has anything to say, which is the
   * situation it exists for.
   */
  localMessage?: string;
  /** Severity for the envelope message. */
  envelopeStatus?: FormMessageStatus;
}

const FormMessageSlot: React.FC<FormMessageSlotProps> = ({
  config,
  control,
  localMessage,
  envelopeMessage,
  envelopeStatus,
}) => {
  const { errors } = useFormState({ control });
  const rootError = errors?.root as FieldError | undefined;

  let message: string | undefined;
  let status: FormMessageStatus | undefined;
  if (envelopeMessage) {
    message = envelopeMessage;
    status = envelopeStatus ?? "error";
  } else if (rootError?.message) {
    message = rootError.message;
    status = "error";
  } else if (localMessage) {
    message = localMessage;
    status = "error";
  }

  if (!message) return null;

  const Component = config.components.FormMessage;
  if (Component === false) return null;

  const FormMessageComponent = Component || FormMessage;
  return <FormMessageComponent message={message} status={status} />;
};

// Helper to render all fields with layout
const renderAllFields = <T extends FormDefinition>(
  ctx: RenderContext<T>,
  showActions: boolean,
  serverErrors?: Record<string, string | string[]>
): ReactNode => {
  const LayoutContainer = ctx.config.components.LayoutContainer;
  const LayoutItem = ctx.config.components.LayoutItem;

  const fields = Object.keys(ctx.definition).map((key) => {
    const field = ctx.definition[key];
    const layoutProps = field.layout || {};

    const fieldElement = renderField(ctx, key as keyof T, {}, undefined, serverErrors);

    if (!LayoutItem) {
      return fieldElement;
    }

    return (
      <LayoutItem key={key} {...layoutProps}>
        {fieldElement}
      </LayoutItem>
    );
  });

  if (showActions) {
    const actionsElement = renderActions(ctx.config);
    if (actionsElement !== null) {
      if (LayoutItem) {
        fields.push(
          <LayoutItem key="actions">
            {actionsElement}
          </LayoutItem>
        );
      } else {
        fields.push(actionsElement);
      }
    }
  }

  if (LayoutContainer) {
    return <LayoutContainer>{fields}</LayoutContainer>;
  }

  return <>{fields}</>;
};

/**
 * Zero-config rendering for a form with a declared `sections` partition - what
 * `<RenderedForm />` renders instead of the flat `renderAllFields` grid when the hook
 * received `sections`.
 *
 * Structure, in declared order: each section wrapped in the `Section` component slot
 * (fragment by default), the *active* section's fields in their own `LayoutContainer`
 * (per-section, so each section is its own grid), and every *inactive* section's fields
 * as value mirrors. Fields listed in no section render after the sections, always as
 * controls, in definition order - the safe default for chrome fields - followed by the
 * actions. Without a `currentSection` every section is active: purely structural
 * grouping on one page.
 */
const renderSectionedFields = <T extends FormDefinition>(
  ctx: RenderContext<T>,
  sections: FormSections,
  showActions: boolean,
  serverErrors?: Record<string, string | string[]>
): ReactNode => {
  const LayoutContainer = ctx.config.components.LayoutContainer;
  const LayoutItem = ctx.config.components.LayoutItem;
  const SectionSlot = ctx.config.components.Section;

  const renderFieldWithLayout = (key: string) => {
    const field = ctx.definition[key];
    if (!field) return null;
    const fieldElement = renderField(ctx, key as keyof T, {}, undefined, serverErrors);
    if (!LayoutItem) return fieldElement;
    return (
      <LayoutItem key={key} {...(field.layout || {})}>
        {fieldElement}
      </LayoutItem>
    );
  };

  const sectionElements = Object.entries(sections).map(([name, fieldKeys]) => {
    // The declared map is membership's source of truth here; feeding the registry keeps
    // the sections API and the drift check working identically in both rendering modes.
    for (const key of fieldKeys) ctx.sectionRegistry.set(key, name);

    const active = isSectionActive(ctx.currentSection, name);

    const inner = active ? (
      LayoutContainer ? (
        <LayoutContainer>{fieldKeys.map(renderFieldWithLayout)}</LayoutContainer>
      ) : (
        <>{fieldKeys.map(renderFieldWithLayout)}</>
      )
    ) : (
      <>
        {fieldKeys.map((key) => (
          <FieldMirror key={key} ctx={ctx} definitionKey={key as keyof T} />
        ))}
      </>
    );

    if (!SectionSlot) return <React.Fragment key={name}>{inner}</React.Fragment>;
    return (
      <SectionSlot
        key={name}
        name={name}
        label={resolveSectionLabel(name, ctx.translationConfig)}
        active={active}
      >
        {inner}
      </SectionSlot>
    );
  });

  const sectionedKeys = new Set(Object.values(sections).flat());
  const unlisted = Object.keys(ctx.definition).filter((key) => !sectionedKeys.has(key));
  const unlistedElements =
    unlisted.length === 0 ? null : LayoutContainer ? (
      <LayoutContainer>{unlisted.map(renderFieldWithLayout)}</LayoutContainer>
    ) : (
      <>{unlisted.map(renderFieldWithLayout)}</>
    );

  const actionsElement = showActions ? renderActions(ctx.config) : null;

  return (
    <>
      {sectionElements}
      {unlistedElements}
      {actionsElement}
    </>
  );
};

const createRenderedField = <T extends FormDefinition>(
  ctxRef: React.MutableRefObject<RenderContext<T>>
): React.FC<RenderedFieldProps<T>> => {
  const Component: React.FC<RenderedFieldProps<T>> = ({
    name,
    render,
    disabled,
    options: runtimeOptions,
    label: runtimeLabel,
    placeholder: runtimePlaceholder,
    description: runtimeDescription,
    className,
    style,
    ...rest
  }) => {
    // Collect every explicitly-passed runtime override into a single bag.
    // Unset keys are omitted so they don't shadow definition defaults via
    // the merge order in renderField.
    const runtimeOverrides: Record<string, unknown> = { ...rest };
    if (disabled !== undefined) runtimeOverrides.disabled = disabled;
    if (runtimeOptions !== undefined) runtimeOverrides.options = runtimeOptions;
    if (runtimeLabel !== undefined) runtimeOverrides.label = runtimeLabel;
    if (runtimePlaceholder !== undefined) runtimeOverrides.placeholder = runtimePlaceholder;
    if (runtimeDescription !== undefined) runtimeOverrides.description = runtimeDescription;
    if (className !== undefined) runtimeOverrides.className = className;
    if (style !== undefined) runtimeOverrides.style = style;

    // Derive the same server-error map `renderAllFields` passes down, so a field placed by hand
    // in a custom `RenderedForm` layout still shows server-action errors on SSR / no-JS (before
    // the client setError effect runs). No-op without a server action or a successful result.
    const ctx = ctxRef.current;

    // Inside a `RenderedSection`: record membership (idempotent - re-writing the same
    // pair on every render is a no-op, which is what makes a write during render
    // tolerable here), and render as a value mirror when the section is inactive.
    const section = React.useContext(SectionContext);
    if (section) {
      ctx.sectionRegistry.set(String(name), section.name);
      if (!section.active) {
        return <FieldMirror ctx={ctx} definitionKey={name} />;
      }
    }

    const hasServerAction = !!ctx.formAction;
    const serverErrors =
      hasServerAction && ctx.actionState && ctx.actionState.success === false
        ? ctx.actionState.errors
        : undefined;

    return <>{renderField(ctx, name, runtimeOverrides, render, serverErrors)}</>;
  };
  Component.displayName = 'RenderedField';
  return Component;
};

/** Whether a section is the active one under the current `currentSection` value. */
const isSectionActive = (currentSection: string | undefined, name: string): boolean =>
  currentSection === undefined || currentSection === name;

const createRenderedSection = <T extends FormDefinition>(
  ctxRef: React.MutableRefObject<RenderContext<T>>
): React.FC<{ name: string; children?: ReactNode }> => {
  const Component: React.FC<{ name: string; children?: ReactNode }> = ({
    name,
    children,
  }) => {
    const ctx = ctxRef.current;
    ctx.seenSectionNames.add(name);
    const active = isSectionActive(ctx.currentSection, name);

    const body = (
      <SectionContext.Provider value={{ name, active }}>
        {children}
      </SectionContext.Provider>
    );

    const SectionSlot = ctx.config.components.Section;
    if (!SectionSlot) return body;
    return (
      <SectionSlot
        name={name}
        label={resolveSectionLabel(name, ctx.translationConfig)}
        active={active}
      >
        {body}
      </SectionSlot>
    );
  };
  Component.displayName = 'RenderedSection';
  return Component;
};

/**
 * Whether to emit development-only diagnostics.
 *
 * Written as a literal `process.env.NODE_ENV` read, deliberately: bundler substitution
 * (webpack's DefinePlugin, Vite/esbuild `define`) matches that exact member expression,
 * so reaching it through `globalThis` would dodge the replacement and leave the check
 * alive - and wrongly true - in a production browser bundle. The try/catch covers the
 * unbundled browser, where `process` does not exist and the bare reference throws;
 * defaulting to silent there is the safe side for a diagnostic. The ambient declaration
 * exists because this package ships no Node types.
 */
declare const process: { env: { NODE_ENV?: string } };

function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}

/**
 * Every declared field whose kind has no registered component, repeater cells included
 * (as `row.cell` paths). Such a field renders nothing where it is active - its mirror
 * still posts while it is off screen, but the active section, the one being edited, has
 * no control and so never reaches the post: every save silently keeps the stored value.
 * Nothing else catches it (the definition type-checks, the schema validates, the mirror
 * renders), so the hook checks it once, up front.
 */
function unregisteredKinds(
  definition: FormDefinition,
  fieldTypes: Record<string, unknown>,
  prefix = ''
): Array<{ path: string; type: string }> {
  const missing: Array<{ path: string; type: string }> = [];
  for (const [key, field] of Object.entries(definition)) {
    const path = `${prefix}${key}`;
    if (!fieldTypes[field.type]) missing.push({ path, type: field.type });
    if (field.fields) missing.push(...unregisteredKinds(field.fields, fieldTypes, `${path}.`));
  }
  return missing;
}

function describeUnregisteredKinds(missing: Array<{ path: string; type: string }>): string {
  const list = missing.map(({ path, type }) => `\`${path}\` (kind \`${type}\`)`).join(', ');
  return (
    `[use-form-definition] no component is registered for field${missing.length === 1 ? '' : 's'} ` +
    `${list}. A field without a component renders nothing where it is active, so its value ` +
    'never posts and every save keeps the stored one. Register a component for the kind ' +
    'under `components` in `createFormDefinitionHook` (or `config.fieldTypes` on the hook ' +
    'call), or remove the field from the definition.'
  );
}

/**
 * Declared fields holding a value in the model that the post does not carry. The DOM is
 * the payload (D5), so a control that renders no named native element, or a custom kind
 * with no mirror, posts nothing while the model says otherwise - and the server, seeing
 * absence, keeps the stored value. An empty model value is not a loss: the browser posts
 * nothing for an unchecked checkbox or an unselected radio group, and the server parses
 * absence correctly. Only a non-empty value that failed to reach the post counts.
 */
function declaredFieldsMissingFromPost(
  definition: FormDefinition,
  formData: FormData,
  values: Record<string, unknown>
): string[] {
  const missing: string[] = [];
  for (const [key, field] of Object.entries(definition)) {
    const name = getFieldName(key, field);
    if (formData.has(name)) continue;
    const value = values[name];
    const empty =
      value === undefined ||
      value === null ||
      value === '' ||
      value === false ||
      (Array.isArray(value) && value.length === 0);
    if (!empty) missing.push(name);
  }
  return missing;
}

function describeMissingFromPost(missing: string[]): string {
  const list = missing.map((name) => `\`${name}\``).join(', ');
  return (
    `[use-form-definition] the post carries no entry for field${missing.length === 1 ? '' : 's'} ` +
    `${list}, but the form holds a value for ${missing.length === 1 ? 'it' : 'each'}. The DOM ` +
    'is the payload: a control must render a named native form element carrying its value ' +
    '(or the kind must declare a `mirror` via `registerFieldType`) for the value to reach ' +
    'the server. As it stands, every save keeps the stored value.'
  );
}

/**
 * Whether a blocked submit would leave the user with nothing to look at.
 *
 * The submit gate validates the whole definition, but only part of the form may be on
 * screen. When nothing that failed is visible the button simply appears dead: no error
 * renders anywhere, and there is no feedback to act on. Any conditionally-rendered form can
 * reach this; a tabbed one hits it constantly.
 *
 * Two things make the obvious implementation wrong, both found by running it:
 *
 *  - **Which fields failed cannot come from `form.formState.errors`.** It lags by a render
 *    (`trigger()` publishes errors through react-hook-form's state subject, so a read taken
 *    straight after awaiting it returns the *previous* render's object - empty on a first
 *    submit), and it omits fields that were never registered, which is precisely the set at
 *    issue: a field on a page the user never opened was never rendered, so `trigger()`
 *    returns `false` while `errors` stays empty. Re-running the schema over the current
 *    values answers both, and cannot disagree with the gate - it is the same schema the
 *    resolver runs.
 *  - **`form.elements` is the right source for "is this on screen".** It enumerates every
 *    rendered control *including unchecked checkboxes*, which a `FormData` does not. It also
 *    includes `disabled` controls, which do not post - correct here, since a disabled field
 *    is still visible, but any use of this set as a *post* predicate would have to filter
 *    them.
 *
 * Two contract edges of the `form.elements` source, both inherited by custom controls:
 * a control counts as rendered only if it renders a **named native form element** (as
 * every built-in does) - a binding rendering bare divs through the `Controller` is
 * invisible to this test and would raise the notice spuriously next to its own visible
 * error; and names starting with `$` are treated as framework bookkeeping (React's
 * `$ACTION_*`), so definition keys must not start with `$`.
 */
function hasNoVisibleError<T extends FormDefinition>(
  definition: T,
  formElement: HTMLFormElement,
  form: UseFormReturn<any>
): boolean {
  const parsed = generateSchemaFromBuilder(definition).safeParse(form.getValues());
  if (parsed.success) return false;

  const rendered = new Set(
    Array.from(formElement.elements)
      // A section value mirror is in `form.elements` under its field's name but shows
      // the user nothing - exclude it, or an error on a mirrored field would suppress
      // the notice while rendering nowhere. The marker is what distinguishes a mirror
      // from a legitimate hidden transport input (the repeater's, e.g.), which does
      // represent a visible control.
      .filter(element => !(element as HTMLElement).hasAttribute('data-ufd-mirror'))
      .map(element => (element as HTMLInputElement).name)
      .filter(name => name && !name.startsWith('$'))
  );

  return !parsed.error.issues.some(issue => rendered.has(String(issue.path[0] ?? '')));
}

const createRenderedForm = <T extends FormDefinition>(
  ctxRef: React.MutableRefObject<RenderContext<T>>
): React.FC<RenderedFormProps<any>> => {
  const Component: React.FC<RenderedFormProps<any>> = ({
    onSubmit,
    serverAction: serverActionProp,
    onSuccess,
    onError,
    showActions = true,
    children,
    noValidate: noValidateProp,
    method: methodProp,
    currentSection,
    className,
    style,
  }) => {
    const ctx = ctxRef.current;
    const { form } = ctx;

    // Publish the active section for `RenderedSection`s (and the zero-config renderer)
    // to read - children execute after this body even though their elements were
    // constructed before it. The seen-set is per render pass, so clear it here.
    ctx.currentSection = currentSection;
    ctx.seenSectionNames.clear();

    // Development diagnostics for the partition. Effects run after the children have
    // rendered, so both the seen-set and the registry are populated for this pass.
    const warnedDiagnostics = useRef<Set<string>>(new Set());
    useEffect(() => {
      if (!isDevelopment()) return;
      const warned = warnedDiagnostics.current;

      // A `currentSection` matching no section mirrors everything - coherent, but a
      // typo renders a form with no visible fields, so say so.
      if (currentSection !== undefined) {
        const known = new Set([
          ...ctx.seenSectionNames,
          ...(ctx.sections ? Object.keys(ctx.sections) : []),
        ]);
        const key = `unmatched:${currentSection}`;
        if (known.size > 0 && !known.has(currentSection) && !warned.has(key)) {
          warned.add(key);
          console.warn(
            `[use-form-definition] currentSection="${currentSection}" matches no section ` +
              `(known: ${[...known].join(', ')}). Every section is rendering as value ` +
              'mirrors, so the form shows no fields.'
          );
        }
      }

      // Declared map + JSX sections together: warn when they disagree about a field.
      if (ctx.sections) {
        for (const [fieldKey, observed] of ctx.sectionRegistry) {
          const declared = sectionOf(ctx.sections, fieldKey);
          const key = `drift:${fieldKey}`;
          if (declared !== observed && !warned.has(key)) {
            warned.add(key);
            console.warn(
              `[use-form-definition] field \`${fieldKey}\` rendered in section ` +
                `"${observed}" but the \`sections\` option declares it ${
                  declared ? `in "${declared}"` : 'in no section'
                }. The declared map drives the sections API; the JSX drives rendering - ` +
                'they should agree.'
            );
          }
        }
      }
    });

    // A server action may be configured on the hook (preferred - also exposes `actionState`
    // and re-populates fields on no-JS error round-trips) or passed here as a prop (back-compat).
    // We always call useActionState once so hooks stay unconditional; when the hook option is
    // in play, this local instance is inert (never dispatched).
    const [propActionState, propFormAction, propIsPending] = useActionState(
      serverActionProp ?? NOOP_SERVER_ACTION,
      null
    );
    const usingHookAction = !!ctx.serverAction;
    const usingPropAction = !usingHookAction && !!serverActionProp;
    const actionState = usingHookAction ? ctx.actionState : usingPropAction ? propActionState : null;
    const formAction = usingHookAction ? ctx.formAction : usingPropAction ? propFormAction : null;
    const hasServerAction = !!formAction;

    // Push server validation errors onto react-hook-form (so it owns + clears them on the
    // client) and fire success/error callbacks. Effects don't run during SSR / without JS -
    // there, errors are rendered straight from `actionState` (see `serverErrors` below).
    // The off-screen-errors notice is ufd's OWN message, held in local state rather than
    // pushed into react-hook-form as a `root` error. It was a root error first, and that was
    // wrong twice over: `formState` is a read-subscribed proxy, so the handler could not
    // reliably tell whether its own notice was still standing; and - found in a browser, not
    // in review - a lingering root error combined with a router navigation left the next
    // submit dead, the handler never firing at all. Neither happened alone. It is also
    // simply the more honest model: this is not a validation error on a field, it is the
    // form telling the user where to look.
    const [offscreenNotice, setOffscreenNotice] = useState<string | null>(null);
    const lastSeenStateRef = useRef<FormActionResult<any> | null>(null);
    useEffect(() => {
      if (!actionState || actionState === lastSeenStateRef.current) return;
      lastSeenStateRef.current = actionState;

      if (actionState.success === false && actionState.errors) {
        Object.entries(actionState.errors).forEach(([errKey, value]) => {
          const errField = (ctx.definition as Record<string, FormFieldDefinition>)[errKey];
          const errName = errField ? getFieldName(errKey, errField) : errKey;
          form.setError(errName as any, {
            type: 'server',
            message: Array.isArray(value) ? value.join(', ') : value,
          });
        });
      }

      if (actionState.success === true) {
        onSuccess?.(actionState);
      } else if (actionState.success === false) {
        onError?.(actionState);
      }
    }, [actionState, onSuccess, onError]);

    // The error map rendered directly into the fields. On the client this is the same data the
    // effect pushes into RHF, so once RHF holds it (as a `type: 'server'` error) the Controller
    // shows that copy - and RHF clears it when the user fixes the field.
    const serverErrors =
      hasServerAction && actionState && actionState.success === false ? actionState.errors : undefined;

    // Client-side submit handler (no server action). Validation runs even without an
    // `onSubmit`, so submitting still marks the fields and shows their errors instead
    // of silently doing nothing.
    const handleClientSubmit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      // Same capture as the server path: `currentTarget` reads back as null once the event
      // finishes dispatching, and handleSubmit's callbacks run after an async validation
      // pass.
      const formElement = e.currentTarget;
      form.handleSubmit(
        async (data) => {
          setOffscreenNotice(null);
          await (onSubmit ?? (() => {}))(data);
        },
        // The dead-button failure is not server-action-specific: the resolver validates
        // the whole definition here too, so every failing field can be off-screen (or
        // never registered at all), leaving the user with nothing to look at.
        () => {
          setOffscreenNotice(
            hasNoVisibleError(ctx.definition, formElement, form)
              ? ctx.translateValidation('errorsNotVisible')
              : null
          );
        }
      )(e);
    };

    // Server-action submit handler (used with JS). We keep `action={formAction}` on the form so
    // that *without* JS the browser posts natively to the server-action endpoint (progressive
    // enhancement). *With* JS we intercept here, `preventDefault()` (which tells React to skip its
    // own `<form action>` handling), run react-hook-form's client validation, and - if it passes -
    // dispatch the action ourselves. Going through React's `<form action>` lifecycle on the client
    // would reset the form's DOM after the action, which desyncs controlled fields (a <select>
    // snaps back to its first option while RHF still holds the chosen value); dispatching manually
    // avoids that. The client-validation gate is a plain `await form.trigger()` here, not a
    // `requestSubmit()` re-entry, so there's no "needs two clicks" pitfall; the server still
    // re-validates as the source of truth.
    const handleServerSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!formAction) return;
      // Captured before the `await` below: `currentTarget` is only valid while the event is
      // being dispatched and reads back as null afterwards, so anything needing the form
      // element after validation has to hold its own reference.
      const formElement = e.currentTarget;
      const formData = new globalThis.FormData(formElement);
      // Drop React's progressive-enhancement bookkeeping inputs ($ACTION_REF_*, $ACTION_*, ...) so
      // they don't leak into the validated data or the echoed `values`.
      for (const fieldKey of Array.from(formData.keys())) {
        if (fieldKey.startsWith('$ACTION')) formData.delete(fieldKey);
      }
      const valid = await form.trigger();
      setOffscreenNotice(
        !valid && hasNoVisibleError(ctx.definition, formElement, form)
          ? ctx.translateValidation('errorsNotVisible')
          : null
      );
      if (!valid) return;
      // The post is about to go out: in development, say so if it is missing a value the
      // model holds. Once per field, so a form saved repeatedly does not repeat itself.
      if (isDevelopment()) {
        const missing = declaredFieldsMissingFromPost(ctx.definition, formData, form.getValues()).filter(
          (name) => !warnedDiagnostics.current.has(`post:${name}`)
        );
        if (missing.length > 0) {
          for (const name of missing) warnedDiagnostics.current.add(`post:${name}`);
          console.warn(describeMissingFromPost(missing));
        }
      }
      // The `await` above left React's transition scope, so dispatch inside startTransition to
      // keep `isPending` working / avoid the "called outside a transition" warning.
      startTransition(() => formAction(formData));
    };

    const formProps: React.FormHTMLAttributes<HTMLFormElement> = { className, style };
    const noValidate = noValidateProp ?? ctx.config.noValidate;
    if (noValidate) formProps.noValidate = true;
    if (hasServerAction) {
      // React owns the method here: it renders its own multipart POST to the action
      // endpoint. Setting `method` would fight that, so `methodProp` is deliberately ignored.
      formProps.action = formAction as React.FormHTMLAttributes<HTMLFormElement>['action'];
      formProps.onSubmit = handleServerSubmit;
    } else {
      formProps.onSubmit = handleClientSubmit;
      // A client-only form has no `action`, so the browser's default method applies to any
      // submit that lands BEFORE hydration - and that default is GET, which serializes every
      // field into the URL. For a sign-in or password-reset form that is a credential leak
      // into browser history, the `Referer` header and access logs. POST by default; a form
      // that genuinely wants a query string (search, filters) opts in with `method="get"`.
      formProps.method = methodProp ?? 'post';
    }

    const FormComponent = ctx.config.components.Form;
    // A custom layout (`children`) replaces the automatic field grid, but keeps every bit of
    // form wiring above (action, onSubmit, setError effect, callbacks). Fields inside compose
    // from the hook's `RenderedField`, which reads the same server errors from the render
    // context, so SSR / no-JS server-side errors still render per field.
    const formContent =
      children !== undefined
        ? children
        : ctx.sections
          ? renderSectionedFields(ctx, ctx.sections, showActions, serverErrors)
          : renderAllFields(ctx, showActions, serverErrors);

    // The whole-form message region sits inside the form, above the fields, in both the
    // automatic-grid and custom-layout modes. It carries the server-action envelope `message`
    // (severity from the result's `success` flag) and falls back to a react-hook-form `root`
    // error; it renders nothing when neither is present.
    const envelopeMessage = actionState?.message;
    const envelopeStatus: FormMessageStatus | undefined = actionState
      ? actionState.success === false
        ? "error"
        : actionState.success === true
          ? "success"
          : "info"
      : undefined;
    const formMessage = (
      <FormMessageSlot
        config={ctx.config}
        control={form.control}
        localMessage={offscreenNotice ?? undefined}
        envelopeMessage={envelopeMessage}
        envelopeStatus={envelopeStatus}
      />
    );

    if (FormComponent) {
      return (
        <FormComponent {...formProps}>
          {formMessage}
          {formContent}
        </FormComponent>
      );
    }

    return (
      <form {...formProps}>
        {formMessage}
        {formContent}
      </form>
    );
  };
  Component.displayName = 'RenderedForm';
  return Component;
};

/**
 * Form definition hook with automatic type inference
 *
 * This hook uses TypeScript's type inference and Zod's schema typing
 * for full type safety.
 *
 * @example Simple usage (hook manages useForm internally)
 * ```typescript
 * const { form, RenderedField, RenderedForm } = useFormDefinition(definition);
 *
 * // Render individual fields
 * <RenderedField name="email" />
 * <RenderedField name="password" />
 *
 * // Or render the entire form
 * <RenderedForm onSubmit={handleSubmit} />
 * ```
 *
 * @example Server action with progressive enhancement
 * ```typescript
 * const { RenderedForm, actionState } = useFormDefinition(definition, {
 *   serverAction: submitFeedback,
 * });
 *
 * if (actionState?.success) return <SuccessView result={actionState} />;
 * return <RenderedForm />; // <form action> is wired automatically
 * ```
 *
 * @example Full control (you manage useForm)
 * ```typescript
 * const form = useForm<FormData>(generateOptions(definition));
 * const { RenderedField } = useFormDefinition(definition, { form });
 * ```
 */
export const useFormDefinition = <
  T extends FormDefinition,
  Extras extends Record<string, unknown> = Record<string, unknown>,
>(
  definition: T,
  options: UseFormDefinitionOptions<T> = {}
): UseFormDefinitionReturn<T, z.infer<ReturnType<typeof generateSchema<T>>>, Extras> => {
  const {
    form: formOption,
    defaultValues: defaultValuesOption,
    sections: sectionsOption,
    config: userConfig,
    serverAction,
  } = options;

  // A consumer-supplied form is constructed before this hook runs, so the no-JS
  // re-population merge below cannot reach it - the user silently loses what they typed on
  // a validation-error round trip without JS. Silent, path-specific and invisible in
  // development, so it gets a warning rather than a doc line alone. Once per hook
  // instance - the condition is stable across renders, and renders happen per keystroke.
  const warnedFormWithServerAction = useRef(false);
  if (isDevelopment() && formOption && serverAction && !warnedFormWithServerAction.current) {
    warnedFormWithServerAction.current = true;
    console.warn(
      '[use-form-definition] `form` and `serverAction` were both provided. The no-JS ' +
        'validation-error round trip re-populates fields through the form this hook ' +
        'constructs, so passing your own form disables it. If you only need starting ' +
        'values, pass `defaultValues` instead and drop `form`.'
    );
  }

  // A field-level `name` override is documented-but-broken (see the `name` deprecation in
  // the CHANGELOG:
  // the field gets two react-hook-form slots, client validation fails with the field
  // filled in, and the server reports it missing) and is deprecated ahead of removal. The
  // JSDoc says so; this makes it visible at runtime, since a broken form otherwise reads
  // as a server bug.
  const warnedFieldNameOverride = useRef(false);
  if (isDevelopment() && !warnedFieldNameOverride.current) {
    const renamed = Object.entries(definition)
      .filter(([key, field]) => field.name && field.name !== key)
      .map(([key]) => key);
    if (renamed.length > 0) {
      warnedFieldNameOverride.current = true;
      console.warn(
        `[use-form-definition] field${renamed.length === 1 ? '' : 's'} ` +
          `${renamed.map((key) => `\`${key}\``).join(', ')} set${renamed.length === 1 ? 's' : ''} ` +
          'a `name` different from the definition key. The `name` override is deprecated: ' +
          'it has never worked (the field cannot pass validation and the server reports ' +
          'it missing) and is slated for removal. Drop the override and use the ' +
          'definition key as the field name.'
      );
    }
  }

  // Memoize schema generation - this is expensive and should only happen when definition changes
  const schema = useMemo(() => generateSchemaFromBuilder(definition), [definition]);

  // Server action state. Called unconditionally (with a no-op action when no `serverAction`
  // is configured) so we can both expose `actionState` and feed the last-submitted values
  // back into useForm() on a no-JS validation-error round-trip. Must run before useForm().
  const [rawActionState, rawFormAction, rawIsPending] = useActionState(
    serverAction ?? NOOP_SERVER_ACTION,
    null
  );
  const actionState = serverAction ? rawActionState : null;
  const isPending = serverAction ? rawIsPending : false;
  const formAction = serverAction ? rawFormAction : null;

  // Generate form options for internal useForm
  const generatedOptions = useMemo(() => {
    type InferredType = z.infer<typeof schema>;

    // Three tiers, widest first: the definition's own generated defaults, the consumer's
    // starting values (an edit form's stored record), then - on a no-JS validation-error
    // round-trip, where the page re-renders server-side with the action result in hand  - 
    // the submitted raw values, so the fields re-populate with what the user typed rather
    // than resetting to the record. (The last tier is a no-op on the client: useForm only
    // reads defaultValues at mount, and RHF already holds whatever the user typed.)
    // An inline `defaultValues` literal defeats this memo (fresh identity per render);
    // harmless for the same mount-only reason, so not worth a deep-compare.
    const baseDefaults = {
      ...generateDefaultValues(definition),
      ...(defaultValuesOption ?? {}),
    };
    const mergedDefaults =
      actionState && actionState.success === false && actionState.values
        ? { ...baseDefaults, ...actionState.values }
        : baseDefaults;

    return {
      resolver: zodResolver(schema),
      defaultValues: mergedDefaults as DefaultValues<InferredType>,
      // With a server action, give live client-side feedback before submit (submitting would
      // otherwise round-trip to the server just to surface errors).
      ...(serverAction ? { mode: 'onTouched' as const } : {}),
    };
  }, [schema, definition, actionState, serverAction, defaultValuesOption]);

  // Create internal form if none provided
  // Note: This must be called unconditionally to satisfy React's rules of hooks
  const internalForm = useForm(generatedOptions);

  // Use provided form or internal form
  const form = formOption ?? internalForm;

  // Live derivation for `deriveFrom` fields: while a target is *unclaimed*, every change to
  // its source field mirrors `transform(sourceValue)` into it. "Unclaimed" means empty or
  // still equal to the last value derivation wrote (tracked below) - so an edit form's
  // stored value is never overwritten (it differs from any derivation and the field isn't
  // empty), a user edit breaks the equality and stops derivation, and a user *clearing*
  // the field re-arms it. Derived writes use `shouldDirty: false`, so only user edits mark
  // the target dirty. Server code never runs this - `deriveFrom` is inert there.
  const lastDerivedRef = useRef<Record<string, unknown>>({});
  useEffect(() => {
    // sourceName -> targets deriving from it (a source may feed several targets)
    const targetsBySource = new Map<
      string,
      Array<{ targetName: string; field: FormFieldDefinition }>
    >();
    for (const targetKey of Object.keys(definition)) {
      const field = definition[targetKey];
      if (typeof field.deriveFrom !== "string" || field.deriveFrom === "") continue;
      const sourceField = definition[field.deriveFrom];
      if (!sourceField) {
        console.warn(
          `deriveFrom: field "${targetKey}" derives from "${field.deriveFrom}", which is not in the definition`
        );
        continue;
      }
      const sourceName = getFieldName(field.deriveFrom, sourceField);
      const targetName = getFieldName(targetKey, field);
      if (sourceName === targetName) {
        console.warn(`deriveFrom: field "${targetKey}" cannot derive from itself`);
        continue;
      }
      const targets = targetsBySource.get(sourceName) ?? [];
      targets.push({ targetName, field });
      targetsBySource.set(sourceName, targets);
    }
    if (targetsBySource.size === 0) return;

    const subscription = form.watch((_values, { name }) => {
      if (!name) return;
      const targets = targetsBySource.get(name);
      if (!targets) return;
      const sourceValue = form.getValues(name as any);
      for (const { targetName, field } of targets) {
        const currentValue = form.getValues(targetName as any);
        const lastDerived = lastDerivedRef.current[targetName];
        const isEmpty =
          currentValue === undefined || currentValue === null || currentValue === "";
        if (!isEmpty && !Object.is(currentValue, lastDerived)) continue; // claimed by the user (or stored)
        const derived = resolveDeriveTransform(field)(sourceValue);
        lastDerivedRef.current[targetName] = derived;
        if (Object.is(derived, currentValue)) continue;
        // Re-validate only when the target already shows an error, so e.g. a stale
        // "required" error from an earlier blur clears as derivation fills the field.
        const shouldValidate = !!form.getFieldState(targetName as any).error;
        form.setValue(targetName as any, derived as any, {
          shouldDirty: false,
          shouldValidate,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [definition, form]);

  // Memoize config to prevent unnecessary re-renders
  const config = useMemo(
    () => createFormConfig(userConfig || {}),
    [userConfig]
  );

  // A declared kind with no component fails loudly at hook creation: a thrown error in
  // development, a warning once in production (a production form should still render
  // what it can). Only once the hook renders at all - the bare `useFormDefinition` with
  // no components registered is the headless, schema-only use, where nothing renders
  // and nothing can go missing.
  const warnedUnregisteredKinds = useRef(false);
  useMemo(() => {
    if (Object.keys(config.fieldTypes).length === 0) return;
    const missing = unregisteredKinds(definition, config.fieldTypes);
    if (missing.length === 0) return;
    if (isDevelopment()) throw new Error(describeUnregisteredKinds(missing));
    if (!warnedUnregisteredKinds.current) {
      warnedUnregisteredKinds.current = true;
      console.warn(describeUnregisteredKinds(missing));
    }
  }, [definition, config.fieldTypes]);

  // Memoize translation config
  const translationConfig = useMemo(
    () => normalizeTranslationConfig(config.translation),
    [config.translation]
  );

  // Memoize validation translator for error messages
  const translateValidation = useMemo(
    () => createValidationTranslator(translationConfig.validation, translationConfig.function),
    [translationConfig.validation, translationConfig.function]
  );

  // Section bookkeeping must survive the per-render ctx rebuild below, so both live on
  // their own refs: the registry accumulates observed membership across renders, and the
  // seen-set is cleared per pass by RenderedForm.
  const sectionRegistryRef = useRef<Map<string, string>>(new Map());
  const seenSectionNamesRef = useRef<Set<string>>(new Set());

  // Per-render render context, read by the (stable) RenderedField / RenderedForm components.
  const ctxRef = useRef<RenderContext<T>>(undefined as unknown as RenderContext<T>);
  ctxRef.current = {
    definition,
    form,
    config,
    translationConfig,
    translateValidation,
    serverAction,
    actionState,
    formAction,
    isPending,
    sections: sectionsOption,
    // RenderedForm writes the real value from its prop during its render; between
    // forms (or without one) there is no active section.
    currentSection: undefined,
    sectionRegistry: sectionRegistryRef.current,
    seenSectionNames: seenSectionNamesRef.current,
  };

  // Create the rendered components exactly once per hook instance (stable identities).
  const componentsRef = useRef<{
    RenderedField: React.FC<RenderedFieldProps<T>>;
    RenderedForm: React.FC<RenderedFormProps<any>>;
    RenderedSection: React.FC<{ name: string; children?: ReactNode }>;
  }>(undefined as unknown as {
    RenderedField: React.FC<RenderedFieldProps<T>>;
    RenderedForm: React.FC<RenderedFormProps<any>>;
    RenderedSection: React.FC<{ name: string; children?: ReactNode }>;
  });
  if (!componentsRef.current) {
    componentsRef.current = {
      RenderedField: createRenderedField(ctxRef),
      RenderedForm: createRenderedForm(ctxRef),
      RenderedSection: createRenderedSection(ctxRef),
    };
  }
  const RenderedSection = componentsRef.current.RenderedSection;
  // The runtime component filters extras via each field type's `additionalProps`
  // allowlist; `Extras` only re-labels its prop type for compile-time checking.
  const RenderedField = componentsRef.current.RenderedField as React.FC<
    RenderedFieldProps<T, Extras>
  >;
  const RenderedForm = componentsRef.current.RenderedForm as React.FC<
    RenderedFormProps<z.infer<ReturnType<typeof generateSchema<T>>>>
  >;

  // Schema and related utilities - reuse memoized schema
  const schemaGenerator = () => schema;
  const optionsGenerator = () => {
    type InferredType = z.infer<typeof schema>;

    return {
      resolver: zodResolver(schema),
      defaultValues: generateDefaultValues(definition) as DefaultValues<InferredType>,
      _types: {} as InferredType,
    };
  };

  // Delegates rather than re-implementing, so this and `generateDataValidator` can never
  // disagree about what a posted FormData means - two validators for one definition is
  // exactly the sort of divergence that costs an afternoon six months later. Memoized
  // because the validator regenerates the schema, the expensive step this hook otherwise
  // caches.
  const validateData = useMemo(() => generateDataValidator(definition), [definition]);

  // Default Form component (simple form element)
  const DefaultForm: React.FC<React.FormHTMLAttributes<HTMLFormElement>> = (props) => (
    <form {...props} />
  );

  // Default Actions component (renders a submit button)
  const DefaultActions: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
    <button type="submit" {...props}>
      {props.children || 'Submit'}
    </button>
  );

  // Get configured components or use defaults
  const FormComponent = config.components.Form || DefaultForm;
  const ActionsComponent = config.components.Actions || DefaultActions;
  // `false` means the consumer opted out of the region entirely - return null rather than
  // handing back a component they explicitly disabled.
  const FormMessageComponent =
    config.components.FormMessage === false
      ? null
      : config.components.FormMessage || FormMessage;
  const LayoutContainerComponent = config.components.LayoutContainer || null;
  const LayoutItemComponent = config.components.LayoutItem || null;

  // The sections API: membership questions answered from the declared map when one was
  // given, else from render-observed membership (complete after first paint - every
  // section's every field renders on every pass, as control or as mirror). Navigation
  // stays the app's; this only answers questions.
  const sectionsApi = useMemo<SectionsApi>(() => {
    const membershipOf = (): FormSections<any> => {
      if (sectionsOption) return sectionsOption;
      const observed: Record<string, string[]> = {};
      for (const [fieldKey, sectionName] of sectionRegistryRef.current) {
        (observed[sectionName] ??= []).push(fieldKey);
      }
      return observed;
    };
    return {
      fields: (name) => [...(membershipOf()[name] ?? [])],
      of: (fieldKey) => sectionOf(membershipOf(), fieldKey),
      withErrors: (errors) => sectionsWithErrors(membershipOf(), errors),
      validate: async (name) => {
        const fields = membershipOf()[name];
        if (!fields || fields.length === 0) return true;
        return form.trigger(fields as any, { shouldFocus: true });
      },
    };
  }, [sectionsOption, form]);

  return {
    form,
    RenderedField,
    RenderedForm,
    RenderedSection,
    Form: FormComponent,
    Actions: ActionsComponent,
    FormMessage: FormMessageComponent,
    LayoutContainer: LayoutContainerComponent,
    LayoutItem: LayoutItemComponent,
    actionState,
    isPending,
    formAction,
    validateData,
    sections: sectionsApi,
    generateSchema: schemaGenerator,
    generateOptions: optionsGenerator,

    // Type helper for consumers
    _types: {} as z.infer<ReturnType<typeof generateSchema<T>>>,
  };
};
