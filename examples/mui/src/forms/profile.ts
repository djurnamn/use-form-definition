import { FormDefinition } from 'use-form-definition';

/**
 * Profile form definition demonstrating MUI integration
 *
 * This form showcases:
 * - Standard text fields with floating labels (MuiTextField)
 * - Select dropdown (MuiSelect)
 * - Textarea with multiline (MuiTextField with multiline)
 * - Checkbox with inlineLabel (MuiCheckbox)
 * - DatePicker with hidden input pattern (MuiDatePicker)
 * - Autocomplete with hidden input pattern (MuiAutocomplete)
 * - Custom layout props using MUI Grid2 breakpoints (xs, sm)
 *
 * Note: All field types use ignoreFieldWrapper: true because MUI components
 * handle their own labels and error states internally.
 *
 * Layout:
 * - First/Last name and Email/Phone use half-width columns on tablet+
 * - All other fields are full width (no layout prop = xs: 12 default)
 */
export const profileFormDefinition: FormDefinition = {
  firstName: {
    type: 'text',
    label: 'First Name',
    layout: { xs: 12, sm: 6 }, // Half width on tablet+
    validation: {
      required: true,
      minLength: 2,
    },
  },
  lastName: {
    type: 'text',
    label: 'Last Name',
    layout: { xs: 12, sm: 6 }, // Half width on tablet+
    validation: {
      required: true,
      minLength: 2,
    },
  },
  email: {
    type: 'email',
    label: 'Email Address',
    layout: { xs: 12, sm: 6 }, // Half width on tablet+
    validation: {
      required: true,
      pattern: 'email',
    },
  },
  phone: {
    type: 'text',
    label: 'Phone Number',
    layout: { xs: 12, sm: 6 }, // Half width on tablet+
    validation: {
      pattern: 'phone',
    },
  },
  // DatePicker - demonstrates MUI X DatePicker with hidden input pattern
  birthDate: {
    type: 'date',
    label: 'Birth Date',
  },
  // Select - standard MUI Select component
  role: {
    type: 'select',
    label: 'Role',
    options: [
      { value: 'developer', label: 'Developer' },
      { value: 'designer', label: 'Designer' },
      { value: 'manager', label: 'Manager' },
      { value: 'other', label: 'Other' },
    ],
    placeholder: 'Select a role...',
    validation: {
      required: true,
    },
  },
  // Autocomplete - demonstrates hidden input pattern for
  // complex UI components that don't output native form elements
  country: {
    type: 'autocomplete',
    label: 'Country',
    options: [
      { value: 'us', label: 'United States' },
      { value: 'uk', label: 'United Kingdom' },
      { value: 'ca', label: 'Canada' },
      { value: 'au', label: 'Australia' },
      { value: 'de', label: 'Germany' },
      { value: 'fr', label: 'France' },
      { value: 'se', label: 'Sweden' },
      { value: 'no', label: 'Norway' },
      { value: 'dk', label: 'Denmark' },
      { value: 'fi', label: 'Finland' },
    ],
    placeholder: 'Search for a country...',
  },
  bio: {
    type: 'textarea',
    label: 'Bio',
    multiline: true,
    rows: 4,
    validation: {
      maxLength: 500,
    },
  },
  newsletter: {
    type: 'checkbox',
    inlineLabel: 'Subscribe to newsletter',
  }
};
