# API Reference

## createFormDefinitionHook

Factory function to create a pre-configured form hook for your project.

```typescript
import { createFormDefinitionHook } from 'use-form-definition';

const useFormDefinition = createFormDefinitionHook(config);
```

### Config Options

```typescript
interface FormDefinitionHookConfig {
  // Field type components (naked inputs)
  components?: Record<string, ComponentConfig>;

  // Form wrapper components
  formComponents?: {
    Field?: React.ComponentType<any>;
    Form?: React.ComponentType<any>;
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
  options?: { /* same as labels */ };
  validation?: {
    enabled?: boolean;
    localePath?: (key: string) => string;
  };
}

type TranslationFunction = (key: string, options?: Record<string, any>) => string;
```

---

## useFormDefinition (Hook)

The hook returned by `createFormDefinitionHook`.

```typescript
const {
  form,
  RenderedField,
  RenderedForm,
  Form,
  Actions,
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
| `config` | `Partial<FormConfig>` | Per-call overrides (`components`, `translation`, `noValidate`, …) |
| `serverAction` | `FormAction` | Server action for the form. When set, the hook owns `useActionState` and returns `actionState` / `isPending` / `formAction`, and `<RenderedForm>` becomes progressive-enhancement-capable (see [RenderedForm](#renderedform)). |

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `form` | `UseFormReturn` | React Hook Form instance |
| `RenderedField` | Component | Renders a single field by name |
| `RenderedForm` | Component | Auto-renders entire form with layout |
| `Form` | Component | Form wrapper for custom layouts |
| `Actions` | Component | Form actions slot (defaults to a submit button; render any action UI) |
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

  // Validation
  validation?: ValidationRules;

  // Select options (static; pass dynamic options at the call site via <RenderedField name="..." options={...} />)
  options?: SelectOption[];

  // Default value
  defaultValue?: any;

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

---

## ValidationRules

Available validation rules for fields.

```typescript
interface ValidationRules {
  // Required validation
  required?: boolean | { value: boolean; message: string };
  requiredWhen?: { field: string; value: any };

  // String validations
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: string | RegExp | { value: RegExp; message: string };

  // Field matching
  matchValue?: string | { value: string; message: string };

  // Boolean validations
  mustBeTrue?: boolean | { value: boolean; message: string };
  mustBeFalse?: boolean | { value: boolean; message: string };

  // Numeric validations
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };

  // Repeater validations
  minRows?: number | { value: number; message: string };
  maxRows?: number | { value: number; message: string };
}
```

### Built-in Patterns

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
| `options` | `SelectOption[]` | Provide async-loaded options (replaces v1's `optionsCallback`) |
| `label` | `string \| "auto" \| "none"` | Override or hide the field's label |
| `placeholder` | `string \| "auto" \| "none"` | Override or hide the placeholder |
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
| `serverAction` | `FormAction` | Server action, as an alternative to passing it to `useFormDefinition`. The hook option is preferred — only it exposes `actionState`. |
| `onSuccess` / `onError` | `(result: FormActionResult) => void` | Client-side callbacks for a server-action result. (For SSR / no-JS, render from the hook's `actionState` instead — effects don't run there.) |
| `showActions` | `boolean` | Render the actions slot (default `true`) |
| `noValidate` | `boolean` | Set `noValidate` on the `<form>`; overrides the hook/config `noValidate` for this form |
| `className`, `style` | — | Passed to the `<form>` |

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

- **Without JavaScript** — the form posts natively to the server action, which validates with the same schema; the server's field errors render server-side, and fields repopulate from `FormActionResult.values` (return `values: Object.fromEntries(formData.entries())` from the action on a failed result).
- **With JavaScript** — `<RenderedForm>` intercepts on submit, runs react-hook-form's client validation as a gate, then dispatches the action inside `startTransition` (so `isPending` updates). Server errors come back on the fields as `type: 'server'` errors. The internal `useForm` uses `mode: 'onTouched'` when a `serverAction` is configured.

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

### Form

Wrapper component for custom layouts.

```tsx
<Form onSubmit={form.handleSubmit(onSubmit)}>
  {/* Custom layout */}
</Form>
```

### Actions

The form's actions slot. Defaults to a single submit button, but can render any action UI — `[Cancel] [Save]`, destructive `[Delete]`, etc. — since the slot accepts any `React.ComponentType`.

```tsx
<Actions>Submit</Actions>
<Actions disabled={!form.formState.isValid}>Save</Actions>
```

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

The same pattern is the canonical place to apply runtime overrides like `disabled` or async-loaded `options` — the runtime data lives at the JSX site, not inside the static definition.

---

## Utility Functions

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
  // result.data — validated, typed data
} else {
  const errors = parseValidationErrors(result.error.issues);
  // errors: Record<string, string[]> — display-ready, keyed by field name
}
```

`parseValidationErrors` resolves the library's message keys to English by default; pass a translate function (e.g. `next-intl`'s `getTranslations` result) as the second argument to localize them server-side.

---

## Plugin System

### createPluginRegistry

Create a new plugin registry.

```typescript
import { createPluginRegistry } from 'use-form-definition';

const registry = createPluginRegistry();
```

### PluginRegistry Methods

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

### Global Validation Rules

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

### Field Schema Generators

```typescript
import { registerFieldSchemaGenerator } from 'use-form-definition';

registerFieldSchemaGenerator('customType', (field) => {
  return z.string(); // Return Zod schema
});
```

### Validation Helpers

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

### Built-in Plugins

```typescript
import { builtInPlugins } from 'use-form-definition';

builtInPlugins.emailDomain(['domain.com'])
builtInPlugins.passwordStrength(minLength, uppercase, lowercase, numbers, special)
builtInPlugins.confirmField('fieldName')
```

---

## Type Inference

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
