# API Reference

## createFormDefinitionHook

Factory function to create a pre-configured form hook for your project.

```typescript
import { createFormDefinitionHook } from 'use-form-definition';

const useFormDefinition = createFormDefinitionHook(config);
```

### Config options

```typescript
interface FormDefinitionHookConfig {
  // Field type components (naked inputs)
  components?: Record<string, ComponentConfig>;

  // Form wrapper components
  formComponents?: {
    Field?: React.ComponentType<any>;
    Form?: React.ComponentType<any>;
    // Form-level message region (see FormMessage). Receives { message, status }.
    // Defaults to the built-in accessible FormMessage; set to false to opt out.
    FormMessage?: React.ComponentType<any> | false;
    LayoutContainer?: React.ComponentType<any> | false;
    LayoutItem?: React.ComponentType<any> | false;
    Actions?: React.ComponentType<any> | false;
  };

  // Translation configuration
  translation?: TranslationConfig;

  // Custom validation rules
  validation?: Record<string, ValidationRule<any>>;

  // Plugin registry for async validation
  pluginRegistry?: PluginRegistry;

  // Set `noValidate` on every rendered <form> (disables the browser's HTML5
  // constraint bubbles, e.g. the <input type="email"> popup). Default: false.
  // Overridable per form via <RenderedForm noValidate>.
  noValidate?: boolean;

  // Emit native HTML5 validation attributes (required, pattern, minLength,
  // maxLength, min, max, step) on rendered inputs, derived from each field's
  // `validation` rules. Gives a no-JS validation layer alongside react-hook-form
  // / a server action. Each attribute is emitted only where it is valid HTML.
  // Default: false (output unchanged when off).
  emitHtml5Attributes?: boolean;
}
```

### ComponentConfig

```typescript
// Simple component
type SimpleConfig = React.ComponentType<any>;

// Advanced configuration
interface AdvancedConfig {
  component: React.ComponentType<any>;
  ignoreFieldWrapper?: boolean;  // Skip Field wrapper
  additionalProps?: string[];    // Props to pass from definition
}

type ComponentConfig = SimpleConfig | AdvancedConfig;
```

### TranslationConfig

```typescript
interface TranslationConfig {
  // Hook called automatically in each form (e.g., useTranslations)
  hook?: () => TranslationFunction;

  // Runtime translation function (overrides hook)
  function?: TranslationFunction;

  // Category configurations
  labels?: {
    enabled?: boolean;
    alwaysInclude?: boolean;
    localePath?: (key: string) => string;
  };
  placeholders?: { /* same as labels */ };
  descriptions?: { /* same as labels */ };
  options?: { /* same as labels */ };
  sections?: { /* same as labels; resolves a section's label from form.sections.<name> */ };
  validation?: {
    enabled?: boolean;
    localePath?: (key: string) => string;
  };
}

type TranslationFunction = (key: string, options?: Record<string, any>) => string;
```

---

## useFormDefinition (hook)

The hook returned by `createFormDefinitionHook`.

```typescript
const {
  form,
  RenderedField,
  RenderedForm,
  Form,
  Actions,
  FormMessage,
  LayoutContainer,
  LayoutItem
} = useFormDefinition(definition, options?);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `definition` | `FormDefinition` | Your form field definitions |
| `options` | `FormDefinitionHookOptions` | Runtime options (optional) |

`options` fields:

| Field | Type | Description |
|-------|------|-------------|
| `form` | `UseFormReturn` | Bring your own `useForm()` instance instead of letting the hook create one |
| `config` | `Partial<FormConfig>` | Per-call overrides (`components`, `translation`, `noValidate`, ...) |
| `serverAction` | `FormAction` | Server action for the form. When set, the hook owns `useActionState` and returns `actionState` / `isPending` / `formAction`, and `<RenderedForm>` becomes progressive-enhancement-capable (see [RenderedForm](#renderedform)). |

### Return value

| Property | Type | Description |
|----------|------|-------------|
| `form` | `UseFormReturn` | React Hook Form instance |
| `RenderedField` | Component | Renders a single field by name |
| `RenderedForm` | Component | Auto-renders entire form with layout |
| `Form` | Component | Form wrapper for custom layouts |
| `Actions` | Component | Form actions slot (defaults to a submit button; render any action UI) |
| `FormMessage` | Component \| `null` | Form-level message region (see [FormMessage](#formmessage)); the configured component, for manual composition. `null` when the slot is set to `false` |
| `LayoutContainer` | Component | Layout container (optional) |
| `LayoutItem` | Component | Layout item (optional) |
| `actionState` | `FormActionResult \| null` | Latest result from the configured `serverAction`; `null` until the first submission, or if no `serverAction` was provided. Render your success / result view from this so it works with or without JS. |
| `isPending` | `boolean` | Whether the configured `serverAction` is currently running (`false` if none). |
| `formAction` | `((formData: FormData) => void) \| null` | The bound action `<RenderedForm>` wires to `<form action={...}>`; mostly internal. `null` if no `serverAction`. |

---

## FormDefinition

Type definition for form field configuration.

```typescript
type FormDefinition = Record<string, FormFieldDefinition>;

