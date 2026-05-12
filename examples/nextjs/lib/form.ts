"use client";

import { createFormDefinitionHook } from "use-form-definition";
import { useTranslations } from "next-intl";
import { Input, Select, TextArea, Checkbox, Field } from "@/components/form";

/**
 * Base hook configuration shared by all form hooks
 */
const baseConfig = {
  // Let react-hook-form / the server action be the validators — keep the browser's built-in
  // HTML5 constraint bubbles (e.g. on <input type="email">) out of the way.
  noValidate: true,

  // Map field types to components
  components: {
    text: Input,
    email: Input,
    password: Input,
    number: Input,
    date: Input,
    "datetime-local": Input,
    select: {
      component: Select,
      additionalProps: ["options", "placeholder"],
    },
    textarea: TextArea,
    checkbox: {
      component: Checkbox,
      ignoreFieldWrapper: true, // Checkbox handles its own label
      additionalProps: ["inlineLabel"],
    },
  },

  // Configure wrapper components
  formComponents: {
    Field: Field,
  },
};

/**
 * Hook with automatic translation via hook
 *
 * Uses `hook: useTranslations` to automatically call the translation hook internally,
 * so forms work with zero translation config at runtime.
 *
 * When `hook` is provided, all translation categories are enabled by default:
 * - labels: enabled, alwaysInclude: true (omitted labels auto-generate keys)
 * - options: enabled, alwaysInclude: true (option labels are translation keys)
 * - placeholders: enabled, alwaysInclude: false (must opt-in with `placeholder: "auto"` or a literal string)
 * - validation: enabled (already default)
 *
 * @example Zero-config usage (translation just works!)
 * const { RenderedForm } = useFormDefinition(definition);
 *
 * @example Override with specific namespace
 * const t = useTranslations('myNamespace');
 * const { RenderedForm } = useFormDefinition(definition, {
 *   config: { translation: { function: t } }
 * });
 */
export const useFormDefinition = createFormDefinitionHook({
  ...baseConfig,
  translation: {
    hook: useTranslations, // All categories enabled automatically!
  },
});

/**
 * Hook with manual translation via runtime function
 *
 * Does NOT configure a hook - requires passing `function: t` at runtime.
 * This pattern is useful when you need more control over when/how
 * the translation hook is called (e.g., specific namespace per form).
 *
 * Custom settings:
 * - placeholders: alwaysInclude: true (auto-generate placeholder keys for all fields)
 *
 * Note: When `function` is passed at runtime, all categories are enabled automatically.
 *
 * @example Pass t at runtime
 * const t = useTranslations();
 * const { RenderedForm } = useCustomFormDefinition(definition, {
 *   config: { translation: { function: t } }
 * });
 *
 * @example With specific namespace
 * const t = useTranslations('forms');
 * const { RenderedForm } = useCustomFormDefinition(definition, {
 *   config: { translation: { function: t } }
 * });
 */
export const useCustomFormDefinition = createFormDefinitionHook({
  ...baseConfig,
  translation: {
    // No hook - requires passing `function: t` at runtime
    placeholders: {
      alwaysInclude: true, // Custom: auto-generate placeholder keys for all fields
    },
  },
});
