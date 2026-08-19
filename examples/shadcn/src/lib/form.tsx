import { createFormDefinitionHook } from 'use-form-definition';
import {
  ShadcnInput,
  ShadcnInputProps,
  ShadcnTextarea,
  ShadcnSelect,
  ShadcnCheckbox,
  ShadcnField,
  ShadcnLayoutContainer,
  ShadcnLayoutItem,
  ShadcnActions,
} from '@/components/form';

/**
 * Configured form definition hook for shadcn/ui.
 *
 * This demonstrates how use-form-definition simplifies form creation
 * compared to manual shadcn/ui + react-hook-form + zod composition.
 *
 * Benefits over manual approach:
 * - Single source of truth for validation (no separate Zod schema)
 * - <RenderedField /> replaces manual FormField composition
 * - <RenderedForm /> handles form submission and layout
 * - Same definition works for client and server validation
 */
export const useFormDefinition = createFormDefinitionHook({
  components: {
    // Text-based inputs - note: we explicitly set input types for email, password, etc.
    // because the library's `type` prop is used to select components, not for HTML attributes
    text: ShadcnInput,
    email: (props: ShadcnInputProps) => <ShadcnInput {...props} type="email" />,
    password: (props: ShadcnInputProps) => <ShadcnInput {...props} type="password" />,
    number: (props: ShadcnInputProps) => <ShadcnInput {...props} type="number" />,
    date: (props: ShadcnInputProps) => <ShadcnInput {...props} type="date" />,
    url: (props: ShadcnInputProps) => <ShadcnInput {...props} type="url" />,
    tel: (props: ShadcnInputProps) => <ShadcnInput {...props} type="tel" />,

    // Textarea for multi-line text
    textarea: ShadcnTextarea,

    // Select dropdown with options support
    select: {
      component: ShadcnSelect,
      additionalProps: ['options', 'placeholder'],
    },

    // Checkbox handles its own label and error display
    checkbox: {
      component: ShadcnCheckbox,
      ignoreFieldWrapper: true,
      additionalProps: ['inlineLabel'],
    },
  },
  formComponents: {
    // Field wrapper provides consistent label and error display
    Field: ShadcnField,

    // Layout components for RenderedForm auto-layout
    LayoutContainer: ShadcnLayoutContainer,
    LayoutItem: ShadcnLayoutItem,

    // Custom Actions slot - renders the submit button with loading state
    Actions: ShadcnActions,
  },
});
