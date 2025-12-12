import { FormDefinition } from 'use-form-definition';

/**
 * Registration form definition
 *
 * Demonstrates:
 * - Password and confirmPassword fields
 * - `matchValue` validation (confirmPassword must match password)
 * - `mustBeTrue` validation for terms checkbox
 * - Pattern validation (username format)
 */
export const registrationFormDefinition: FormDefinition = {
  username: {
    type: 'text',
    label: 'Username',
    validation: {
      required: true,
      minLength: 3,
      maxLength: 20,
      pattern: 'username', // alphanumeric, underscores, hyphens
    },
  },
  email: {
    type: 'email',
    label: 'Email Address',
    validation: {
      required: true,
      pattern: 'email',
    },
  },
  password: {
    type: 'password',
    label: 'Password',
    validation: {
      required: true,
      minLength: 8,
      maxLength: 100,
    },
  },
  confirmPassword: {
    type: 'password',
    label: 'Confirm Password',
    validation: {
      required: true,
      matchValue: 'password', // Must match the password field
    },
  },
  acceptTerms: {
    type: 'checkbox',
    inlineLabel: 'I accept the terms and conditions',
    validation: {
      mustBeTrue: true, // Must be checked to submit
    },
  },
  newsletter: {
    type: 'checkbox',
    inlineLabel: 'Subscribe to newsletter (optional)',
  },
};
