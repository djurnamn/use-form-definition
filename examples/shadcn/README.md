# shadcn/ui example

This example demonstrates `use-form-definition` with shadcn/ui and Tailwind CSS, showing how definition-driven forms simplify the typical shadcn + react-hook-form + zod setup.

## Features demonstrated

- **Definition-driven forms** - replace manual form composition with declarative definitions
- **shadcn/ui components** - Input, Select, Checkbox, Textarea, Button
- **Tailwind CSS v4** - utility-first styling
- **Custom Field wrapper** - consistent label and error handling
- **Responsive layout** - grid-based layout with half-width support

## Running the example

```bash
# From the repository root
pnpm install

# Navigate to this example
cd examples/shadcn

# Start the development server
pnpm dev
```

## Project structure

```
shadcn/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── label.tsx
│   │   └── form/            # Form wrapper components
│   │       ├── ShadcnInput.tsx
│   │       ├── ShadcnSelect.tsx
│   │       ├── ShadcnCheckbox.tsx
│   │       ├── ShadcnTextarea.tsx
│   │       ├── ShadcnField.tsx
│   │       ├── ShadcnLayoutContainer.tsx
│   │       ├── ShadcnLayoutItem.tsx
│   │       ├── ShadcnActions.tsx
│   │       └── index.ts
│   ├── forms/
│   │   └── user.ts          # User form definition
│   ├── lib/
│   │   ├── form.tsx         # Form hook configuration
│   │   └── utils.ts         # cn() utility
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   └── UserPage.tsx
│   └── App.tsx
└── package.json
```

## Why use-form-definition with shadcn?

The usual shadcn/ui + react-hook-form + zod approach repeats the same wiring for every field:

```tsx
// Traditional approach
const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  // ... more fields
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' }
  });

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* Repeat for every field... */}
    </Form>
  );
}
```

With `use-form-definition`, define once and render:

```tsx
// Definition-driven approach
const userFormDefinition: FormDefinition = {
  name: {
    type: 'text',
    label: 'Name',
    validation: { required: true, minLength: 2 }
  },
  email: {
    type: 'email',
    label: 'Email',
    validation: { required: true }
  }
};

function MyForm() {
  const { RenderedForm } = useFormDefinition(userFormDefinition);
  return <RenderedForm onSubmit={handleSubmit} />;
}
```

## Key concepts

### Form hook configuration

```typescript
// lib/form.tsx
import { createFormDefinitionHook } from 'use-form-definition';
import {
  ShadcnInput,
  ShadcnSelect,
  ShadcnCheckbox,
  ShadcnTextarea,
  ShadcnField,
  ShadcnLayoutContainer,
  ShadcnLayoutItem,
  ShadcnActions
} from '@/components/form';

export const useFormDefinition = createFormDefinitionHook({
  components: {
    text: ShadcnInput,
    email: ShadcnInput,
    password: ShadcnInput,
    select: ShadcnSelect,
    checkbox: {
      component: ShadcnCheckbox,
      ignoreFieldWrapper: true
    },
    textarea: ShadcnTextarea
  },
  formComponents: {
    Field: ShadcnField,
    LayoutContainer: ShadcnLayoutContainer,
    LayoutItem: ShadcnLayoutItem,
    Actions: ShadcnActions
  }
});
```

### Form definition

```typescript
// forms/user.ts
export const userFormDefinition: FormDefinition = {
  firstName: {
    type: 'text',
    label: 'First Name',
    validation: { required: true },
    layout: { half: true }
  },
  lastName: {
    type: 'text',
    label: 'Last Name',
    validation: { required: true },
    layout: { half: true }
  },
  email: {
    type: 'email',
    label: 'Email',
    validation: { required: true }
  },
  theme: {
    type: 'select',
    label: 'Theme',
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'system', label: 'Match system' }
    ],
    validation: { required: true }
  },
  acceptTerms: {
    type: 'checkbox',
    label: 'I accept the terms and conditions',
    validation: { mustBeTrue: true }
  }
};
```

### Layout system

The example uses a Tailwind-based grid layout:

```typescript
// ShadcnLayoutContainer.tsx
export function ShadcnLayoutContainer({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

// ShadcnLayoutItem.tsx
export function ShadcnLayoutItem({
  children,
  half
}: {
  children: React.ReactNode;
  half?: boolean;
}) {
  return <div className={half ? '' : 'col-span-2'}>{children}</div>;
}
```
