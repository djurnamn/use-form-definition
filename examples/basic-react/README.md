# Basic React example

This example demonstrates the core features of `use-form-definition` using the library's built-in unstyled components with Vite and React.

## Features demonstrated

- **Built-in unstyled components** - No custom component wrappers needed
- **Basic validation** - required, minLength, maxLength, min, max
- **Pattern validation** - email, username
- **Conditional validation** - `requiredWhen` for fields that depend on other field values
- **Password matching** - `matchValue` to ensure two fields match
- **Checkbox validation** - `mustBeTrue` for required checkboxes
- **Repeater fields** - Dynamic lists with add/remove, minRows/maxRows validation
- **Typed forwarded extras** - a custom `helpText` prop on `RenderedField`, type-checked via the hook's second type argument (contact form)

## Forms included

1. **Contact form** - conditional validation with `requiredWhen`
2. **Registration form** - `matchValue` and `mustBeTrue` validation
3. **Order form** - repeater fields with nested field definitions

## Running the example

```bash
# From the repository root
pnpm install

# Navigate to this example
cd examples/basic-react

# Start the development server
pnpm dev
```

## Project structure

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

## Key concepts

### Built-in components

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

### Typed forwarded extras

Field components can accept custom runtime props beyond the standard overrides. This example registers a `HintInput` for the `text` and `email` types that reads a `helpText` prop, and lists it in `additionalProps` so the value is forwarded at runtime:

```typescript
import { HintInput } from './HintInput';

export const useFormDefinition = createFormDefinitionHook({
  formComponents: { Field },
  components: {
    text: { component: HintInput, additionalProps: ['helpText'] },
    email: { component: HintInput, additionalProps: ['helpText'] },
  },
});
```

By default forwarded extras are untyped. Pass the props your components accept as the hook's second type argument to get compile-time checking - see `ContactPage.tsx`:

```tsx
type FieldExtras = { helpText?: string };

const { RenderedField } = useFormDefinition<typeof contactFormDefinition, FieldExtras>(
  contactFormDefinition,
);

<RenderedField name="email" helpText="We'll only use this to reply." /> // ok
<RenderedField name="email" helpTxt="..." />                           // compile error
```

### Form definitions

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

### Using forms

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
