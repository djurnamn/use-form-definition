# Ant Design example

This example demonstrates integrating `use-form-definition` with [Ant Design](https://ant.design/) components.

## Features demonstrated

- **Form.Item as the Field wrapper** - uses Ant Design's Form.Item component as the library's Field wrapper
- **Ant Design Input** - text, email, password, number inputs
- **Ant Design TextArea** - multiline text input
- **Ant Design Select** - dropdown selection with the hidden input pattern for form submission
- **Ant Design Checkbox** - checkbox with inline label using `inlineLabel` prop
- **Ant Design DatePicker** - date selection with the hidden input pattern
- **Ant Design Row/Col layout** - custom layout components with responsive breakpoints (24-column grid)

### Form.Item as the Field wrapper

Unlike the MUI example, which uses `ignoreFieldWrapper: true` for all components, this example uses Ant Design's `Form.Item` as the Field wrapper. `Form.Item` already *is* the Field concept: it renders the label and the error message, the same job the library's Field wrapper does. So the input components stay naked (no Form.Item inside them), and most field types don't need `ignoreFieldWrapper: true`.

```typescript
// AntField.tsx - Form.Item as Field wrapper
export function AntField({ label, error, children }: AntFieldProps) {
  const errorMessage = error?.message;
  return (
    <Form.Item
      label={label}
      validateStatus={errorMessage ? 'error' : undefined}
      help={errorMessage}
    >
      {children}
    </Form.Item>
  );
}

// AntInput.tsx - Simple "naked" input
export const AntInput = forwardRef<InputRef, InputProps>((props, ref) => {
  return <Input {...props} ref={ref} />;
});

// form.ts configuration
formComponents: {
  Field: AntField,  // Form.Item as Field wrapper
}
```

The only exception is **checkbox**, which handles its own inline label and uses `ignoreFieldWrapper: true`.

### Hidden input pattern

Some Ant Design components (Select, DatePicker) don't render native form elements. For form submission to work, we include hidden inputs:

```tsx
const AntSelect = ({ name, value, onChange, options, ...props }) => {
  return (
    <>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value || ''} />
      <Select value={value} onChange={onChange} options={options} {...props} />
    </>
  );
};
```

### Custom layout system

The library's default layout uses a 2-column CSS grid with a `half` prop. This example replaces it with **Ant Design Row/Col** components using a 24-column grid:

```typescript
// Library default pattern
layout: { half: true }

// Ant Design pattern (24-column grid)
layout: { xs: 24, sm: 12 }  // Full on mobile, half on tablet+
```

## Running the example

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

## Project structure

```
examples/antd/
├── src/
│   ├── components/form/
│   │   ├── AntInput.tsx          # Text input (naked)
│   │   ├── AntTextArea.tsx       # TextArea (naked)
│   │   ├── AntSelect.tsx         # Select with hidden input
│   │   ├── AntCheckbox.tsx       # Checkbox with inlineLabel
│   │   ├── AntDatePicker.tsx     # DatePicker with hidden input
│   │   ├── AntField.tsx          # Form.Item as Field wrapper
│   │   ├── AntLayoutContainer.tsx # Row container
│   │   ├── AntLayoutItem.tsx     # Col with responsive props
│   │   ├── AntActions.tsx   # Styled submit button
│   │   └── index.ts
│   ├── forms/
│   │   └── settings.ts           # Settings form definition
│   ├── lib/
│   │   └── form.ts               # Hook configuration
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   └── SettingsPage.tsx
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

## Form configuration

The form hook is configured in `src/lib/form.ts`:

```typescript
import { createFormDefinitionHook } from 'use-form-definition';
import {
  AntInput,
  AntTextArea,
  AntSelect,
  AntCheckbox,
  AntDatePicker,
  AntField,
  AntLayoutContainer,
  AntLayoutItem,
  AntActions,
} from '@/components/form';

export const useFormDefinition = createFormDefinitionHook({
  components: {
    // Standard input components - wrapped by AntField (Form.Item)
    text: AntInput,
    email: AntInput,
    password: AntInput,
    number: AntInput,
    textarea: {
      component: AntTextArea,
      additionalProps: ['rows'],
    },
    select: {
      component: AntSelect,
      additionalProps: ['options', 'placeholder'],
    },
    date: {
      component: AntDatePicker,
      additionalProps: ['placeholder'],
    },
    // Checkbox handles its own inline label
    checkbox: {
      component: AntCheckbox,
      ignoreFieldWrapper: true,
      additionalProps: ['inlineLabel'],
    },
  },
  formComponents: {
    // Use Ant Design Form.Item as the Field wrapper
    Field: AntField,
    // Use Ant Design Row/Col for layout (24-column grid)
    LayoutContainer: AntLayoutContainer,
    LayoutItem: AntLayoutItem,
    // Register an Ant Design Button in the Actions slot
    Actions: AntActions,
  },
});
```

## Dependencies

- `antd` - Ant Design component library (v5)
- `dayjs` - Date handling for DatePicker
- `react` - React 18 (compatible with antd v5)
- `react-hook-form` - Form state management
- `zod` - Schema validation
- `use-form-definition` - Form definition library

## Key patterns

### Form.Item for labels and errors

The `AntField` component wraps inputs with Form.Item for consistent label and error display:

```typescript
export function AntField({ label, error, children }: AntFieldProps) {
  const errorMessage = error?.message;
  return (
    <Form.Item
      label={label}
      validateStatus={errorMessage ? 'error' : undefined}
      help={errorMessage}
    >
      {children}
    </Form.Item>
  );
}
```

### Checkbox with `inlineLabel`

Checkboxes render their label inline, so they use `ignoreFieldWrapper: true` and handle their own label:

```typescript
// Form definition
newsletter: {
  type: 'checkbox',
  inlineLabel: 'Subscribe to newsletter',
}

// Component
const AntCheckbox = ({ inlineLabel, value, ...props }) => (
  <Checkbox checked={!!value} {...props}>
    {inlineLabel}
  </Checkbox>
);
```

### 24-column grid system

Ant Design uses a 24-column grid. Use `layout` props to control field width:

```typescript
// Half width on tablet and up
username: {
  type: 'text',
  label: 'Username',
  layout: { xs: 24, sm: 12 },
}

// Full width (default)
bio: {
  type: 'textarea',
  label: 'Bio',
  // No layout = full width (xs: 24)
}
```

## Known issues

- **Optional select validation**: Empty optional select fields may show "Invalid selection" error. This is a library-level validation issue where empty strings don't match the enum values and `.optional()` expects `undefined`, not `""`.