interface FormFieldDefinition {
  // Required
  type: string;

  // Field metadata
  name?: string;
  label?: string | "auto" | "none";
  placeholder?: string | "auto" | "none";
  // Explanatory text rendered by the Field wrapper under the control with
  // id="<fieldId>-description"; built-in controls point aria-describedby at it.
  // A field type that allowlists `description` in additionalProps receives it
  // on the control instead, as the control's own inline description.
  description?: string | "auto" | "none";

  // Validation
  validation?: ValidationRules;

  // Select options (static; pass dynamic options at the call site via <RenderedField name="..." options={...} />)
  options?: SelectOption[];

  // Default value
  defaultValue?: any;

  // Derive this field's value from a sibling field while the user hasn't claimed it
  deriveFrom?: string;
  deriveTransform?: (value: unknown) => unknown;

  // Read-only state
  readOnly?: boolean;

  // Layout props (passed to LayoutItem)
  layout?: Record<string, any>;

  // Repeater-specific
  fields?: FormDefinition;
  hideHeader?: boolean;
  disableAddRow?: boolean;
  disableRemoveRow?: boolean;

  // Additional custom props
  [key: string]: any;
}

interface SelectOption {
  value: string | number;
  label: string;
}
```

### Derived fields (`deriveFrom`)

`deriveFrom: "<sibling key>"` mirrors a transformed copy of a sibling field's value into
this field while the user hasn't claimed it - the classic case is a slug that auto-fills
from a title until the user edits it by hand:

```typescript
const definition = {
  title: { type: 'text', validation: { required: true } },
  slug: {
    type: 'slug',
    deriveFrom: 'title',
    validation: { required: true, pattern: 'slug' },
  },
};
```

The rules:

- While the target is **empty or still equal to the last derived value**, every change to
  the source writes `transform(sourceValue)` into it.
- A stored value (an edit form) is never overwritten - it differs from any derivation and
  the field isn't empty, so derivation never engages.
- Editing the target by hand stops derivation; **clearing it re-arms** it.
- Derived writes don't mark the target dirty (`shouldDirty: false`); user edits still do.

The transform is resolved at runtime, in order: a per-field `deriveTransform` function on
the definition, else the kind-level transform registered via
`registerFieldType(type, { deriveTransform })`, else identity (a verbatim mirror).

Derivation is client-side only - a live-preview affordance. Server code ignores
`deriveFrom` entirely (`generateSchema` / `generateDataValidator` treat it as inert), so a
definition carrying it stays serializable and shareable with server validation; keep the
per-field `deriveTransform` (a function) out of shared definitions and register the
transform at the kind level instead.

---

## ValidationRules

Available validation rules for fields. This is the permissive umbrella type
(`BaseValidationRules` in the source) used for `validation` on a generic
`type: string` field - every rule is optional so any definition type-checks. For
strict per-type rules, use `createField<T>()` or the specific rule types
(`StringValidationRules`, `NumberValidationRules`, etc.).

Each rule accepts either a bare value or a `{ value, message }` object; the
`message` can be a plain string or a `{ key, options }` translation reference.

```typescript
interface ValidationRules {
  // Required validation
  required?: boolean | { value: boolean; message: string };
  requiredWhen?: { field: string; value: string | number | boolean };

