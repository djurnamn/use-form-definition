# MUI example

This example demonstrates integrating `use-form-definition` with [Material UI (MUI)](https://mui.com/) components.

## Features demonstrated

- **MUI TextField** - Standard text, email, password, number, and textarea inputs with floating labels
- **MUI Select** - Dropdown selection with options
- **MUI Checkbox** - Checkbox with inline label using `inlineLabel` prop
- **MUI DatePicker** - Date selection using `@mui/x-date-pickers` (hidden input pattern)
- **MUI Autocomplete** - Searchable dropdown with type-ahead (hidden input pattern)
- **MUI Grid2 layout** - custom layout components with responsive breakpoints
- **No field wrapper** - uses `ignoreFieldWrapper: true` since MUI components handle their own labels and errors

### Hidden input pattern

This example demonstrates the **hidden input pattern** for MUI components that don't render native form elements. Components like `DatePicker` and `Autocomplete` are complex UI widgets that don't output `<input>` or `<select>` elements, which means their values won't be included in `FormData` during form submission.

The solution is to include a hidden input alongside these components:

```tsx
const MuiAutocomplete = ({ name, value, onChange, ...props }) => {
  return (
    <>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value || ''} />

      <Autocomplete
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        {...props}
      />
    </>
  );
};
```

The hidden input carries the component's value in `FormData`, so the form submits and validates server-side and keeps working without JS.

### Custom layout system

The library provides default `LayoutContainer` and `LayoutItem` components using CSS grid with a `half` prop. This example replaces them with **MUI Grid2** components, demonstrating how to customize the layout system for your UI library.

**Library default:**
```typescript
// Default layout uses `half: true` for half-width fields
firstName: {
  type: 'text',
  label: 'First Name',
  layout: { half: true },
}
```

**MUI custom layout:**
```typescript
// MUI layout uses responsive breakpoints (xs, sm, md, lg, xl)
// Only specify layout when you want something other than full width
firstName: {
  type: 'text',
  label: 'First Name',
  layout: { xs: 12, sm: 6 }, // Full on mobile, half on tablet+
}

// No layout prop = full width (xs: 12 is the default)
bio: {
  type: 'textarea',
  label: 'Bio',
  // No layout = full width
}
```

The custom layout components:

```typescript
// MuiLayoutContainer - wraps all fields
export function MuiLayoutContainer({ children }) {
  return (
    <Grid container spacing={2}>
      {children}
    </Grid>
  );
}

// MuiLayoutItem - wraps each field, receives layout props
export function MuiLayoutItem({ children, xs = 12, sm, md, lg, xl }) {
  return (
    <Grid size={{ xs, sm, md, lg, xl }}>
      {children}
    </Grid>
  );
}
```

Configure in `formComponents`:
```typescript
formComponents: {
  LayoutContainer: MuiLayoutContainer,
  LayoutItem: MuiLayoutItem,
}
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
examples/mui/
├── src/
│   ├── components/form/
│   │   ├── MuiTextField.tsx      # Text input wrapper
│   │   ├── MuiSelect.tsx         # Select dropdown wrapper
│   │   ├── MuiCheckbox.tsx       # Checkbox wrapper (inlineLabel)
│   │   ├── MuiDatePicker.tsx     # DatePicker with hidden input
│   │   ├── MuiAutocomplete.tsx   # Autocomplete with hidden input
│   │   ├── MuiLayoutContainer.tsx # Grid2 container for form layout
│   │   ├── MuiLayoutItem.tsx     # Grid2 item with responsive props
│   │   ├── MuiActions.tsx   # Styled submit button
│   │   └── index.ts
│   ├── forms/
│   │   └── profile.ts            # Profile form definition
│   ├── lib/
│   │   └── form.ts               # Hook configuration
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   └── ProfilePage.tsx
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

## Form configuration

The form hook is configured in `src/lib/form.ts`:

```typescript
import { createFormDefinitionHook } from 'use-form-definition';
import {
  MuiTextField,
  MuiSelect,
  MuiCheckbox,
  MuiDatePicker,
  MuiAutocomplete,
  MuiLayoutContainer,
  MuiLayoutItem,
  MuiActions,
} from '@/components/form';

export const useFormDefinition = createFormDefinitionHook({
  components: {
    // MUI components handle their own labels and error states,
    // so we use ignoreFieldWrapper: true for all field types
    text: {
      component: MuiTextField,
      ignoreFieldWrapper: true,
      additionalProps: ['label'],
    },
    email: {
      component: MuiTextField,
      ignoreFieldWrapper: true,
      additionalProps: ['label'],
    },
    password: {
      component: MuiTextField,
      ignoreFieldWrapper: true,
      additionalProps: ['label'],
    },
    number: {
      component: MuiTextField,
      ignoreFieldWrapper: true,
      additionalProps: ['label'],
    },
    select: {
      component: MuiSelect,
      ignoreFieldWrapper: true,
      additionalProps: ['options', 'placeholder', 'label'],
    },
    textarea: {
      component: MuiTextField,
      ignoreFieldWrapper: true,
      additionalProps: ['multiline', 'rows', 'label'],
    },
    checkbox: {
      component: MuiCheckbox,
      ignoreFieldWrapper: true,
      additionalProps: ['inlineLabel'],
    },
    date: {
      component: MuiDatePicker,
      ignoreFieldWrapper: true,
      additionalProps: ['label'],
    },
    autocomplete: {
      component: MuiAutocomplete,
      ignoreFieldWrapper: true,
      additionalProps: ['options', 'placeholder', 'label'],
    },
  },
  formComponents: {
    // MUI Grid2 for responsive layout (xs, sm, md, lg, xl breakpoints)
    LayoutContainer: MuiLayoutContainer,
    LayoutItem: MuiLayoutItem,
    // MUI Button registered in the Actions slot
    Actions: MuiActions,
  },
});
```

## Dependencies

- `@mui/material` - Core MUI components
- `@mui/x-date-pickers` - DatePicker component
- `@emotion/react` / `@emotion/styled` - MUI styling
- `dayjs` - Date handling for DatePicker
- `react-hook-form` - Form state management
- `zod` - Schema validation
- `use-form-definition` - Form definition library

## Key patterns

### Floating labels with `additionalProps`

MUI TextField supports floating labels that animate up when the field is focused or has a value. To enable this, pass the `label` prop directly to the input component using `additionalProps`:

```typescript
// Configure in form.ts
text: {
  component: MuiTextField,
  additionalProps: ['label'], // Pass label to component, not Field wrapper
},

// Form definition
firstName: {
  type: 'text',
  label: 'First Name', // This now goes to MuiTextField
  validation: { required: true },
}
```

This differs from the default library behavior where `label` goes to the Field wrapper. For MUI's floating label pattern, we want the label on the TextField itself.

### Custom actions slot

Register an MUI-styled button in the `Actions` slot to replace the library's default HTML submit button. The slot accepts any component, so you can also render a row of buttons (e.g. `[Cancel] [Save]`).

```typescript
// MuiActions.tsx
export function MuiActions({ children = 'Submit', ...props }) {
  return (
    <Button type="submit" variant="contained" color="primary" fullWidth {...props}>
      {children}
    </Button>
  );
}

// Configure in formComponents
formComponents: {
  Actions: MuiActions,
}
```

### Checkbox with `inlineLabel`

MUI checkboxes use their own label rendering via `FormControlLabel`. Use `inlineLabel` instead of `label`:

```typescript
// Form definition
newsletter: {
  type: 'checkbox',
  inlineLabel: 'Subscribe to newsletter',
}

// Component receives inlineLabel prop
const MuiCheckbox = ({ inlineLabel, ...props }) => (
  <FormControlLabel
    control={<Checkbox {...props} />}
    label={inlineLabel || ''}
  />
);
```

### Error handling

MUI components receive errors as `{ message?: string }` and handle display internally:

```typescript
const MuiTextField = ({ error, ...props }) => (
  <TextField
    error={!!error?.message}
    helperText={error?.message}
    {...props}
  />
);
```

### Using forwardRef

All input components should use `forwardRef` to pass refs to the underlying input element for React Hook Form integration:

```typescript
export const MuiTextField = forwardRef<HTMLInputElement, MuiTextFieldProps>(
  ({ error, ...props }, ref) => (
    <TextField inputRef={ref} {...props} />
  )
);
```
