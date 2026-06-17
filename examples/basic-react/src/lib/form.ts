import { createFormDefinitionHook, Field } from 'use-form-definition';
import { HintInput } from './HintInput';

/**
 * Create a configured form definition hook using the library's built-in unstyled components.
 *
 * This demonstrates the simplest possible setup - the library provides default
 * field type mappings for all common HTML5 input types, so we only need to
 * configure the Field wrapper component.
 *
 * The built-in components are intentionally unstyled to allow full CSS control.
 *
 * Default field types provided by the library:
 * - text, email, password, url, tel, search
 * - number, range
 * - date, datetime-local, time, month, week
 * - textarea
 * - select (with options prop)
 * - checkbox
 * - repeater (with fields prop)
 * - file, color, hidden
 */
export const useFormDefinition = createFormDefinitionHook({
  formComponents: {
    Field: Field,
  },
  // Register a custom text/email component that accepts a `helpText` extra.
  // Listing it in `additionalProps` allows the value through the runtime filter;
  // typing the hook call (see ContactPage) makes passing it compile-checked.
  components: {
    text: { component: HintInput, additionalProps: ['helpText'] },
    email: { component: HintInput, additionalProps: ['helpText'] },
  },
});