  // String validations
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: string | RegExp | { value: RegExp; message: string };
  email?: boolean;
  contains?: string | { value: string; message: string };
  startsWith?: string | { value: string; message: string };
  endsWith?: string | { value: string; message: string };
  noWhitespace?: boolean | { value: boolean; message: string };
  uppercase?: boolean | { value: boolean; message: string };
  lowercase?: boolean | { value: boolean; message: string };

  // Field matching
  matchValue?: string | { value: string; message: string };

  // Numeric validations
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  step?: number | { value: number; message: string };
  integer?: boolean;
  positive?: boolean;
  negative?: boolean;
  nonNegative?: boolean;
  nonPositive?: boolean;

  // Boolean validations
  mustBeTrue?: boolean;
  mustBeFalse?: boolean;

  // Repeater validations
  minRows?: number | { value: number; message: string };
  maxRows?: number | { value: number; message: string };
}
```

### Built-in patterns

Use these with `validation: { pattern: 'patternName' }`:

| Pattern | Description |
|---------|-------------|
| `email` | Email address |
| `url` | URL format |
| `phone` | International phone |
| `slug` | URL-friendly slug |
| `username` | Letters, numbers, dots, underscores, hyphens |
| `alphanumeric` | Letters and numbers only |
| `numeric` | Numbers only |
| `alpha` | Letters only |
| `postalCode` | Generic postal code |
| `hexColor` | Hex color code (#RGB or #RRGGBB) |

---

## Components

### RenderedField

Renders a single field by name from the form definition.

```tsx
<RenderedField name="email" />
```

Runtime override props let you pass values that override the field's static definition. The prop wins; the definition is the default.

| Prop | Type | Effect |
|------|------|--------|
| `disabled` | `boolean` | Disable the field at render time |
| `options` | `SelectOption[]` | Provide async-loaded options at render time |
| `label` | `string \| "auto" \| "none"` | Override or hide the field's label |
| `placeholder` | `string \| "auto" \| "none"` | Override or hide the placeholder |
| `description` | `string \| "auto" \| "none"` | Override or hide the field's explanatory text |
| `className`, `style` | standard React | Forwarded to the field component |
| `render` | `(field) => ReactNode` | Custom render override (escape hatch) |

Any other prop is forwarded to the underlying field component, subject to the field type's `additionalProps` allowlist.

```tsx
// Load options at runtime instead of baking them into the definition
const roleOptions = useRoleOptions();
<RenderedField name="role" options={roleOptions} />

// Disable a field based on state
<RenderedField name="firstName" disabled={!canEditName} />
```

By default forwarded extras are untyped. Pass a second type argument to `useFormDefinition` (or `createFormDefinitionHook`) describing the custom props your field components accept, and those props become typed on `RenderedField` - a typo or wrong value type is then a compile error:

```tsx
const { RenderedField } = useFormDefinition<typeof definition, { tooltip?: string }>(definition);

