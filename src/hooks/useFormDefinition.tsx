import React, { ReactNode, useMemo, FormEvent, useEffect, useRef, useActionState } from "react";
import { Controller, FieldValues, UseFormReturn, DefaultValues, useForm, FieldError } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormDefinition,
  FormConfig,
  FormFieldDefinition,
  FormActionResult,
  SelectOption,
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
  optionsCallback: true,
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

/**
 * Nested field renderer function type
 * Used by components like Repeater to render their nested fields
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
}

/**
 * Props for the RenderedField component
 */
export interface RenderedFieldProps<T extends FormDefinition> {
  /** The field name from the form definition */
  name: keyof T & string;
  /** Additional props to pass to the field component */
  additionalProps?: Record<string, any>;
  /** Custom render function for the field */
  render?: (field: T[keyof T]) => ReactNode;
}

/**
 * Server action function type for RenderedForm
 */
export type ServerAction<TFormData extends FieldValues> = (
  prevState: FormActionResult<TFormData> | null,
  formData: FormData
) => Promise<FormActionResult<TFormData>>;

/**
 * Props for the RenderedForm component
 */
export interface RenderedFormProps<TFormData extends FieldValues> {
  /** Submit handler receiving validated form data (client-side) */
  onSubmit?: (data: TFormData) => void | Promise<void>;
  /** Server action for form submission (server-side) - alternative to onSubmit */
  action?: ServerAction<TFormData>;
  /** Callback when server action succeeds */
  onSuccess?: (result: FormActionResult<TFormData>) => void;
  /** Callback when server action fails */
  onError?: (result: FormActionResult<TFormData>) => void;
  /** Whether to show the submit button (default: true) */
  showSubmitButton?: boolean;
  /** Additional props to pass to the form element */
  className?: string;
  /** Additional props to pass to the form element */
  style?: React.CSSProperties;
}

/**
 * Internal render field function type (used internally, not exposed)
 */
