# Next.js Example

This example demonstrates `use-form-definition` with Next.js 15, showcasing server actions, API route validation, async validation, and i18n support.

## Features Demonstrated

- **Server Actions** - Server-side validation with `generateDataValidator`
- **API Routes** - Form validation in API route handlers
- **Async Validation** - Real-time username availability checking
- **Internationalization** - Translation support with `next-intl`
- **App Router** - Full compatibility with Next.js App Router
- **React 19** - Built-in `useActionState` support

## Running the Example

```bash
# From the repository root
pnpm install

# Navigate to this example
cd examples/nextjs

# Start the development server
pnpm dev
```

## Project Structure

```
nextjs/
├── app/
│   ├── [locale]/
│   │   ├── server-action/     # Server action form demo
│   │   ├── api-route/         # API route validation demo
│   │   ├── async-validation/  # Async validation demo
│   │   ├── layout.tsx
│   │   └── page.tsx           # Home page with navigation
│   ├── api/
│   │   ├── contact/           # Contact form API endpoint
│   │   └── check-username/    # Username availability endpoint
│   ├── layout.tsx
│   └── page.tsx               # Redirects to locale
├── components/
│   └── form/
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── TextArea.tsx
│       ├── Checkbox.tsx
│       ├── Field.tsx
│       └── index.ts
├── lib/
│   └── form.ts               # Form hook configuration
└── messages/                 # i18n translation files
```

## Forms Included

### Server Action Form (`/server-action`)

Demonstrates server-side validation using `generateDataValidator`:

```typescript
// actions.ts
'use server';
import { generateDataValidator } from 'use-form-definition/server';

export async function submitForm(prevState: any, formData: FormData) {
  const validator = generateDataValidator(definition);
  const result = validator(formData);

  if (!result.success) {
    return { success: false, errors: result.errors };
  }

  // Process valid data...
  return { success: true, data: result.data };
}
```

### API Route Form (`/api-route`)

Demonstrates validation in Next.js API routes:

```typescript
// route.ts
import { generateDataValidator } from 'use-form-definition/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const validator = generateDataValidator(definition);
  const result = validator(formData);

  if (!result.success) {
    return Response.json({ errors: result.errors }, { status: 400 });
  }

  return Response.json({ data: result.data });
}
```

### Async Validation Form (`/async-validation`)

Demonstrates real-time field validation with API calls:

```typescript
const definition: FormDefinition = {
  username: {
    type: 'text',
    validation: {
      required: true,
      minLength: 3,
      // Async validation handled via plugin
    }
  }
};
```

## Key Concepts

### Server Action Integration

The `RenderedForm` component supports server actions via the `action` prop:

```tsx
<RenderedForm
  action={serverAction}
  onSuccess={(result) => {
    // Handle success
  }}
  onError={(result) => {
    // Errors are automatically displayed on fields
  }}
/>
```

### Translation Setup

Using the hook pattern with `next-intl`:

```typescript
// lib/form.ts
import { useTranslations } from 'next-intl';

export const useFormDefinition = createFormDefinitionHook({
  components: { /* ... */ },
  translation: {
    hook: useTranslations,
  }
});
```

### Locale Routing

The example uses Next.js App Router with `[locale]` dynamic segments for i18n support.
