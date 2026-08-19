# use-form-definition

A UI-agnostic React form library. You write one field definition; it generates the Zod schema, manages React Hook Form state, renders the form, and exposes the same definition for server-side validation.

## When this saves you time

If you already reach for **React Hook Form + Zod** on most forms and end up repeating the same field metadata across the schema, the RHF setup, the JSX, and a server-side validator, this library bundles those four into one place.

If you only need one or two of those (for example, a single small form where writing a Zod schema by hand isn't a chore), the abstraction may not pay for itself. RHF or Zod on their own is usually enough in that case.

## What it does

- One field definition drives the schema, form state, rendering, and server-side validation
- Works with any UI library (shadcn, MUI, Ant Design, your own components)
- Types are inferred from the definition; no manual sync between schema and form
- Same definition validates client-side and server-side (Next.js server actions, API routes)
- Built-in support for nested/repeater fields, `requiredWhen` conditional rules, translation, and an async-validation plugin point
- Reference components can be copied into your project via a CLI if you'd rather own them than import them

## Installation

```bash
npm install use-form-definition react react-hook-form zod
```

### Requirements

- React >= 19.0.0
- React Hook Form >= 7.55.0
- Zod >= 3.0.0 < 4.0.0

## Quick start

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

## Conditional visibility

When a field's visibility depends on the form's current state (e.g. show "Please specify" only when "Other" is selected), drop down from `<RenderedForm />` to manual rendering with `<Form>` and `<RenderedField>`, and use `form.watch()`:

```tsx
const { form, Form, RenderedField, Actions } = useFormDefinition(contactDefinition);
const subject = form.watch('subject');

return (
  <Form onSubmit={form.handleSubmit(onSubmit)}>
    <RenderedField name="name" />
    <RenderedField name="email" />
    <RenderedField name="subject" />
    {subject === 'other' && <RenderedField name="customSubject" />}
    <RenderedField name="message" />
    <Actions />
  </Form>
);
```

The same pattern applies to per-field runtime props like `disabled` or `options`: pass them as props on `<RenderedField>` and the prop wins over the definition default. See [examples/basic-react/src/pages/ContactPage.tsx](./examples/basic-react/src/pages/ContactPage.tsx) for a working example.

One difference from `RenderedForm`: `<Form>` is a plain passthrough and does not default `method="post"`, so a submit that lands before React hydrates falls back to the browser's native GET and serializes the fields into the URL. On any form that handles credentials, pass `method="post"` yourself - see [Why client-only forms POST](./docs/api-reference.md#why-client-only-forms-post).

`<Form>` submits client-side only. If the form has a `serverAction` and you still want a custom layout (conditional fields, multi-column sections, an image beside the inputs), pass `children` to `<RenderedForm>` instead: your body renders in place of the automatic field grid, but `RenderedForm` keeps the whole progressive-enhancement path - `<form action>`, no-JS submission, and server errors on the fields. Compose it from the hook's `RenderedField` and `Actions`:

```tsx
const { form, RenderedForm, RenderedField, Actions } = useFormDefinition(definition, { serverAction });
const subject = form.watch('subject');

return (
  <RenderedForm>
    <RenderedField name="name" />
    {subject === 'other' && <RenderedField name="customSubject" />}
    <RenderedField name="message" />
    <Actions />
  </RenderedForm>
);
```

See [Custom layout](./docs/api-reference.md#custom-layout) for details.

To type custom props your field components accept (anything beyond the standard overrides), pass a second type argument to the hook: `useFormDefinition<typeof definition, { tooltip?: string }>(definition)`. Those props are then checked on `<RenderedField>`, so a typo or wrong value type is a compile error. Without it they stay permissively typed; either way they're filtered at runtime against each field type's allowlist.

## Derived fields

A field can auto-fill from a sibling field while the user hasn't claimed it - a slug that
follows the title until the user edits it by hand:

```tsx
const definition = {
  title: { type: 'text', validation: { required: true } },
  slug: { type: 'slug', deriveFrom: 'title', validation: { required: true, pattern: 'slug' } },
};
```

While the slug is empty (or still holds the last derived value), typing in the title
mirrors a transformed copy into it; a stored slug on an edit form is never touched, a
hand-edited slug stops derivation, and clearing the slug re-arms it. Derived writes don't
mark the field dirty.

The transform comes from the field kind - register it once with
`registerFieldType('slug', { deriveTransform: slugify })` - or per field via a
`deriveTransform` function on the definition. With neither, the value is mirrored
verbatim. Derivation is client-side only: server validation ignores `deriveFrom`, so the
definition stays shareable with server code. See
[Derived fields](./docs/api-reference.md#derived-fields-derivefrom) for details.

## Copy and customize components

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
- [Without JavaScript](./docs/without-javascript.md) - What works before hydration or with JS disabled, and where the boundaries run
- [Follow-ups](./docs/follow-ups.md) - Known gaps carried deliberately, with the evidence to act on them

## Examples

See the [examples](./examples) directory for complete implementations:

| Example | Description |
|---------|-------------|
| [basic-react](./examples/basic-react) | Core features with built-in unstyled components |
| [nextjs](./examples/nextjs) | Server actions, i18n, API routes |
| [mui](./examples/mui) | Material UI integration |
| [antd](./examples/antd) | Ant Design integration |
| [shadcn](./examples/shadcn) | shadcn/ui + Tailwind CSS |

## Server actions (Next.js)

Pass a server action to `useFormDefinition` and the form works with or without JavaScript: with JS it intercepts on submit, runs client-side validation, and dispatches the action; without JS the `<form>` posts natively to the server action, and the server's field errors render server-side. Render the result view from the returned `actionState`.

```typescript
// app/users/actions.ts
'use server';
import { generateDataValidator, parseValidationErrors } from 'use-form-definition/server';
import { userFormDefinition } from './definition';

export async function createUser(prevState: unknown, formData: FormData) {
  const result = generateDataValidator(userFormDefinition)(formData);

  if (!result.success) {
    return {
      success: false as const,
      errors: parseValidationErrors(result.error.issues),
      values: Object.fromEntries(formData.entries()), // so fields repopulate without JS
    };
  }

  // ...persist result.data...
  return { success: true as const, data: result.data };
}
```

```tsx
// app/users/new-user-form.tsx
'use client';
import { useFormDefinition } from '@/lib/form';
import { userFormDefinition } from './definition';
import { createUser } from './actions';

export function NewUserForm() {
  const { RenderedForm, actionState, isPending } = useFormDefinition(userFormDefinition, {
    serverAction: createUser,
  });

  if (actionState?.success) return <p>Created {String(actionState.data?.name)}.</p>;

  return <RenderedForm />; // server errors are shown on the fields automatically
}
```

(`isPending` reflects the in-flight submission. Passing `serverAction` as a `<RenderedForm serverAction={...}>` prop also works, but only the hook option exposes `actionState`.)

If you register a custom `Form` wrapper via `config.components.Form`, spread its props onto the underlying `<form>` so `action` and `onSubmit` reach it - a wrapper that drops them disables progressive enhancement silently. The default `Form` forwards them.

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

### HTML5 validation attributes

By default the rendered inputs carry no native HTML5 constraint attributes. Set `emitHtml5Attributes: true` (on the `createFormDefinitionHook(...)` config or the per-call `config`) and each input gets `required`, `pattern`, `minLength`/`maxLength`, `min`/`max`, and `step` derived from its `validation`, emitted only where they're valid for the input type. This adds a no-JS validation layer alongside react-hook-form or a server action; it's the counterpart to `noValidate`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
