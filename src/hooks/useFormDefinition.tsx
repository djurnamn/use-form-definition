import React, { ReactNode, useMemo, FormEvent, useEffect, useRef, useActionState, startTransition } from "react";
import { Controller, FieldValues, UseFormReturn, DefaultValues, useForm, FieldError } from "react-hook-form";
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
import { generateSchema as generateSchemaFromBuilder } from "../core/schema/schema-builder";
import { createFormConfig } from "../configuration/createFormConfig";
import {
  getFieldName,
  generateDefaultValues,
  getDefaultValueForField,
  normalizeTranslationConfig,
  resolveTranslatableValue,
  resolveSelectOptions,
  createValidationTranslator,
  type NormalizedTranslationConfig,
} from "../core/utilities";
import Field from "../components/Field";

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
 * Resolved field presentation data (label, placeholder, options)
 * Used to avoid duplicating translation resolution logic
 */
interface ResolvedFieldData {
  label: string | undefined;
  placeholder: string | undefined;
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

  const options = resolveSelectOptions(
    field.options,
    translationConfig.options,
    translationConfig.function
  );

  return { label, placeholder, options };
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
  type: true,
  fields: true,
  hideHeader: true,
  disableAddRow: true,
  disableRemoveRow: true,
  layout: true,
  options: true,
  readOnly: true,
  defaultValue: true,
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

export type { NestedFieldRenderer };

/**
 * Creates a nested field renderer function that uses the form config
 * to render fields consistently with the parent form
 */
const createNestedFieldRenderer = (
  config: FormConfig,
  translateValidation: (key: string, options?: Record<string, any>) => string
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

    const fieldProps = {
      name: namePrefix || fieldKey,
      value,
      onChange: wrappedOnChange,
      error,
      ...fieldDefinition,
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
   */
  form?: UseFormReturn<any>;
  config?: Partial<FormConfig>;
  /**
   * Server action for the form (e.g. a Next.js Server Action).
   *
   * When provided, `useFormDefinition` manages a `useActionState()` for it:
   * - `<RenderedForm>` wires it via `<form action={...}>`, so the form submits and is
   *   validated server-side **without JavaScript** (progressive enhancement). With JS,
   *   react-hook-form layers client-side validation on top (the internal form uses
   *   `mode: 'onTouched'` so the user gets feedback before submitting).
   * - The returned `actionState` is the latest result — render your success / result view
   *   from it (it survives SSR / no-JS, unlike an `onSuccess` callback).
   * - The returned `isPending` reflects the in-flight submission.
   *
   * The server action should return display-ready (and, for i18n, already-translated)
   * error strings in `errors` — `<RenderedForm>` shows them as-is. To re-populate the
   * fields on a no-JS validation-error round-trip, also return `values` (e.g.
   * `Object.fromEntries(formData.entries())`).
   *
   * This is also accepted as a prop on `<RenderedForm>` for backwards compatibility, but
   * passing it here is preferred — only the hook option exposes `actionState`.
   */
  serverAction?: ServerAction<z.infer<ReturnType<typeof generateSchema<T>>>>;
}

/**
 * Props for the RenderedField component
 *
 * The standard runtime overrides (`disabled`, `options`, `label`, `placeholder`,
 * `className`, `style`) are typed and override the definition's default.
 *
 * Any other prop is forwarded to the field component, but only if its key is
 * declared in the field type's `additionalProps` config (otherwise the library
 * filters it out). Full type-checking of forwarded extras is planned for a
 * future minor release.
 */
export interface RenderedFieldProps<T extends FormDefinition> {
  /** The field name from the form definition */
  name: keyof T & string;
  /** Runtime override: disable the field (overrides any definition default) */
  disabled?: boolean;
  /** Runtime override: select options (replaces v1's `optionsCallback` — load async data in your component and pass it here) */
  options?: SelectOption[];
  /** Runtime override: label string (or `false` to hide). Bypasses translation. */
  label?: string | boolean;
  /** Runtime override: placeholder string (or `false` to hide). Bypasses translation. */
  placeholder?: string | boolean;
  /** Runtime override: forwarded to the field component */
  className?: string;
  /** Runtime override: forwarded to the field component */
  style?: React.CSSProperties;
  /** Custom render function for the field (escape hatch — receives the raw field definition) */
  render?: (field: T[keyof T]) => ReactNode;
  /** Any additional runtime prop forwarded to the field component (subject to the field type's `additionalProps` allowlist) */
  [key: string]: unknown;
}

/**
 * Props for the RenderedForm component
 */
export interface RenderedFormProps<TFormData extends FieldValues> {
  /** Submit handler receiving validated form data (client-side). Ignored when a server action is configured. */
  onSubmit?: (data: TFormData) => void | Promise<void>;
  /**
   * Server action for form submission — an alternative to passing `serverAction` to
   * `useFormDefinition()`. The hook option is preferred (it also exposes `actionState`);
   * passing it here keeps it working but `actionState` won't be available from the hook.
   */
  serverAction?: ServerAction<TFormData>;
  /** Callback when the server action succeeds (client-side only — for SSR/no-JS, render from the hook's `actionState`). */
  onSuccess?: (result: FormActionResult<TFormData>) => void;
  /** Callback when the server action fails (client-side only). */
  onError?: (result: FormActionResult<TFormData>) => void;
  /** Whether to show the actions slot (default: true) */
  showActions?: boolean;
  /**
   * Set `noValidate` on the `<form>`, disabling the browser's built-in HTML5 constraint
   * validation. Overrides the hook/config `noValidate` for this form.
   */
  noValidate?: boolean;
  /** Additional props to pass to the form element */
  className?: string;
  /** Additional props to pass to the form element */
  style?: React.CSSProperties;
}

export interface UseFormDefinitionReturn<T extends FormDefinition, TFormData extends FieldValues = z.infer<ReturnType<typeof generateSchema<T>>>> {
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
  RenderedField: React.FC<RenderedFieldProps<T>>;

  /**
   * Component to render the entire form with all fields
   * @example <RenderedForm onSubmit={handleSubmit} />
   */
  RenderedForm: React.FC<RenderedFormProps<TFormData>>;

  /**
   * Configured Form wrapper component for custom layouts
   * Falls back to a basic <form> element if not configured
   */
  Form: React.ComponentType<React.FormHTMLAttributes<HTMLFormElement>>;

  /**
   * Configured Actions component (form action area — submit button(s), cancel, etc.)
   * Falls back to a basic <button type="submit"> if not configured
   */
  Actions: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>;

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
   * `null` if no `serverAction` was provided. Mostly internal — `<RenderedForm>` wires it for you.
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
// recreating those components — and remounting the whole form subtree — every time the parent
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
}

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

    const { label: fieldLabel, placeholder: fieldPlaceholder, options: resolvedOptions } =
      resolveFieldPresentationData(field, key, translationConfig);

    const fieldProps = {
      ...field,
      name: fieldName,
      label: fieldLabel,
      placeholder: fieldPlaceholder,
      ...(resolvedOptions ? { options: resolvedOptions } : {}),
      ...runtimeOverrides,
    };

    const componentProps = filterLibraryProps(fieldProps, componentConfig.additionalProps);

    if (componentConfig.injectFormConfig) {
      componentProps.__formConfig = config;
      componentProps.__renderNestedField = createNestedFieldRenderer(config, translateValidation);
      componentProps.__getDefaultValueForField = getDefaultValueForField;
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
        // - react-hook-form client errors carry a JSON-encoded message → parse + translate it
        // - errors set from a server action result are tagged `type: 'server'` and already
        //   contain a display-ready string → show verbatim (don't re-translate)
        // - if there's no RHF error yet, fall back to the raw server error map (this is the
        //   path that runs during SSR / without JS, before the setError effect can run)
        let displayError: FieldError | undefined;
        if (fieldState.error) {
          displayError =
            fieldState.error.type === 'server'
              ? fieldState.error
              : {
                  ...fieldState.error,
                  message: fieldState.error.message
                    ? parseValidationError(fieldState.error.message, translateValidation)
                    : undefined,
                };
        } else {
          const raw = serverErrors?.[key] ?? serverErrors?.[fieldName];
          if (raw) {
            displayError = {
              type: 'server',
              message: Array.isArray(raw) ? raw.join(', ') : raw,
            } as FieldError;
          }
        }

        const { label: fieldLabel, placeholder: fieldPlaceholder, options: resolvedOptions } =
          resolveFieldPresentationData(field, key, translationConfig);

        const fieldProps = {
          ...field,
          ...controllerField,
          label: fieldLabel,
          placeholder: fieldPlaceholder,
          error: displayError,
          ...(resolvedOptions ? { options: resolvedOptions } : {}),
          ...runtimeOverrides,
        };

        const componentProps = filterLibraryProps(fieldProps, componentConfig.additionalProps);

        if (componentConfig.injectFormConfig) {
          componentProps.__formConfig = config;
          componentProps.__renderNestedField = createNestedFieldRenderer(config, translateValidation);
          componentProps.__getDefaultValueForField = getDefaultValueForField;
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
// - `Actions: false` is an explicit opt-out — no actions rendered at all.
// - `Actions: <Component>` (truthy) renders the registered component.
// - `Actions: undefined` (not configured) renders a default <button type="submit">.
const renderActions = (config: FormConfig): ReactNode => {
  const Actions = config.components.Actions;
  if (Actions === false) return null;
  return Actions ? <Actions /> : <button type="submit">Submit</button>;
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
    if (className !== undefined) runtimeOverrides.className = className;
    if (style !== undefined) runtimeOverrides.style = style;

    return <>{renderField(ctxRef.current, name, runtimeOverrides, render)}</>;
  };
  Component.displayName = 'RenderedField';
  return Component;
};

const createRenderedForm = <T extends FormDefinition>(
  ctxRef: React.MutableRefObject<RenderContext<T>>
): React.FC<RenderedFormProps<any>> => {
  const Component: React.FC<RenderedFormProps<any>> = ({
    onSubmit,
    serverAction: serverActionProp,
    onSuccess,
    onError,
    showActions = true,
    noValidate: noValidateProp,
    className,
    style,
  }) => {
    const ctx = ctxRef.current;
    const { form } = ctx;

    // A server action may be configured on the hook (preferred — also exposes `actionState`
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
    // client) and fire success/error callbacks. Effects don't run during SSR / without JS —
    // there, errors are rendered straight from `actionState` (see `serverErrors` below).
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
    // shows that copy — and RHF clears it when the user fixes the field.
    const serverErrors =
      hasServerAction && actionState && actionState.success === false ? actionState.errors : undefined;

    // Client-side submit handler (no server action)
    const handleClientSubmit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (onSubmit) {
        form.handleSubmit(onSubmit)(e);
      }
    };

    // Server-action submit handler (used with JS). We keep `action={formAction}` on the form so
    // that *without* JS the browser posts natively to the server-action endpoint (progressive
    // enhancement). *With* JS we intercept here, `preventDefault()` (which tells React to skip its
    // own `<form action>` handling), run react-hook-form's client validation, and — if it passes —
    // dispatch the action ourselves. Going through React's `<form action>` lifecycle on the client
    // would reset the form's DOM after the action, which desyncs controlled fields (a <select>
    // snaps back to its first option while RHF still holds the chosen value); dispatching manually
    // avoids that. The client-validation gate is a plain `await form.trigger()` here, not a
    // `requestSubmit()` re-entry, so there's no "needs two clicks" pitfall; the server still
    // re-validates as the source of truth.
    const handleServerSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!formAction) return;
      const formData = new globalThis.FormData(e.currentTarget);
      // Drop React's progressive-enhancement bookkeeping inputs ($ACTION_REF_*, $ACTION_*, …) so
      // they don't leak into the validated data or the echoed `values`.
      for (const fieldKey of Array.from(formData.keys())) {
        if (fieldKey.startsWith('$ACTION')) formData.delete(fieldKey);
      }
      const valid = await form.trigger();
      if (!valid) return;
      // The `await` above left React's transition scope, so dispatch inside startTransition to
      // keep `isPending` working / avoid the "called outside a transition" warning.
      startTransition(() => formAction(formData));
    };

    const formProps: React.FormHTMLAttributes<HTMLFormElement> = { className, style };
    const noValidate = noValidateProp ?? ctx.config.noValidate;
    if (noValidate) formProps.noValidate = true;
    if (hasServerAction) {
      formProps.action = formAction as React.FormHTMLAttributes<HTMLFormElement>['action'];
      formProps.onSubmit = handleServerSubmit;
    } else {
      formProps.onSubmit = handleClientSubmit;
    }

    const FormComponent = ctx.config.components.Form;
    const formContent = renderAllFields(ctx, showActions, serverErrors);

    if (FormComponent) {
      return (
        <FormComponent {...formProps}>
          {formContent}
        </FormComponent>
      );
    }

    return (
      <form {...formProps}>
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
 * This hook leverages TypeScript's type inference and Zod's schema typing
 * capabilities for full type safety.
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
export const useFormDefinition = <T extends FormDefinition>(
  definition: T,
  options: UseFormDefinitionOptions<T> = {}
): UseFormDefinitionReturn<T> => {
  const { form: formOption, config: userConfig, serverAction } = options;

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

    const baseDefaults = generateDefaultValues(definition);
    // On a no-JS validation-error round-trip the page re-renders server-side with the action
    // result in hand; seeding useForm() with the submitted raw values re-populates the fields.
    // (No-op on the client: useForm only reads defaultValues at mount, and RHF already holds
    // whatever the user typed.)
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
  }, [schema, definition, actionState, serverAction]);

  // Create internal form if none provided
  // Note: This must be called unconditionally to satisfy React's rules of hooks
  const internalForm = useForm(generatedOptions);

  // Use provided form or internal form
  const form = formOption ?? internalForm;

  // Memoize config to prevent unnecessary re-renders
  const config = useMemo(
    () => createFormConfig(userConfig || {}),
    [userConfig]
  );

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
  };

