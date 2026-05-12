import React from "react";
import { FieldValues, UseFormReturn } from "react-hook-form";
import { FormDefinition, FormConfig, ProcessedComponentConfig, FormAction } from "../core/types";
import { useFormDefinition, type UseFormDefinitionReturn } from "./useFormDefinition";
import { createFormConfig, getFormConfigWithDefaultFieldTypes } from "../configuration/createFormConfig";
import type { PluginRegistry } from "../core/plugin-system";

// Advanced component configuration
export interface AdvancedComponentConfig<T = any> {
  component: React.ComponentType<T>;
  ignoreFieldWrapper?: boolean;
  additionalProps?: string[];
}

/**
 * Field types that correspond to HTML input types.
 * For these field types, `type` is automatically added to additionalProps
 * so custom components receive the HTML input type (e.g., type="password").
 */
const INPUT_TYPE_FIELD_TYPES = new Set([
  'text',
  'password',
  'email',
  'url',
  'tel',
  'search',
  'number',
  'date',
  'datetime-local',
  'time',
  'month',
  'week',
  'range',
  'color',
  'file',
  'hidden',
]);

// Simple component (backward compatible) or advanced configuration
export type ComponentConfig = React.ComponentType<any> | AdvancedComponentConfig;

export interface FormDefinitionHookConfig {
  components?: Record<string, ComponentConfig>;
  formComponents?: FormConfig['components'];
  translation?: FormConfig['translation'];
  /**
   * Set `noValidate` on every rendered `<form>`, disabling the browser's built-in HTML5
   * constraint validation (e.g. the `<input type="email">` bubble) so react-hook-form / your
   * server action are the sole validators. Default: `false`. Overridable per form via
   * `<RenderedForm noValidate>`.
   */
  noValidate?: boolean;
  /**
   * Optional plugin registry for SSR-safe plugin management
   * If not provided, uses the global plugin registry (client-side safe)
   *
   * @example
   * ```typescript
   * import { createFormDefinitionHook, createPluginRegistry } from 'use-form-definition';
   *
   * // Create an isolated plugin registry for SSR
   * const registry = createPluginRegistry();
   * registry.register('my-plugin', myPlugin, metadata);
   *
   * const useFormDefinition = createFormDefinitionHook({
   *   components: { ... },
   *   pluginRegistry: registry
   * });
   * ```
   *
   * @example Translation with hook (zero-config per form)
   * ```typescript
   * import { useTranslations } from 'next-intl';
   *
   * const useFormDefinition = createFormDefinitionHook({
   *   components: { ... },
   *   translation: {
   *     hook: useTranslations, // Called automatically in each form
   *     labels: {},
   *     placeholders: { alwaysInclude: true },
   *   }
   * });
   *
   * // In component - no translation config needed!
   * const { RenderedForm } = useFormDefinition(definition);
   * ```
   */
  pluginRegistry?: PluginRegistry;
}

/**
 * Options passed to the form definition hook at runtime
 *
 * The `form` option accepts two patterns:
 * 1. Omitted - useForm is called internally (simplest)
 * 2. Full UseFormReturn object - pass the entire useForm() result for full control
 */
export interface FormDefinitionHookOptions<T extends FieldValues = FieldValues> {
  /**
   * Form instance from react-hook-form
   * - If omitted, useForm() is called internally with auto-generated options
   * - If provided, the full UseFormReturn object is used
   */
  form?: UseFormReturn<T>;
  config?: Partial<FormConfig>;
  /**
   * Server action for the form (e.g. a Next.js Server Action).
   *
   * When provided, the form becomes progressive-enhancement-capable: `<RenderedForm>`
   * wires it via `<form action={...}>` (submits + validates server-side without JS), and
   * the hook returns `actionState` / `isPending`. See `useFormDefinition`'s `serverAction`
   * option for details.
   */
  serverAction?: FormAction<T>;
}

export type FormDefinitionHook = <T extends FormDefinition>(
  definition: T,
  options?: FormDefinitionHookOptions
) => UseFormDefinitionReturn<T>;

/**
 * Factory function to create a pre-configured useFormDefinition hook
 * 
 * This allows users to set up their form configuration once and reuse it
 * across their application without having to pass configuration every time.
 * 
 * @example
 * ```typescript
 * // utilities/form/config.ts
 * import { createFormDefinitionHook } from 'use-form-definition';
 * import { InputField, SelectField } from '@/components/form';
 * 
 * export const useFormDefinition = createFormDefinitionHook({
 *   components: {
 *     text: InputField,
 *     select: SelectField,
 *     // Library provides defaults for: email, password, number, date, etc.
 *   },
 *   translation: {
 *     t: useTranslations(),
 *     fallback: (key) => humanize(key)
 *   }
 * });
 *
 * // app/form/MyForm.tsx
 * import { useFormDefinition } from '@/utilities/form/config';
 *
 * const { RenderedField, RenderedForm } = useFormDefinition(definition);
 *
 * // Use components
 * <RenderedField name="email" />
 * <RenderedForm onSubmit={handleSubmit} />
 * ```
 */
