import { FormDefinition } from "use-form-definition";

/**
 * Registration form definition demonstrating async validation
 *
 * This form uses the plugin system to validate username availability
 * against an API endpoint. The validation happens asynchronously when
 * the form is submitted.
 */
export const registrationFormDefinition: FormDefinition = {
  username: {
    type: "text",
    validation: {
      required: true,
      minLength: 3,
      maxLength: 20,
      // Only alphanumeric and underscores, lowercase
      pattern: /^[a-z0-9_]+$/,
    },
  },

  email: {
    type: "email",
    validation: {
      required: true,
      pattern: "email",
    },
  },

  password: {
    type: "password",
    validation: {
      required: true,
      minLength: 8,
      maxLength: 100,
    },
  },

  confirmPassword: {
    type: "password",
    validation: {
      required: true,
      matchValue: "password",
    },
  },

  acceptTerms: {
    type: "checkbox",
    label: false,
    inlineLabel: "form.labels.acceptTerms",
    validation: {
      mustBeTrue: true,
    },
  },
};