<RenderedField name="email" tooltip="We never share it." /> // ✓
<RenderedField name="email" toolttip="..." />                  // ✗ typo caught
```

The runtime allowlist (`additionalProps`) is unchanged - typing the extras only adds compile-time checking on top.

The `Extras` type is per-form: the declared extras are allowed on every field. Narrowing the allowed extras by field *type* (for example, `inlineLabel` only on `checkbox`) is something we're considering for a future release; it isn't available yet. Either way, an extra targeted at the wrong field type is still dropped at runtime by that field type's `additionalProps` allowlist.

### RenderedForm

Auto-renders all fields with layout and an actions slot.

```tsx
// Client-side form
<RenderedForm onSubmit={(data) => console.log(data)} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `onSubmit` | `(data) => void` | Called with validated data (client-side forms only) |
| `serverAction` | `FormAction` | Server action, as an alternative to passing it to `useFormDefinition`. The hook option is preferred - only it exposes `actionState`. |
| `onSuccess` / `onError` | `(result: FormActionResult) => void` | Client-side callbacks for a server-action result. (For SSR / no-JS, render from the hook's `actionState` instead - effects don't run there.) |
| `showActions` | `boolean` | Render the actions slot (default `true`). Ignored when `children` is provided |
| `children` | `ReactNode` | Custom form body, rendered instead of the automatic field grid while `RenderedForm` keeps all form wiring. Compose from `RenderedField` + `Actions`. See [Custom layout](#custom-layout) |
| `noValidate` | `boolean` | Set `noValidate` on the `<form>`; overrides the hook/config `noValidate` for this form |
| `method` | `'get' \| 'post'` | The `<form>`'s method. Client-only forms default to `'post'` - see [Why client-only forms POST](#why-client-only-forms-post). Pass `'get'` for search/filter forms. Ignored when a server action is configured. |
| `className`, `style` | - | Passed to the `<form>` |

<a id="why-client-only-forms-post"></a>
**Why client-only forms POST**

A form wired with `onSubmit` and no server action gets no `action` attribute, so before React hydrates a native submit uses the browser's default method - **GET**, which serializes every field into the URL. For a sign-in or password-reset form that puts the password in browser history, in the `Referer` header of anything the page loads next, and in every access log in front of the app. The window is not theoretical: it is the whole page load on a slow connection, and permanent for anyone whose JavaScript fails to run.

Client-only forms therefore render `method="post"` by default. Once hydrated the method is irrelevant - the submit handler calls `preventDefault()` - so this only changes the pre-hydration failure mode, from "leaks the fields into the URL" to "posts them to a route that ignores them".

Pass `method="get"` where the query string is the point (a search or filter form that should be linkable). Server-action forms are unaffected: React renders its own multipart POST to the action endpoint and owns the method itself.

The default is `RenderedForm`'s alone. The hook's plain `<Form>` wrapper is a passthrough and does not set `method` - when composing manually with `<Form onSubmit={...}>`, pass `method="post"` explicitly on forms that handle credentials.

**Server actions & progressive enhancement**

Pass the server action to `useFormDefinition` (not as a prop) to get the progressive-enhancement behavior and `actionState`:

```tsx
'use client';
const { RenderedForm, actionState, isPending } = useFormDefinition(definition, {
  serverAction: createUser,
});

if (actionState?.success) return <ResultView data={actionState.data} />;
return <RenderedForm />;
```

`<RenderedForm>` wires the action via `<form action={...}>`, so:

- **Without JavaScript** - the form posts natively to the server action, which validates with the same schema; the server's field errors render server-side, and fields repopulate from `FormActionResult.values` (return `values: Object.fromEntries(formData.entries())` from the action on a failed result).
- **With JavaScript** - `<RenderedForm>` intercepts on submit, runs react-hook-form's client validation as a gate, then dispatches the action inside `startTransition` (so `isPending` updates). Server errors come back on the fields as `type: 'server'` errors. The internal `useForm` uses `mode: 'onTouched'` when a `serverAction` is configured.

> **Custom `Form` component:** if you register your own wrapper via `config.components.Form`, it must spread its props onto the underlying `<form>` element (so `action` and `onSubmit` reach it). `<RenderedForm>` wires the server action through those props; a custom `Form` that drops them disables progressive enhancement silently - the form renders, but no-JS submission and client dispatch stop working. The default `Form` forwards them for you.

Server action shape (see also [`generateDataValidator`](#generatedatavalidator)):

```typescript
'use server';
import { generateDataValidator, parseValidationErrors } from 'use-form-definition/server';

export async function createUser(prevState: unknown, formData: FormData) {
  const result = generateDataValidator(definition)(formData);
  if (!result.success) {
    return {
      success: false as const,
      errors: parseValidationErrors(result.error.issues),
      values: Object.fromEntries(formData.entries()),
    };
  }
  return { success: true as const, data: result.data };
}
```

#### Custom layout

By default `<RenderedForm>` lays out the fields itself (`LayoutContainer` / a `LayoutItem` per field). Pass `children` to supply your own body instead - it renders in place of the automatic grid, while `RenderedForm` keeps owning all the form wiring above: the `<form action>` / `onSubmit` progressive-enhancement path, `actionState` → `form.setError`, no-JS value repopulation, and the `onSuccess` / `onError` callbacks. Compose the body from the hook's `RenderedField` and `Actions`, arranged however you like:

```tsx
const { RenderedForm, RenderedField, Actions } = useFormDefinition(definition, {
  serverAction: createUser,
});

return (
  <RenderedForm>
    <div className="two-column">
      <RenderedField name="avatar" />
      <div>
        <RenderedField name="name" />
        <RenderedField name="slug" />
      </div>
    </div>
    <RenderedField name="bio" />
    <Actions />
  </RenderedForm>
);
```

Each hand-placed `RenderedField` still shows the server action's field errors on SSR / no-JS, so progressive enhancement survives a bespoke layout. That is the difference from dropping down to [`Form`](#form) + `RenderedField`, which also gives full layout control but is client-only submission - it loses the server-action wiring. `showActions` is ignored in this mode; place `<Actions />` yourself.

### Sections

A form partitioned into named sections renders the active section's controls while
every inactive section's fields render as hidden value mirrors, so the post carries the
whole form on both submit paths. The surface, in brief; the full contract is in
[docs/sections.md](./sections.md).

```tsx
const { RenderedForm, RenderedSection, RenderedField, sections } = useFormDefinition(
  definition,
  { sections: { general: ['name', 'email'], lore: ['bio'] } } // optional declared map
);

<RenderedForm currentSection={tab}>
  <RenderedSection name="general">...</RenderedSection>
  <RenderedSection name="lore">...</RenderedSection>
</RenderedForm>
```

- **`sections` hook option** - the declared partition, `Record<name, fieldKey[]>`. With it
  and no JSX sections, `RenderedForm` renders each section through the zero-config path.
- **`currentSection` on `RenderedForm`** - the active section. Omitted, everything renders.
- **`RenderedSection`** - `{ name, children }`; its fields render as controls when active
  and as mirrors otherwise.
- **`sections` on the return** (`SectionsApi`) - `validate(name)` validates one section's
  fields with focus on the first error; `of(fieldKey)`, `fields(name)` and
  `withErrors(errors)` answer membership questions so navigation stays app state.
- **`components.Section`** (or `formComponents` on the factory) - the wrapper around each
  section, receiving `{ name, label, active, children }`. A fragment by default.
- **`mirror` on `registerFieldType`** - a custom wire encoding for a kind's value mirror
  when the runtime-type derivation (boolean pair, JSON for arrays and objects,
  `String(value)` otherwise) is not what the kind's control posts.

### Form

Wrapper component for custom layouts.

```tsx
<Form onSubmit={form.handleSubmit(onSubmit)}>
  {/* Custom layout */}
</Form>
```

### Actions

The form's actions slot. Defaults to a single submit button, but can render any action UI - `[Cancel] [Save]`, destructive `[Delete]`, and so on - since the slot accepts any `React.ComponentType`.

```tsx
<Actions>Submit</Actions>
<Actions disabled={!form.formState.isValid}>Save</Actions>
```

### FormMessage

The form-level message region. `<RenderedForm>` renders it inside the `<form>`, above the fields, whenever the form carries a message that has no per-field home - a rate-limit refusal, an expired reset link, "invalid credentials", and so on. It surfaces the message from either channel:

- a **server-action envelope** `message` (`actionState.message`), with severity taken from the result's `success` flag (`error` / `success` / `info`); and
- a **client-side whole-form error** as react-hook-form's `root` error (`form.setError('root', ...)`), always `error` severity.

The envelope takes precedence when both are present, and the region renders nothing when there is no message. So a server action can refuse the whole form without inventing a fake field:

```ts
// server action
return { success: false, message: 'Reset link is invalid or expired' };
```

Register your own component to restyle it - the same way you supply `Field` and `Actions`:

```tsx
const useFormDefinition = createFormDefinitionHook({
  formComponents: {
    FormMessage: ({ message, status }) => (
      <Banner tone={status}>{message}</Banner>
    ),
  },
});
```

A registered component receives `{ message: string; status?: 'error' | 'success' | 'info' }`. Set the slot to `false` to opt out of the region entirely - `RenderedForm` renders no region and the hook returns `FormMessage: null`. The built-in default is minimal and accessible: a single element with `role="alert"` for errors (`role="status"` otherwise), plus `data-status` and `data-form-message` styling hooks.

If your server action already returns a `message` that you render yourself from `actionState`, note that it will now also appear in this region; opt out with `FormMessage: false` to keep your own rendering.

### Conditional rendering

For show/hide logic based on the form's current state, drop down from `<RenderedForm />` to manual rendering with `<Form>` and `<RenderedField>`, and use `form.watch()`:

```tsx
const { form, Form, RenderedField, Actions } = useFormDefinition(definition);
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

The same pattern is the canonical place to apply runtime overrides like `disabled` or async-loaded `options` - the runtime data lives at the JSX site, not inside the static definition.

> `<Form>` here submits client-side only. If the form has a `serverAction`, put the same `form.watch()`-driven fields inside [`<RenderedForm>`'s `children`](#custom-layout) instead - you keep the show/hide logic *and* the server-action wiring (`<form action>`, no-JS submission, server errors on the fields).

---

## Utility functions

### generateOptions

Generate React Hook Form options from a definition.

```typescript
import { generateOptions } from 'use-form-definition';

const options = generateOptions(definition);
// Returns: { defaultValues, resolver, _types }

type FormData = typeof options._types;
const form = useForm<FormData>(options);
```

### generateSchema

Generate a Zod schema synchronously.

```typescript
import { generateSchema } from 'use-form-definition';

const schema = generateSchema(definition);
```

### generateSchemaAsync

Generate a Zod schema with plugin support (async).

```typescript
import { generateSchemaAsync } from 'use-form-definition';

const schema = await generateSchemaAsync(definition, formData);
```

### generateDataValidator

Generate a validator for server-side `FormData`. Returns a Zod `SafeParseReturnType`.

```typescript
import { generateDataValidator, parseValidationErrors } from 'use-form-definition/server';

const result = generateDataValidator(definition)(formData);

if (result.success) {
  // result.data - validated, typed data
} else {
  const errors = parseValidationErrors(result.error.issues);
  // errors: Record<string, string[]> - display-ready, keyed by field name
}
```

`parseValidationErrors` resolves the library's message keys to English by default; pass a translate function (e.g. `next-intl`'s `getTranslations` result) as the second argument to localize them server-side.

Some keys carry interpolation values. The count-based keys (`minLength`, `maxLength`, `min`, `max`, `minRows`, `maxRows`) pass a `{count}`, and the string keys `contains`, `startsWith`, and `endsWith` pass a `{value}` holding the constraint string - so a translation can read `Must contain "{value}"`. See the Next.js example's `messages/*.json` for the full set.

Nested issue paths (a repeater cell, an item inside a custom structured kind) group under their top-level key: an issue at `classes.0.level` lands in `errors.classes`. The envelope stays flat and top-level-keyed by design - it is what `sectionsWithErrors` matches on and what the no-JS round trip renders. Item errors render at the item on the client, where validation re-runs with the same schema; see [Repeater fields](./repeaters.md#item-errors).

### getNestedError

Read one item's error out of a structured field's error tree. A structured field (the built-in repeater, or a custom kind whose schema is an array/object) receives its react-hook-form error as a nested tree with every message already translated; `getNestedError` resolves a path inside it to the leaf `FieldError`, or `undefined` when nothing failed there or the path stops at a branch (a whole row).

```typescript
import { getNestedError, type NestedFieldError } from 'use-form-definition';

// Inside a custom structured field component:
const cellError = getNestedError(error, [rowIndex, 'level']);
// or the string form:
const cellError2 = getNestedError(error, '0.level');

cellError?.message; // display-ready, same translation as a top-level field
```

---

## Plugin system

### createPluginRegistry

Create a new plugin registry.

```typescript
import { createPluginRegistry } from 'use-form-definition';

const registry = createPluginRegistry();
```

### PluginRegistry methods

```typescript
interface PluginRegistry {
  register(
    name: string,
    plugin: ValidationPlugin,
    metadata: PluginMetadata,
    fieldTypes?: string[]
  ): void;

  unregister(name: string): boolean;

  get(name: string): RegisteredPlugin | undefined;

  getForFieldType(fieldType: string): RegisteredPlugin[];

  getAll(): RegisteredPlugin[];
}
```

### Global validation rules

```typescript
import {
  registerValidationRuleGlobal,
  getValidationRuleGlobal,
  getAvailableValidationRules
} from 'use-form-definition';

// Register a custom rule
registerValidationRuleGlobal('customRule', {
  validate: (value) => /* boolean */,
  message: 'Error message'
});

// Get a rule
const rule = getValidationRuleGlobal('customRule');

// List all rules
const rules = getAvailableValidationRules();
```

### Custom field kinds

An unregistered field type validates as a string everywhere - but it must still have a
**component**: a field whose kind has none (`components` on `createFormDefinitionHook`, or `config.fieldTypes` on the call) renders
nothing where it is active while its mirror keeps posting from inactive sections, so the
hook throws at creation in development (and warns once in production) naming the field
and kind. The component must also render a named native form element carrying its value,
or the field posts nothing; in development a server-action submit warns when the form holds
a value the post does not carry. To give a custom kind a different value type - so it validates correctly on **both** the client resolver
(`generateOptions`) and the server data validator (`generateDataValidator`), and seeds the
right default value - register it with `registerFieldType`:

```typescript
import { registerFieldType } from 'use-form-definition';
import { z } from 'zod';
// (also exported from 'use-form-definition/server' for the server bundle)

// A public/private toggle whose value is a boolean, validated like a checkbox:
registerFieldType('visibility', { valueType: 'boolean' });

// Borrow an existing kind's exact validator by name (incl. select's option/enum handling):
registerFieldType('togglePrivate', { validatesAs: 'checkbox' });

// Or a fully custom Zod generator (co-registered with a default value):
registerFieldType('csv', {
  generator: (field) => z.string().transform((v) => v.split(',')),
  defaultValue: '',
});

// A kind-level derive transform for `deriveFrom` fields of this kind (see Derived fields):
registerFieldType('slug', { deriveTransform: slugify });
```

Provide exactly one of `valueType` (`"string" | "number" | "boolean" | "date"`), `validatesAs`
(borrow a registered kind's validator; called `schema` until 2.8.0, still accepted and
deprecated), or `generator`; `defaultValue` is optional and overrides the
resolved default. `deriveTransform` can accompany any of them, or stand alone to attach a
transform to a kind whose validation is already registered (or a built-in) without
touching it. The rendering side still picks the field's component by kind (via the
`components` / `fieldTypes` map) - this only declares how the kind *validates* (and,
with `deriveTransform`, how it derives).

Call it once at module scope, from code imported by both the client and server bundles, so
the two validators agree.

### Field schema generators

For the low-level case - registering only a Zod generator, without the value-type/default
wiring - use `registerFieldSchemaGenerator` (what `registerFieldType`'s `generator` form
calls under the hood):

```typescript
import { registerFieldSchemaGenerator } from 'use-form-definition';

registerFieldSchemaGenerator('customType', (field) => {
  return z.string(); // Return Zod schema
});
```

### Validation helpers

```typescript
import {
  ValidationComposer,
  createAsyncValidationRule,
  createDependentValidationRule
} from 'use-form-definition';

// Compose multiple rules
const composed = ValidationComposer
  .create()
  .add(rule1)
  .add(rule2)
  .compose();

// Create async rule
const asyncRule = createAsyncValidationRule(
  async (value) => /* boolean */,
  'Error message'
);

// Create dependent rule
const dependentRule = createDependentValidationRule(
  ['otherField'],
  (value, dependentValues) => /* boolean */,
  'Error message'
);
```

### Built-in plugins

```typescript
import { builtInPlugins } from 'use-form-definition';

builtInPlugins.emailDomain(['domain.com'])
builtInPlugins.passwordStrength(minLength, uppercase, lowercase, numbers, special)
builtInPlugins.confirmField('fieldName')
```

---

## Type inference

### InferFormType

Infer TypeScript types from a form definition.

```typescript
import { InferFormType } from 'use-form-definition';

const definition = {
  name: { type: 'text', validation: { required: true } },
  age: { type: 'number' }
} as const;

type FormData = InferFormType<typeof definition>;
// { name: string; age?: number }
```

### createFormDefinition

Create a form definition with type inference.

```typescript
import { createFormDefinition } from 'use-form-definition';

const form = createFormDefinition({
  name: { type: 'text', validation: { required: true } }
});

type FormData = typeof form._types;
```

### FormBuilder

Fluent API for building typed form definitions.

```typescript
import { FormBuilder } from 'use-form-definition';

const form = new FormBuilder()
  .addField('name', { type: 'text', validation: { required: true } })
  .addRepeater('items', {
    name: { type: 'text' }
  })
  .build();

type FormData = typeof form._types;
```
