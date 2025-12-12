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
    SubmitButton?: React.ComponentType<any> | false;
  };

  // Translation configuration
  translation?: TranslationConfig;

  // Custom validation rules
  validation?: Record<string, ValidationRule<any>>;

  // Plugin registry for async validation
  pluginRegistry?: PluginRegistry;
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
  SubmitButton,
  LayoutContainer,
  LayoutItem
} = useFormDefinition(definition, options?);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `definition` | `FormDefinition` | Your form field definitions |
| `options` | `FormDefinitionHookOptions` | Runtime options (optional) |

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `form` | `UseFormReturn` | React Hook Form instance |
| `RenderedField` | Component | Renders a single field by name |
| `RenderedForm` | Component | Auto-renders entire form with layout |
| `Form` | Component | Form wrapper for custom layouts |
| `SubmitButton` | Component | Submit button with loading states |
| `LayoutContainer` | Component | Layout container (optional) |
| `LayoutItem` | Component | Layout item (optional) |

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
  label?: string | boolean;
  placeholder?: string | boolean;

  // Validation
  validation?: ValidationRules;

  // Select options
  options?: SelectOption[];
  optionsCallback?: () => Promise<SelectOption[]>;

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

Renders a single field by name.

```tsx
<RenderedField name="email" />
```

### RenderedForm

Auto-renders all fields with layout and submit button.

```tsx
// Client-side form
<RenderedForm onSubmit={(data) => console.log(data)} />

// Server action form
<RenderedForm
  action={serverAction}
  onSuccess={(result) => handleSuccess(result)}
  onError={(result) => handleError(result)}
/>
```

### Form

Wrapper component for custom layouts.

```tsx
<Form onSubmit={form.handleSubmit(onSubmit)}>
  {/* Custom layout */}
</Form>
```

### SubmitButton

Submit button with automatic loading states.

```tsx
<SubmitButton>Submit</SubmitButton>
<SubmitButton disabled={!form.formState.isValid}>Save</SubmitButton>
```

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

Generate a validator for server-side form data.

```typescript
import { generateDataValidator } from 'use-form-definition/server';

const validator = generateDataValidator(definition);
const result = validator(formData);

if (result.success) {
  // result.data contains validated data
} else {
  // result.errors contains field errors
}
```

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
