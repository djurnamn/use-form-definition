import React from "react";
import { FieldValues, UseFormReturn } from "react-hook-form";
import {
  FormDefinition,
  FormConfiguration,
  ProcessedComponentConfiguration,
  FormAction,
} from "../core/types";
import type { FormSections } from "../core/sections";
import type { InferFormType } from "../core/types-inference";
import {
  useFormDefinition,
  type UseFormDefinitionReturn,
} from "./useFormDefinition";
import {
  createFormConfiguration,
  getFormConfigurationWithDefaultFieldTypes,
} from "../configuration/createFormConfiguration";
import type { PluginRegistry } from "../core/plugin-system";

// Advanced component configuration
export interface AdvancedComponentConfiguration<T = any> {
  component: React.ComponentType<T>;
  ignoreFieldWrapper?: boolean;
  additionalProps?: string[];
}

/**
 * @deprecated Use `AdvancedComponentConfiguration` instead. `AdvancedComponentConfig` is kept as an alias until the next major
 * version.
 */
export type AdvancedComponentConfig<T = any> =
  AdvancedComponentConfiguration<T>;

/**
 * Field types that correspond to HTML input types.
 * For these field types, `type` is automatically added to additionalProps
 * so custom components receive the HTML input type (e.g., type="password").
 */
const INPUT_TYPE_FIELD_TYPES = new Set([
  "text",
  "password",
  "email",
  "url",
  "tel",
  "search",
  "number",
  "date",
  "datetime-local",
  "time",
  "month",
  "week",
  "range",
  "color",
  "file",
  "hidden",
]);

// Simple component (backward compatible) or advanced configuration
export type ComponentConfiguration =
  React.ComponentType<any> | AdvancedComponentConfiguration;

/**
 * @deprecated Use `ComponentConfiguration` instead. `ComponentConfig` is kept as an alias until the next major
 * version.
 */
export type ComponentConfig = ComponentConfiguration;

export interface FormDefinitionHookConfiguration {
  components?: Record<string, ComponentConfiguration>;
  formComponents?: FormConfiguration["components"];
  translation?: FormConfiguration["translation"];
  /**
   * Set `noValidate` on every rendered `<form>`, disabling the browser's built-in HTML5
   * constraint validation (e.g. the `<input type="email">` bubble) so react-hook-form / your
   * server action are the sole validators. Default: `false`. Overridable per form via
   * `<RenderedForm noValidate>`.
   */
  noValidate?: boolean;
  /**
   * Emit native HTML5 validation attributes (`required`, `pattern`, `minLength`,
   * `maxLength`, `min`, `max`) on every rendered input, derived from each field's
   * `validation` rules. Gives a no-JS HTML5 validation layer alongside
   * react-hook-form / your server action. Default: `false`. Overridable per form
   * via the runtime `configuration.emitHtml5Attributes`.
   */
  emitHtml5Attributes?: boolean;
  /**
   * A plugin registry carried on every form's configuration, to hand to
   * `generateSchemaAsync(definition, formData, registry)`. The form's own
   * validation does not run plugins, and there is no global registry: a plugin
   * applies only where its registry is passed to `generateSchemaAsync`.
   *
   * @example
   * ```typescript
   * import { createPluginRegistry, generateSchemaAsync } from 'use-form-definition';
   *
   * const registry = createPluginRegistry();
   * registry.register('my-plugin', myPlugin, metadata);
   *
   * const schema = await generateSchemaAsync(definition, formData, registry);
   * ```
   *
   * @example Translation with hook (zero-configuration per form)
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
   * // In component - no translation configuration needed!
   * const { RenderedForm } = useFormDefinition(definition);
   * ```
   */
  pluginRegistry?: PluginRegistry;
}

/**
 * @deprecated Use `FormDefinitionHookConfiguration` instead. `FormDefinitionHookConfig` is kept as an alias until the next major
 * version.
 */
export type FormDefinitionHookConfig = FormDefinitionHookConfiguration;

/**
 * Options passed to the form definition hook at runtime
 *
 * The `form` option accepts two patterns:
 * 1. Omitted - useForm is called internally (simplest)
 * 2. Full UseFormReturn object - pass the entire useForm() result for full control
 */
