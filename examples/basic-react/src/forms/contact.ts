import { FormDefinition } from 'use-form-definition';

/**
 * Contact form definition
 *
 * Demonstrates:
 * - Basic field types (text, email, select, textarea)
 * - Required validation
 * - Pattern validation (email)
 * - Length validation
 * - Conditional required (requiredWhen)
 */
export const contactFormDefinition: FormDefinition = {
  name: {
    type: 'text',
    label: 'Full Name',
    validation: {
      required: true,
      minLength: 2,
      maxLength: 100,
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
  subject: {
    type: 'select',
    label: 'Subject',
    options: [
      { value: '', label: 'Select a subject...' },
      { value: 'general', label: 'General Inquiry' },
      { value: 'support', label: 'Technical Support' },
      { value: 'sales', label: 'Sales Question' },
      { value: 'other', label: 'Other' },
    ],
    validation: {
      required: true,
    },
  },
  // Only required when subject is "other"
  customSubject: {
    type: 'text',
    label: 'Please specify',
    validation: {
      requiredWhen: {
        field: 'subject',
        value: 'other',
      },
      minLength: 3,
    },
  },
  message: {
    type: 'textarea',
    label: 'Message',
    validation: {
      required: true,
      minLength: 10,
      maxLength: 1000,
    },
  },
  newsletter: {
    type: 'checkbox',
    inlineLabel: 'Subscribe to newsletter',
  },
};
