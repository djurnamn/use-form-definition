# Next.js example

This example demonstrates `use-form-definition` with Next.js 16, showcasing server actions, API route validation, async validation, and i18n support.

## Features demonstrated

- **Server actions with progressive enhancement** - the server-action form submits and validates server-side even with JavaScript disabled; with JS it adds client-side validation and `isPending`
- **API routes** - form validation in API route handlers
- **Async validation** - username availability checked against an API as you type
- **Internationalization** - translation with `next-intl`, including server-side error message translation
- **App Router** - works with the Next.js App Router
- **React 19** - `useActionState`-based server actions

## Running the example

```bash
# From the repository root
pnpm install

# Navigate to this example
cd examples/nextjs

# Start the development server
pnpm dev
```

## Tests

End-to-end tests (Playwright) cover the server-action form both with JavaScript enabled (client-validation gate, single-click success, `<select>` keeps its value across a failed submit) and disabled (server-side errors render, fields repopulate, success view shows):

```bash
cd examples/nextjs
pnpm test:e2e
```

The spec lives in `e2e/server-action.spec.ts`; config in `playwright.config.ts`. `@playwright/test` is a devDependency of this example. (The library's own unit tests live in the repo root - run `pnpm test` there.)

## Project structure

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
├── messages/                 # i18n translation files
├── e2e/                      # Playwright end-to-end tests
└── playwright.config.ts
```

## Forms included

### Server action form (`/server-action`)

Demonstrates server-side validation with `generateDataValidator` and progressive enhancement. The action returns translated field errors (via `next-intl`'s `getTranslations`) plus `values` so the form repopulates on a no-JS round-trip:

```typescript
// actions.ts
'use server';
import { getTranslations } from 'next-intl/server';
import { generateDataValidator, parseValidationErrors } from 'use-form-definition/server';

export async function submitForm(prevState: unknown, formData: FormData) {
  const result = generateDataValidator(definition)(formData);

  if (!result.success) {
    const t = await getTranslations();
    return {
      success: false as const,
      errors: parseValidationErrors(result.error.issues, (key) => t(`form.validation.${key}`)),
      values: Object.fromEntries(formData.entries()),
    };
  }

  // Process valid data...
  return { success: true as const, data: result.data };
}
```

### API route form (`/api-route`)

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

### Async validation form (`/async-validation`)

Demonstrates field validation against an API as the user types:

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

## Key concepts

### Server action integration

Pass the server action to `useFormDefinition` - the hook owns `useActionState` and returns `actionState` / `isPending`, and `<RenderedForm>` wires `<form action={...}>` so it works with or without JavaScript. Render the result view from `actionState` (effects don't run without JS, so a `onSuccess` callback alone wouldn't show it):

```tsx
'use client';
const { RenderedForm, actionState, isPending } = useFormDefinition(definition, {
  serverAction: submitFeedback,
});

if (actionState?.success) {
  return <SuccessView data={actionState.data} />;
}

return <RenderedForm />; // server-side errors are shown on the fields automatically
```

Without JS: the `<form>` posts natively, the server validates and returns translated errors + `values`, and the page re-renders server-side with the errors on the fields and the inputs repopulated. With JS: `<RenderedForm>` intercepts, runs client-side validation, then dispatches the action inside a transition (so `isPending` works); server errors come back on the fields.

(Passing `serverAction` as a `<RenderedForm serverAction={...}>` prop with `onSuccess`/`onError` callbacks still works for client-only flows, but only the hook option exposes `actionState`.)

### Translation setup

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

### Locale routing

The example uses Next.js App Router with `[locale]` dynamic segments for i18n support.
