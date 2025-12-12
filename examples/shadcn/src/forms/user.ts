import { FormDefinition } from 'use-form-definition';

/**
 * User form definition demonstrating shadcn/ui integration.
 *
 * This form showcases how use-form-definition simplifies the typical
 * shadcn/ui + react-hook-form + zod pattern:
 *
 * BEFORE (Manual approach):
 * 1. Define Zod schema separately
 * 2. Create resolver with zodResolver
 * 3. Use useForm with schema
 * 4. Compose FormField, FormItem, FormLabel, FormControl, FormMessage for each field
 *
 * AFTER (use-form-definition):
 * 1. Define form with validation inline
 * 2. Use <RenderedForm /> or <RenderedField /> components
 * 3. Same definition validates on server with generateDataValidator()
 *
 * Layout:
 * - First/Last name use half: true for side-by-side on larger screens
 * - All other fields span full width
 */
export const userFormDefinition: FormDefinition = {
  firstName: {
    type: 'text',
    label: 'First Name',
    layout: { half: true },
    validation: {
      required: true,
      minLength: 2,
    },
  },
  lastName: {
    type: 'text',
    label: 'Last Name',
    layout: { half: true },
    validation: {
      required: true,
      minLength: 2,
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
  username: {
    type: 'text',
    label: 'Username',
    validation: {
      required: true,
      minLength: 3,
      maxLength: 20,
      pattern: 'username',
    },
  },
  password: {
    type: 'password',
    label: 'Password',
    validation: {
      required: true,
      minLength: 8,
    },
  },
  confirmPassword: {
    type: 'password',
    label: 'Confirm Password',
    validation: {
      required: true,
      matchValue: 'password',
    },
  },
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
  bio: {
    type: 'textarea',
    label: 'Bio',
    validation: {
      maxLength: 500,
    },
  },
  newsletter: {
    type: 'checkbox',
    inlineLabel: 'Subscribe to newsletter',
  },
  terms: {
    type: 'checkbox',
    inlineLabel: 'I agree to the terms and conditions',
    validation: {
      mustBeTrue: true,
    },
  },
};
