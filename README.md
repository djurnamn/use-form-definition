# use-form-definition

A powerful, UI-agnostic React form library that generates type-safe forms from simple field definitions with Zod validation and React Hook Form integration.

## Features

- **Definition-driven**: Generate forms from simple field definitions
- **UI-agnostic**: Works with any React component library
- **Type-safe**: Full TypeScript support with automatic type inference
- **React 19 Compatible**: Built-in support for server actions
- **Plugin Architecture**: Extensible async validation and custom field types
- **Repeater Fields**: Dynamic lists with recursive field definitions
- **Translation-ready**: Pluggable i18n support
- **Copy-and-Customize**: Own your components completely

## Installation

```bash
npm install use-form-definition react react-hook-form zod
```

### Requirements

- React >= 18.0.0
- React Hook Form >= 7.0.0
- Zod >= 3.0.0 < 4.0.0

## Quick Start

### 1. Configure your form hook

```typescript
// lib/form.ts
import { createFormDefinitionHook } from 'use-form-definition';
import { Input, Select, Field } from '@/components/form';

export const useFormDefinition = createFormDefinitionHook({
  components: {
    text: Input,
    email: Input,
    select: Select,
  },
  formComponents: {
    Field: Field,
  },
});
```

### 2. Define your form

```typescript
// forms/user.ts
import { FormDefinition } from 'use-form-definition';

export const userFormDefinition: FormDefinition = {
  name: {
    type: 'text',
    label: 'Name',
    validation: { required: true, minLength: 2 },
  },
  email: {
    type: 'email',
    label: 'Email',
    validation: { required: true },
  },
  role: {
    type: 'select',
    label: 'Role',
    options: [
      { value: 'admin', label: 'Admin' },
      { value: 'user', label: 'User' },
    ],
  },
};
```

### 3. Render your form

```tsx
// components/UserForm.tsx
import { useFormDefinition } from '@/lib/form';
import { userFormDefinition } from '@/forms/user';

export function UserForm() {
  const { RenderedForm } = useFormDefinition(userFormDefinition);

  return <RenderedForm onSubmit={(data) => console.log(data)} />;
}
```

## Copy-and-Customize Components

Use the CLI to copy reference components to your project:

```bash
# Copy all basic components
npx use-form-definition copy all ./src/components/form/

# Copy individual components
npx use-form-definition copy text-input ./src/components/
npx use-form-definition copy field ./src/components/
```

## Documentation

- [API Reference](./docs/api-reference.md) - Complete API documentation
- [Plugin System](./docs/plugins.md) - Extending validation and field types
- [Repeater Fields](./docs/repeaters.md) - Dynamic list fields
- [Type Inference](./docs/type-inference.md) - Automatic TypeScript types

## Examples

See the [examples](./examples) directory for complete implementations:

| Example | Description |
|---------|-------------|
| [basic-react](./examples/basic-react) | Core features with built-in unstyled components |
| [nextjs](./examples/nextjs) | Server actions, i18n, API routes |
| [mui](./examples/mui) | Material UI integration |
| [antd](./examples/antd) | Ant Design integration |
| [shadcn](./examples/shadcn) | shadcn/ui + Tailwind CSS |

## Server Actions (Next.js)

```typescript
// Server action
'use server';
import { generateDataValidator } from 'use-form-definition/server';

export async function createUser(prevState: any, formData: FormData) {
  const validator = generateDataValidator(userFormDefinition);
  const result = validator(formData);

  if (!result.success) {
    return { success: false, errors: result.errors };
  }

  // Process valid data...
  return { success: true, data: result.data };
}
```

```tsx
// Client component
<RenderedForm
  action={createUser}
  onSuccess={(result) => console.log('Success:', result)}
/>
```

## Validation

Built-in validation rules:

```typescript
validation: {
  required: true,
  minLength: 2,
  maxLength: 100,
  pattern: 'email',        // Built-in patterns: email, url, phone, slug, username, etc.
  matchValue: 'password',  // Match another field
  requiredWhen: { field: 'type', value: 'other' },  // Conditional
  mustBeTrue: true,        // For checkboxes
  min: 0,
  max: 100,
}
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