  // Create the rendered components exactly once per hook instance (stable identities).
  const componentsRef = useRef<{
    RenderedField: React.FC<RenderedFieldProps<T>>;
    RenderedForm: React.FC<RenderedFormProps<any>>;
  }>(undefined as unknown as { RenderedField: React.FC<RenderedFieldProps<T>>; RenderedForm: React.FC<RenderedFormProps<any>> });
  if (!componentsRef.current) {
    componentsRef.current = {
      RenderedField: createRenderedField(ctxRef),
      RenderedForm: createRenderedForm(ctxRef),
    };
  }
  const RenderedField = componentsRef.current.RenderedField;
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

  const validateData = (formData: FormData) => {
    const dataObject = Object.fromEntries(formData.entries());
    return schema.safeParse(dataObject);
  };

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
  const LayoutContainerComponent = config.components.LayoutContainer || null;
  const LayoutItemComponent = config.components.LayoutItem || null;

  return {
    form,
    RenderedField,
    RenderedForm,
    Form: FormComponent,
    Actions: ActionsComponent,
    LayoutContainer: LayoutContainerComponent,
    LayoutItem: LayoutItemComponent,
    actionState,
    isPending,
    formAction,
    validateData,
    generateSchema: schemaGenerator,
    generateOptions: optionsGenerator,

    // Type helper for consumers
    _types: {} as z.infer<ReturnType<typeof generateSchema<T>>>,
  };
};
