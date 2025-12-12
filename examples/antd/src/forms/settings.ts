import { FormDefinition } from 'use-form-definition';

/**
 * Settings form definition demonstrating Ant Design integration
 *
 * This form showcases:
 * - Standard text fields with Form.Item labels (AntInput)
 * - TextArea for multiline text (AntTextArea)
 * - Select dropdown with hidden input pattern (AntSelect)
 * - Checkbox with inlineLabel (AntCheckbox)
 * - DatePicker with hidden input pattern (AntDatePicker)
 * - Custom layout props using Ant Design's 24-column grid (xs, sm)
 *
 * Note: All field types use ignoreFieldWrapper: true because Ant Design
 * Form.Item handles labels and error states internally.
 *
 * Layout:
 * - Username and Email use half-width columns on tablet+ (sm: 12)
 * - All other fields are full width (no layout prop = xs: 24 default)
 */
export const settingsFormDefinition: FormDefinition = {
  username: {
    type: 'text',
    label: 'Username',
    layout: { xs: 24, sm: 12 }, // Half width on tablet+
    validation: {
      required: true,
      minLength: 3,
      maxLength: 20,
      pattern: 'username',
    },
  },
  email: {
    type: 'email',
    label: 'Email Address',
    layout: { xs: 24, sm: 12 }, // Half width on tablet+
    validation: {
      required: true,
      pattern: 'email',
    },
  },
  displayName: {
    type: 'text',
    label: 'Display Name',
    validation: {
      minLength: 2,
      maxLength: 50,
    },
  },
  // DatePicker - demonstrates hidden input pattern
  birthDate: {
    type: 'date',
    label: 'Birth Date',
    placeholder: 'Select date',
  },
  // Select - demonstrates hidden input pattern for form submission
  timezone: {
    type: 'select',
    label: 'Timezone',
    options: [
      { value: 'utc', label: 'UTC' },
      { value: 'est', label: 'Eastern Time (ET)' },
      { value: 'pst', label: 'Pacific Time (PT)' },
      { value: 'cet', label: 'Central European Time (CET)' },
      { value: 'jst', label: 'Japan Standard Time (JST)' },
      { value: 'aest', label: 'Australian Eastern Time (AEST)' },
    ],
    placeholder: 'Select timezone...',
    validation: {
      required: true,
    },
  },
  language: {
    type: 'select',
    label: 'Language',
    options: [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Spanish' },
      { value: 'fr', label: 'French' },
      { value: 'de', label: 'German' },
      { value: 'zh', label: 'Chinese' },
      { value: 'ja', label: 'Japanese' },
    ],
    placeholder: 'Select language...',
  },
  bio: {
    type: 'textarea',
    label: 'Bio',
    rows: 4,
    validation: {
      maxLength: 500,
    },
  },
  emailNotifications: {
    type: 'checkbox',
    inlineLabel: 'Receive email notifications',
  },
  marketingEmails: {
    type: 'checkbox',
    inlineLabel: 'Receive marketing emails',
  },
};
