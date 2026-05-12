import React from "react";
import { FormConfig, ProcessedComponentConfig } from "../core/types";
import { getDefaultFieldTypes } from "./defaultFieldTypes";
import { LayoutContainer } from "../components/LayoutContainer";
import { LayoutItem } from "../components/LayoutItem";
import { Actions } from "../components/Actions";

// Basic default configuration with layout components
// Translation defaults are handled in normalizeTranslationConfig
export const defaultFormConfig: FormConfig = {
  fieldTypes: {},
  components: {
    LayoutContainer: LayoutContainer,
    LayoutItem: LayoutItem,
    Actions: Actions,
  },
  translation: {
    // All translation defaults are handled by normalizeTranslationConfig in utilities.ts
    // This empty object means: use all defaults (labels disabled, validation enabled, etc.)
  },
};

// Helper to convert plain components or config objects to ProcessedComponentConfig
const toProcessedComponentConfig = (config: React.ComponentType<any> | ProcessedComponentConfig): ProcessedComponentConfig => {
  // Check if it's already a ProcessedComponentConfig
  if (config && typeof config === 'object' && 'component' in config) {
    return config as ProcessedComponentConfig;
  }

  // Otherwise, treat it as a plain component
  return {
    component: config as React.ComponentType<any>,
    ignoreFieldWrapper: false,
    additionalProps: []
  };
};

// Configuration factory with default field types
export const getFormConfigWithDefaultFieldTypes = (): FormConfig => {
  const defaultFieldTypes = getDefaultFieldTypes();
  const processedDefaultFieldTypes: Record<string, ProcessedComponentConfig> = {};

  Object.entries(defaultFieldTypes).forEach(([key, componentOrConfig]) => {
    processedDefaultFieldTypes[key] = toProcessedComponentConfig(componentOrConfig);
  });

  return {
    ...defaultFormConfig,
    fieldTypes: processedDefaultFieldTypes,
  };
};

// Helper to merge translation configs (handling boolean shorthand)
const mergeTranslationConfig = (
  base: FormConfig['translation'],
  override: FormConfig['translation']
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
export const createFormConfig = (config: Partial<FormConfig> = {}): FormConfig => {
  return {
    fieldTypes: {
      ...defaultFormConfig.fieldTypes,
      ...(config.fieldTypes || {}),
    },
    components: {
      ...defaultFormConfig.components,
      ...(config.components || {}),
    },
    translation: mergeTranslationConfig(defaultFormConfig.translation, config.translation),
    noValidate: config.noValidate,
  };
};