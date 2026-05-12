import { FormDefinition } from "use-form-definition";

/**
 * Contact form definition
 *
 * Used with useCustomFormDefinition which has:
 * - placeholders.alwaysInclude: true (auto-generates placeholder keys for all fields)
 *
 * This demonstrates:
 * - Auto-generated placeholders (omitted → localePath(fieldKey))
 * - Explicit placeholder string (override the auto-generated key)
 * - Opting out of placeholders (placeholder: "none")
 */
export const contactFormDefinition: FormDefinition = {
  // placeholder: omitted → auto-generates via localePath('name')
  // With alwaysInclude: true, all text fields get placeholders automatically
  name: {
    type: "text",
    validation: {
      required: true,
      minLength: 2,
      maxLength: 100,
    },
  },

  // placeholder: omitted → auto-generates via localePath('email')
  email: {
    type: "email",
    validation: {
      required: true,
      pattern: "email",
    },
  },

  // placeholder: string → explicit translation key (overrides auto-generated)
  subject: {
    type: "select",
    placeholder: "forms.placeholders.selectSubject",
    options: [
      { value: "general", label: "forms.options.subject.general" },
      { value: "support", label: "forms.options.subject.support" },
      { value: "sales", label: "forms.options.subject.sales" },
      { value: "feedback", label: "forms.options.subject.feedback" },
    ],
    validation: {
      required: true,
    },
  },

  // placeholder: "none" → explicitly opt-out (no placeholder despite alwaysInclude: true)
  message: {
    type: "textarea",
    placeholder: "none",
    validation: {
      required: true,
      minLength: 10,
      maxLength: 1000,
    },
  },
};