export interface FormDefinitionHookOptions<
  T extends FieldValues = FieldValues,
> {
  /**
   * Form instance from react-hook-form
   * - If omitted, useForm() is called internally with auto-generated options
   * - If provided, the full UseFormReturn object is used
   *
   * Note the trade-off documented on `useFormDefinition`'s `form` option: a form you
   * construct yourself cannot receive the no-JS validation-error re-population, because
   * that merge happens where this hook builds the form. Prefer `defaultValues` below when
   * starting values are all you need.
   */
  form?: UseFormReturn<T>;
  /**
   * Initial values for the internally-created form - an edit form's stored record. Merged
   * over the definition's generated defaults and under a failed action's echoed `values`.
   * Ignored when `form` is passed.
   */
  defaultValues?: FieldValues;
  /**
   * The form's partition into named sections (section name to definition keys). See the
   * `sections` option on `useFormDefinition` for the full contract: zero-configuration grouped
   * rendering, value mirrors under `currentSection`, and the returned `sections` API.
   */
  sections?: Record<string, ReadonlyArray<string>>;
  /**
   * Per-form configuration overrides, merged over what the factory was set up with.
   */
  configuration?: Partial<FormConfiguration>;
  /**
   * @deprecated Use `configuration` instead. `config` keeps working until the next major
   * version; when both are given, `configuration` wins.
   */
  config?: Partial<FormConfiguration>;
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

export type FormDefinitionHook = <
  T extends FormDefinition,
  Extras extends Record<string, unknown> = Record<string, unknown>,
>(
  definition: T,
  options?: FormDefinitionHookOptions,
) => UseFormDefinitionReturn<T, InferFormType<T>, Extras>;

/**
 * Factory function to create a pre-configured useFormDefinition hook
 *
 * This allows users to set up their form configuration once and reuse it
 * across their application without having to pass configuration every time.
 *
 * @example
 * ```typescript
 * // utilities/form/configuration.ts
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
 * import { useFormDefinition } from '@/utilities/form/configuration';
 *
 * const { RenderedField, RenderedForm } = useFormDefinition(definition);
 *
 * // Use components
 * <RenderedField name="email" />
 * <RenderedForm onSubmit={handleSubmit} />
 * ```
 */
// Helper to process ComponentConfiguration into ProcessedComponentConfiguration
const processComponentConfiguration = (
  configuration: ComponentConfiguration,
  fieldTypeKey: string,
): ProcessedComponentConfiguration => {
  // Determine if this field type should receive the `type` prop
  // (i.e., it corresponds to an HTML input type)
  const shouldPassType = INPUT_TYPE_FIELD_TYPES.has(fieldTypeKey);

  // Check if this is our controlled advanced configuration object
  // (has 'component' property - our AdvancedComponentConfiguration shape)
  if (
    configuration &&
    typeof configuration === "object" &&
    "component" in configuration
  ) {
    const additionalProps = configuration.additionalProps || [];

    // Add 'type' to additionalProps if needed and not already present
    if (shouldPassType && !additionalProps.includes("type")) {
      additionalProps.push("type");
    }

    return {
      component: configuration.component,
      ignoreFieldWrapper: configuration.ignoreFieldWrapper || false,
      additionalProps,
    };
  }

  // Everything else is a simple component (function, forwardRef, memo, etc.)
  return {
    component: configuration as React.ComponentType<any>,
    ignoreFieldWrapper: false,
    additionalProps: shouldPassType ? ["type"] : [],
  };
};

export const createFormDefinitionHook = (
  hookConfiguration: FormDefinitionHookConfiguration = {},
): FormDefinitionHook => {
  // Start with built-in field types, then merge user components
  const formConfigurationWithDefaultFieldTypes =
    getFormConfigurationWithDefaultFieldTypes();

  // Process user components from ComponentConfiguration to ProcessedComponentConfiguration
  const processedComponents: Record<string, ProcessedComponentConfiguration> =
    {};
  Object.entries(hookConfiguration.components || {}).forEach(
    ([key, configuration]) => {
      processedComponents[key] = processComponentConfiguration(
        configuration,
        key,
      );
    },
  );

  const baseConfiguration = createFormConfiguration({
    fieldTypes: {
      ...formConfigurationWithDefaultFieldTypes.fieldTypes,
      ...processedComponents,
    },
    components: {
      ...formConfigurationWithDefaultFieldTypes.components,
      ...(hookConfiguration.formComponents || {}),
    },
    translation: hookConfiguration.translation,
    pluginRegistry: hookConfiguration.pluginRegistry,
    noValidate: hookConfiguration.noValidate,
    emitHtml5Attributes: hookConfiguration.emitHtml5Attributes,
  });

  // Return the configured hook function
  return <
    T extends FormDefinition,
    Extras extends Record<string, unknown> = Record<string, unknown>,
  >(
    definition: T,
    options: FormDefinitionHookOptions = {},
  ): UseFormDefinitionReturn<T, InferFormType<T>, Extras> => {
    // For runtime configuration merging, we need to process any additional fieldTypes
    // that might be passed in the runtime configuration
    const runtimeConfiguration = options.configuration ?? options.config;
    const runtimeFieldTypes: Record<string, ProcessedComponentConfiguration> =
      {};
    if (runtimeConfiguration?.fieldTypes) {
      Object.entries(runtimeConfiguration.fieldTypes).forEach(
        ([key, configuration]) => {
          runtimeFieldTypes[key] = configuration;
        },
      );
    }

    // Deep merge translation configuration to preserve nested category settings
    // Handle both boolean shorthand (true) and object configs
    const mergedTranslation = (() => {
      const runtimeTranslation = runtimeConfiguration?.translation;
      const baseTranslation = baseConfiguration.translation;

      // No runtime configuration - use base
      if (runtimeTranslation === undefined) {
        return baseTranslation;
      }

      // Runtime is boolean (true) - merge with base
      if (runtimeTranslation === true) {
        // If base is also true or undefined, just return true
        if (baseTranslation === true || baseTranslation === undefined) {
          return true;
        }
        // Base has configuration object, merge true with it (true enables all)
        return baseTranslation;
      }

      // Runtime is object - merge with base
      const baseObject = baseTranslation === true ? {} : baseTranslation;
      return {
        hook: runtimeTranslation.hook ?? baseObject?.hook,
        function: runtimeTranslation.function ?? baseObject?.function,
        labels: {
          ...baseObject?.labels,
          ...runtimeTranslation.labels,
        },
        options: {
          ...baseObject?.options,
          ...runtimeTranslation.options,
        },
        placeholders: {
          ...baseObject?.placeholders,
          ...runtimeTranslation.placeholders,
        },
        validation: {
          ...baseObject?.validation,
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
      let translationFunction = mergedTranslation.function;

      if (!translationFunction && mergedTranslation.hook) {
        // Call the hook to get the translation function
        translationFunction = mergedTranslation.hook();
      }

      return {
        ...mergedTranslation,
        function: translationFunction,
      };
    })();

    const finalConfiguration: FormConfiguration = {
      fieldTypes: {
        ...baseConfiguration.fieldTypes,
        ...runtimeFieldTypes,
      },
      components: {
        ...baseConfiguration.components,
        ...(runtimeConfiguration?.components || {}),
      },
      translation: resolvedTranslation,
      pluginRegistry:
        runtimeConfiguration?.pluginRegistry ||
        baseConfiguration.pluginRegistry,
      noValidate:
        runtimeConfiguration?.noValidate ?? baseConfiguration.noValidate,
      emitHtml5Attributes:
        runtimeConfiguration?.emitHtml5Attributes ??
        baseConfiguration.emitHtml5Attributes,
    };

    // Use the existing useFormDefinition hook with merged configuration
    return useFormDefinition<T, Extras>(definition, {
      form: options.form,
      defaultValues: options.defaultValues,
      // The factory's options interface is generic over the *data* shape, not the
      // definition, so the per-key field-name checking lives on `useFormDefinition`'s
      // own option; here the map is accepted by shape.
      sections: options.sections as FormSections<T> | undefined,
      configuration: finalConfiguration,
      serverAction: options.serverAction,
    });
  };
};
