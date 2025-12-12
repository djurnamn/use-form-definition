# Basic React Example

This example demonstrates the core features of `use-form-definition` using the library's built-in unstyled components with Vite and React.

## Features Demonstrated

- **Built-in unstyled components** - No custom component wrappers needed
- **Basic validation** - required, minLength, maxLength, min, max
- **Pattern validation** - email, username
- **Conditional validation** - `requiredWhen` for fields that depend on other field values
- **Password matching** - `matchValue` to ensure two fields match
- **Checkbox validation** - `mustBeTrue` for required checkboxes
- **Repeater fields** - Dynamic lists with add/remove, minRows/maxRows validation

## Forms Included

1. **Contact Form** - Demonstrates conditional validation with `requiredWhen`
2. **Registration Form** - Demonstrates `matchValue` and `mustBeTrue` validation
3. **Order Form** - Demonstrates repeater fields with nested field definitions

## Running the Example

```bash
# From the repository root
pnpm install

# Navigate to this example
cd examples/basic-react

# Start the development server
pnpm dev
```

## Project Structure

```
basic-react/
├── src/
│   ├── forms/           # Form definitions
│   │   ├── contact.ts
│   │   ├── register.ts
│   │   ├── order.ts
│   │   └── index.ts
│   ├── lib/
│   │   └── form.ts      # Form hook configuration
│   ├── pages/           # Page components
│   │   ├── HomePage.tsx
│   │   ├── ContactPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── OrderPage.tsx
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

## Key Concepts

### Built-in Components

This example uses the library's built-in unstyled components with minimal configuration in `lib/form.ts`:

```typescript
import { createFormDefinitionHook, Field } from 'use-form-definition';

// The library provides default field type mappings for all common HTML5 input types,
// so we only need to configure the Field wrapper component.
export const useFormDefinition = createFormDefinitionHook({
  formComponents: {
    Field: Field,
  },
});
```

The library automatically provides default components for all standard field types (text, email, password, number, select, checkbox, textarea, repeater, etc.). You only need to explicitly configure components if you want to use custom implementations.

### Form Definitions

Forms are defined declaratively:

```typescript
export const contactFormDefinition: FormDefinition = {
  name: {
    type: 'text',
    label: 'Full Name',
    validation: {
      required: true,
      minLength: 2,
    },
  },
  // ... more fields
};
```

### Using Forms

The `RenderedForm` component handles everything:

```tsx
function ContactPage() {
  const { RenderedForm } = useFormDefinition(contactFormDefinition);

  const handleSubmit = (data) => {
    console.log('Form submitted:', data);
  };

  return <RenderedForm onSubmit={handleSubmit} />;
}
```
