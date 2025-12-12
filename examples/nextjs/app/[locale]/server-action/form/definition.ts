import { FormDefinition } from "use-form-definition";

/**
 * Feedback form definition
 *
 * This form demonstrates the translation system with auto-generated labels.
 * When used with a translated hook (labels.enabled: true, alwaysInclude: true):
 * - Omitted labels automatically use localePath(fieldKey)
 * - Select options use localePath for translation
 *
 * The same definition works for both client and server:
 * - Client: Labels resolved via translation config
 * - Server: Labels not needed for validation, only structure matters
 */
export const feedbackFormDefinition: FormDefinition = {
  // label: omitted → auto-generates key via localePath('name') when translation enabled
  name: {
    type: "text",
    validation: {
      required: true,
      minLength: 2,
      maxLength: 50,
    },
  },

  // label: omitted → auto-generates key via localePath('email')
  email: {
    type: "email",
    validation: {
      required: true,
      pattern: "email",
    },
  },

  // Select with options - option values are used as translation keys
  // e.g., value "5" → localePath('5') → 'forms.options.5'
  // Since our messages use 'forms.options.rating.excellent', we provide explicit keys
  rating: {
    type: "select",
    // placeholder: true → explicit opt-in to localePath('rating') for placeholder
    placeholder: true,
    options: [
      // Option labels are translation keys when options.enabled: true
      { value: "5", label: "forms.options.rating.excellent" },
      { value: "4", label: "forms.options.rating.good" },
      { value: "3", label: "forms.options.rating.average" },
      { value: "2", label: "forms.options.rating.poor" },
      { value: "1", label: "forms.options.rating.veryPoor" },
    ],
    validation: {
      required: true,
    },
  },

  // label: omitted → auto-generates key via localePath('feedback')
  feedback: {
    type: "textarea",
    validation: {
      required: true,
      minLength: 20,
      maxLength: 500,
    },
  },

  // Checkbox with inline label (label handled by component, not Field wrapper)
  // label: false → no label from Field wrapper
  // inlineLabel → translation key passed to Checkbox component
  contactMe: {
    type: "checkbox",
    label: false,
    inlineLabel: "form.labels.contactMe",
  },
};