// Helper to process ComponentConfig into ProcessedComponentConfig
const processComponentConfig = (config: ComponentConfig, fieldTypeKey: string): ProcessedComponentConfig => {
  // Determine if this field type should receive the `type` prop
  // (i.e., it corresponds to an HTML input type)
  const shouldPassType = INPUT_TYPE_FIELD_TYPES.has(fieldTypeKey);

  // Check if this is our controlled advanced configuration object
  // (has 'component' property - our AdvancedComponentConfig shape)
  if (config && typeof config === 'object' && 'component' in config) {
    const additionalProps = config.additionalProps || [];

    // Add 'type' to additionalProps if needed and not already present
    if (shouldPassType && !additionalProps.includes('type')) {
      additionalProps.push('type');
    }

    return {
      component: config.component,
      ignoreFieldWrapper: config.ignoreFieldWrapper || false,
      additionalProps,
    };
  }

  // Everything else is a simple component (function, forwardRef, memo, etc.)
  return {
    component: config as React.ComponentType<any>,
    ignoreFieldWrapper: false,
    additionalProps: shouldPassType ? ['type'] : [],
  };
};

export const createFormDefinitionHook = (
  hookConfig: FormDefinitionHookConfig = {}
): FormDefinitionHook => {
  // Start with built-in field types, then merge user components
  const formConfigWithDefaultFieldTypes = getFormConfigWithDefaultFieldTypes();
  
  // Process user components from ComponentConfig to ProcessedComponentConfig
  const processedComponents: Record<string, ProcessedComponentConfig> = {};
  Object.entries(hookConfig.components || {}).forEach(([key, config]) => {
    processedComponents[key] = processComponentConfig(config, key);
  });
  
  const baseConfig = createFormConfig({
    fieldTypes: {
      ...formConfigWithDefaultFieldTypes.fieldTypes,
      ...processedComponents,
    },
    components: {
      ...formConfigWithDefaultFieldTypes.components,
      ...(hookConfig.formComponents || {}),
    },
    translation: hookConfig.translation,
    pluginRegistry: hookConfig.pluginRegistry,
    noValidate: hookConfig.noValidate,
  });

  // Return the configured hook function
  return <T extends FormDefinition>(
    definition: T,
    options: FormDefinitionHookOptions = {}
  ): UseFormDefinitionReturn<T> => {
    // For runtime config merging, we need to process any additional fieldTypes
    // that might be passed in the runtime config
    const runtimeFieldTypes: Record<string, ProcessedComponentConfig> = {};
    if (options.config?.fieldTypes) {
      Object.entries(options.config.fieldTypes).forEach(([key, config]) => {
        runtimeFieldTypes[key] = config;
      });
    }

    // Deep merge translation config to preserve nested category settings
    // Handle both boolean shorthand (true) and object configs
    const mergedTranslation = (() => {
      const runtimeTranslation = options.config?.translation;
      const baseTranslation = baseConfig.translation;

      // No runtime config - use base
      if (runtimeTranslation === undefined) {
        return baseTranslation;
      }

      // Runtime is boolean (true) - merge with base
      if (runtimeTranslation === true) {
        // If base is also true or undefined, just return true
        if (baseTranslation === true || baseTranslation === undefined) {
          return true;
        }
        // Base has config object, merge true with it (true enables all)
        return baseTranslation;
      }

      // Runtime is object - merge with base
      const baseObj = baseTranslation === true ? {} : baseTranslation;
      return {
        hook: runtimeTranslation.hook ?? baseObj?.hook,
        function: runtimeTranslation.function ?? baseObj?.function,
        labels: {
          ...baseObj?.labels,
          ...runtimeTranslation.labels,
        },
        options: {
          ...baseObj?.options,
          ...runtimeTranslation.options,
        },
        placeholders: {
          ...baseObj?.placeholders,
          ...runtimeTranslation.placeholders,
        },
        validation: {
          ...baseObj?.validation,
          ...runtimeTranslation.validation,
        },
      };
    })();

    // Call the translation hook if configured (must be inside the hook body for React rules)
    // Runtime 'function' takes precedence over hook result
    const resolvedTranslation = (() => {
      if (mergedTranslation === true || mergedTranslation === undefined) {
        return mergedTranslation;
      }

      // Get translation function: runtime function > hook result > base function
      let translationFn = mergedTranslation.function;

      if (!translationFn && mergedTranslation.hook) {
        // Call the hook to get the translation function
        translationFn = mergedTranslation.hook();
      }

      return {
        ...mergedTranslation,
        function: translationFn,
      };
    })();

    const finalConfig: FormConfig = {
      fieldTypes: {
        ...baseConfig.fieldTypes,
        ...runtimeFieldTypes,
      },
      components: {
        ...baseConfig.components,
        ...(options.config?.components || {}),
      },
      translation: resolvedTranslation,
      pluginRegistry: options.config?.pluginRegistry || baseConfig.pluginRegistry,
      noValidate: options.config?.noValidate ?? baseConfig.noValidate,
    };

    // Use the existing useFormDefinition hook with merged config
    return useFormDefinition(definition, {
      form: options.form,
      config: finalConfig,
      serverAction: options.serverAction,
    });
  };
};