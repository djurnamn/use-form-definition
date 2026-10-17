import React from "react";
import {
  FormConfiguration,
  ProcessedComponentConfiguration,
} from "../core/types";
import { getDefaultFieldTypes } from "./default-field-types";
import { LayoutContainer } from "../components/LayoutContainer";
import { LayoutItem } from "../components/LayoutItem";
import { Actions } from "../components/Actions";
import { FormMessage } from "../components/FormMessage";

// Basic default configuration with layout components
// Translation defaults are handled in normalizeTranslationConfiguration
export const defaultFormConfiguration: FormConfiguration = {
  fieldTypes: {},
  components: {
    LayoutContainer: LayoutContainer,
    LayoutItem: LayoutItem,
    Actions: Actions,
    FormMessage: FormMessage,
  },
  translation: {
    // All translation defaults are handled by normalizeTranslationConfiguration in utilities.ts
    // This empty object means: use all defaults (labels disabled, validation enabled, etc.)
  },
};

/**
 * @deprecated Use `defaultFormConfiguration` instead. `defaultFormConfig` is kept as an alias until the next major
 * version.
 */
export const defaultFormConfig = defaultFormConfiguration;

// Helper to convert plain components or configuration objects to ProcessedComponentConfiguration
const toProcessedComponentConfiguration = (
  configuration: React.ComponentType<any> | ProcessedComponentConfiguration,
): ProcessedComponentConfiguration => {
  // Check if it's already a ProcessedComponentConfiguration
  if (
    configuration &&
    typeof configuration === "object" &&
    "component" in configuration
  ) {
    return configuration as ProcessedComponentConfiguration;
  }

  // Otherwise, treat it as a plain component
  return {
    component: configuration as React.ComponentType<any>,
    ignoreFieldWrapper: false,
    additionalProps: [],
  };
};

// Configuration factory with default field types
export const getFormConfigurationWithDefaultFieldTypes =
  (): FormConfiguration => {
    const defaultFieldTypes = getDefaultFieldTypes();
    const processedDefaultFieldTypes: Record<
      string,
      ProcessedComponentConfiguration
    > = {};

    Object.entries(defaultFieldTypes).forEach(
      ([key, componentOrConfiguration]) => {
        processedDefaultFieldTypes[key] = toProcessedComponentConfiguration(
          componentOrConfiguration,
        );
      },
    );

    return {
      ...defaultFormConfiguration,
      fieldTypes: processedDefaultFieldTypes,
    };
  };

// Helper to merge translation configs (handling boolean shorthand)
const mergeTranslationConfiguration = (
  base: FormConfiguration["translation"],
  override: FormConfiguration["translation"],
) => {
  // If override is true, it takes precedence (enable all)
  if (override === true) return true;
  // If no override, use base
  if (override === undefined) return base;
  // If base is true and override is object, use override (more specific)
  if (base === true) return override;
  // Both are objects (or undefined), merge them
  return {
    ...(base || {}),
    ...override,
  };
};

// Configuration factory
export const createFormConfiguration = (
  configuration: Partial<FormConfiguration> = {},
): FormConfiguration => {
  return {
    fieldTypes: {
      ...defaultFormConfiguration.fieldTypes,
      ...(configuration.fieldTypes || {}),
    },
    components: {
      ...defaultFormConfiguration.components,
      ...(configuration.components || {}),
    },
    translation: mergeTranslationConfiguration(
      defaultFormConfiguration.translation,
      configuration.translation,
    ),
    pluginRegistry: configuration.pluginRegistry,
    noValidate: configuration.noValidate,
    emitHtml5Attributes: configuration.emitHtml5Attributes,
  };
};

/**
 * @deprecated Use `createFormConfiguration` instead. `createFormConfig` is kept as an alias until the next major
 * version.
 */
export const createFormConfig = createFormConfiguration;