type InternalRenderFieldFunction<T extends FormDefinition> = <K extends keyof T>(
  key: K,
  additionalProps?: Record<string, any>,
  renderer?: (field: T[K]) => ReactNode
) => ReactNode;

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
   * Configured SubmitButton component
   * Falls back to a basic <button type="submit"> if not configured
   */
  SubmitButton: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>;

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

  validateData: (formData: FormData) => z.SafeParseReturnType<unknown, unknown>;
  generateSchema: () => ReturnType<typeof generateSchema<T>>;
  generateOptions: () => ReturnType<typeof generateOptions<T>>;

  // Type helpers
  _types: z.infer<ReturnType<typeof generateSchema<T>>>;
}

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
  const { form: formOption, config: userConfig } = options;

  // Memoize schema generation - this is expensive and should only happen when definition changes
  const schema = useMemo(() => generateSchemaFromBuilder(definition), [definition]);

  // Generate form options for internal useForm
  const generatedOptions = useMemo(() => {
    type InferredType = z.infer<typeof schema>;

    return {
      resolver: zodResolver(schema),
      defaultValues: generateDefaultValues(definition) as DefaultValues<InferredType>,
    };
  }, [schema, definition]);

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

  // Internal render field function (used by both RenderedField and RenderedForm)
  const renderFieldInternal: InternalRenderFieldFunction<T> = (
    definitionKey,
    additionalProps = {},
    customRender
  ) => {
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

      // Determine if we should ignore the field wrapper
      const shouldIgnoreWrapper = componentConfig.ignoreFieldWrapper;

      // Resolve presentation data (label, placeholder, options) with translation
      const { label: fieldLabel, placeholder: fieldPlaceholder, options: resolvedOptions } =
        resolveFieldPresentationData(field, key, translationConfig);

      const fieldProps = {
        ...field,
        name: fieldName,
        label: fieldLabel,
        placeholder: fieldPlaceholder,
        ...(resolvedOptions ? { options: resolvedOptions } : {}),
        ...additionalProps,
      };

      // Filter out library props before passing to the component
      // Allow additional props specified in the component config
      const componentProps = filterLibraryProps(fieldProps, componentConfig.additionalProps);

      // Inject form config for components that need it (like Repeater)
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

          // Parse the error message to convert from JSON format to readable text
          const parsedError = fieldState.error
            ? {
                ...fieldState.error,
                message: fieldState.error.message
                  ? parseValidationError(fieldState.error.message, translateValidation)
                  : undefined,
              }
            : undefined;

          // Resolve presentation data (label, placeholder, options) with translation
          const { label: fieldLabel, placeholder: fieldPlaceholder, options: resolvedOptions } =
            resolveFieldPresentationData(field, key, translationConfig);

          const fieldProps = {
            ...field,
            ...controllerField,
            label: fieldLabel,
            placeholder: fieldPlaceholder,
            error: parsedError,
            ...(resolvedOptions ? { options: resolvedOptions } : {}),
            ...additionalProps,
          };

          // Filter out library props before passing to the component
          // Allow additional props specified in the component config
          const componentProps = filterLibraryProps(fieldProps, componentConfig.additionalProps);

          // Inject form config for components that need it (like Repeater)
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

  // Create the RenderedField component
  const RenderedField = useMemo(() => {
    const Component: React.FC<RenderedFieldProps<T>> = ({ name, additionalProps, render }) => {
      return <>{renderFieldInternal(name, additionalProps, render)}</>;
    };
    Component.displayName = 'RenderedField';
    return Component;
  }, [definition, form, config, translationConfig, translateValidation]);

  // Helper to render submit button
  const renderSubmitButton = () => {
    const SubmitButton = config.components.SubmitButton;
    return SubmitButton ? <SubmitButton /> : <button type="submit">Submit</button>;
  };

  // Helper to render all fields with layout
  const renderAllFields = (showSubmitButton: boolean) => {
    const LayoutContainer = config.components.LayoutContainer;
    const LayoutItem = config.components.LayoutItem;

    const fields = Object.keys(definition).map((key) => {
      const field = definition[key];
      const layoutProps = field.layout || {};

      const fieldElement = renderFieldInternal(key as keyof T);

      if (!LayoutItem) {
        return fieldElement;
      }

      return (
        <LayoutItem key={key} {...layoutProps}>
          {fieldElement}
        </LayoutItem>
      );
    });

    if (showSubmitButton) {
      const submitElement = renderSubmitButton();
      if (LayoutItem) {
        fields.push(
          <LayoutItem key="submit-button">
            {submitElement}
          </LayoutItem>
        );
      } else {
        fields.push(submitElement);
      }
    }

    if (LayoutContainer) {
      return <LayoutContainer>{fields}</LayoutContainer>;
    }

    return <>{fields}</>;
  };

  // Create the RenderedForm component
  const RenderedForm = useMemo(() => {
    type FormData = z.infer<ReturnType<typeof generateSchema<T>>>;

    const Component: React.FC<RenderedFormProps<FormData>> = ({
      onSubmit,
      action,
      onSuccess,
      onError,
      showSubmitButton = true,
      className,
      style,
    }) => {
      // Server action state (only used when action prop is provided)
      const [actionState, formAction, isPending] = action
        ? useActionState(action, null)
        : [null, null, false];

      const prevActionStateRef = useRef(actionState);

      // Process server errors and set them on the form
      useEffect(() => {
        if (!actionState || actionState === prevActionStateRef.current) {
          return;
        }

        prevActionStateRef.current = actionState;

        // Handle server-side validation errors
        if (actionState.success === false && actionState.errors) {
          Object.entries(actionState.errors).forEach(([fieldName, errorValue]) => {
            const message = Array.isArray(errorValue)
              ? errorValue.join(', ')
              : errorValue;
            form.setError(fieldName as any, {
              type: 'server',
              message,
            });
          });
        }

        // Call success/error callbacks
        if (actionState.success === true) {
          onSuccess?.(actionState);
        } else if (actionState.success === false) {
          onError?.(actionState);
        }
      }, [actionState, onSuccess, onError]);

      // Client-side submit handler
      const handleClientSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (onSubmit) {
          form.handleSubmit(onSubmit)(e);
        }
      };

      // Server action submit handler (validates client-side first)
      const handleServerAction = async (formDataObj: globalThis.FormData) => {
        const isValid = await form.trigger();
        if (!isValid || !formAction) {
          return;
        }
        formAction(formDataObj);
      };

      // Get the Form component from config, or use a default form element
      const FormComponent = config.components.Form;

      // Determine form props based on client vs server mode
      const formProps = action
        ? { action: handleServerAction, className, style }
        : { onSubmit: handleClientSubmit, className, style };

      const formContent = renderAllFields(showSubmitButton);

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
  }, [definition, form, config, translationConfig, translateValidation]);

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

  // Default SubmitButton component
  const DefaultSubmitButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
    <button type="submit" {...props}>
      {props.children || 'Submit'}
    </button>
  );

  // Get configured components or use defaults
  const FormComponent = config.components.Form || DefaultForm;
  const SubmitButtonComponent = config.components.SubmitButton || DefaultSubmitButton;
  const LayoutContainerComponent = config.components.LayoutContainer || null;
  const LayoutItemComponent = config.components.LayoutItem || null;

  return {
    form,
    RenderedField,
    RenderedForm,
    Form: FormComponent,
    SubmitButton: SubmitButtonComponent,
    LayoutContainer: LayoutContainerComponent,
    LayoutItem: LayoutItemComponent,
    validateData,
    generateSchema: schemaGenerator,
    generateOptions: optionsGenerator,

    // Type helper for consumers
    _types: {} as z.infer<ReturnType<typeof generateSchema<T>>>,
  };
};