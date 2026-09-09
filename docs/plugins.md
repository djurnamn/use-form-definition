# Plugin system

Plugins extend the schema the library generates. Register an async validation rule, a custom field type, or a cross-field check, and it runs when the schema is built.

## Table of contents

- [Basic plugin registration](#basic-plugin-registration)
- [Validation rule registry](#validation-rule-registry)
- [Field schema generator registry](#field-schema-generator-registry)
- [Built-in plugins](#built-in-plugins)
- [Custom async validation](#custom-async-validation)
- [Cross-field validation](#cross-field-validation)
- [Validation rule composition](#validation-rule-composition)
- [Plugin management](#plugin-management)

## Basic plugin registration

### Simple validation plugin

```typescript
import { createPluginRegistry, ValidationPlugin } from 'use-form-definition';
import { z } from 'zod';

// Create a simple validation plugin
const uniqueUsernamePlugin: ValidationPlugin = async (context) => {
  if (context.field.type !== 'text') {
    return { schema: z.any() };
  }

  const schema = z.string().refine(
    async (username) => {
      if (!username) return true;
      const response = await fetch(`/api/users/check-username/${username}`);
      const { available } = await response.json();
      return available;
    },
    { message: 'Username is already taken' }
  );

  return { schema };
};

// Create a registry and register the plugin
const registry = createPluginRegistry();
registry.register(
  'unique-username',
  uniqueUsernamePlugin,
  {
    name: 'unique-username',
    version: '1.0.0',
    description: 'Validates username uniqueness via API',
    author: 'Your Team'
  },
  ['text']
);

// Pass the registry to your form hook
const useFormDefinition = createFormDefinitionHook({
  components: { /* your components */ },
  pluginRegistry: registry
});
```

### Using async schema generation

```typescript
import { generateSchemaAsync } from 'use-form-definition';

const formDefinition = {
  username: {
    type: 'text',
    label: 'Username',
    validation: { required: true, minLength: 3 }
  }
};

// Use async schema generation to enable plugin validation
const schema = await generateSchemaAsync(formDefinition);
```

## Validation rule registry

### Registering custom validation rules

```typescript
import { registerValidationRuleGlobal } from 'use-form-definition';

// Register a custom validation rule
registerValidationRuleGlobal('creditCard', {
  validate: (value: string) => {
    if (!value) return true;
    // Luhn algorithm for credit card validation
    const digits = value.replace(/\s/g, '').split('').map(Number);
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  },
  message: 'Please enter a valid credit card number'
});

// Use in form definition
const paymentForm = {
  cardNumber: {
    type: 'text',
    label: 'Credit Card Number',
    validation: {
      required: true,
      pattern: 'creditCard'
    }
  }
};
```

### Pattern-based validation rules

```typescript
import { registerValidationRuleGlobal } from 'use-form-definition';

// Register a custom pattern
registerValidationRuleGlobal('socialSecurity', {
  pattern: /^\d{3}-\d{2}-\d{4}$/,
  message: 'Social Security Number must be in format: XXX-XX-XXXX'
});

// Register a rule with transformation
registerValidationRuleGlobal('phoneNumber', {
  pattern: /^\(\d{3}\) \d{3}-\d{4}$/,
  transform: (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    return value;
  },
  message: 'Phone number must be in format: (XXX) XXX-XXXX'
});
```

## Field schema generator registry

### Declaring a custom kind's value type

For the common case - "this custom kind is really a boolean / number / date / string" -
reach for `registerFieldType` rather than hand-writing a generator. It registers the schema
*and* the default value keyed by type, so the kind validates the same on the client resolver
and the server data validator:

```typescript
import { registerFieldType } from 'use-form-definition';

// A public/private toggle: validates like a checkbox everywhere, defaults to `false`.
registerFieldType('visibility', { valueType: 'boolean' });

// Borrow an existing kind's validator by name instead of a bare value type:
registerFieldType('togglePrivate', { validatesAs: 'checkbox' });
```

`valueType` accepts `"string" | "number" | "boolean" | "date"`. Use `validatesAs` to borrow a
registered kind's exact validator (e.g. `"select"` for its option/enum handling), or
`generator` for a fully custom Zod schema (below). Register once at module scope, in code
imported by both the client and server bundles.

(`validatesAs` was called `schema` until 2.8.0. The old spelling still works and is
deprecated: it read as "a zod schema goes here", which it never accepted. A kind registered
this way is also what a repeater row property borrows with `validatesAs` - see
[Row state the cells do not cover](./repeaters.md#row-state-the-cells-do-not-cover).)

### Custom field type

For a fully custom Zod schema, register a generator directly. (`registerFieldType`'s
`generator` form is a thin wrapper over this that also records a default value.)

```typescript
import { registerFieldSchemaGenerator } from 'use-form-definition';
import { z } from 'zod';

// Register a custom field type for JSON input
registerFieldSchemaGenerator('json', (field) => {
  let schema = z.string().transform((value) => {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error('Invalid JSON format');
    }
  });

  if (field.validation?.required) {
    return schema.refine((val) => val !== undefined, {
      message: 'This field is required'
    });
  }

  return schema.optional();
});

// Use the custom field type
const configForm = {
  settings: {
    type: 'json',
    label: 'Configuration Settings',
    validation: { required: true }
  }
};
```

### Item errors in structured kinds

A kind whose generator returns an array or object schema is a *structured* kind: a single
definition key whose value has items of its own, each of which can fail validation
individually. The resolver roots each item issue under the kind's top-level key, so the
error the component receives on its `error` prop is a nested tree mirroring the value's
shape - not a flat `FieldError`. Every `message` in the tree is already translated, the
same way a top-level field's message is.

Read item errors with `getNestedError` - the component never needs to reach into
`formState.errors` itself:

```tsx
import { getNestedError, type NestedFieldError } from 'use-form-definition';
import type { FieldError } from 'react-hook-form';

interface StatListProps {
  name: string;
  value?: Array<{ key: string; level: string }>;
  onChange: (value: unknown) => void;
  error?: FieldError | NestedFieldError;
}

function StatList({ name, value = [], onChange, error }: StatListProps) {
  return (
    <div>
      {value.map((item, index) => {
        const levelError = getNestedError(error, [index, 'level']);
        return (
          <div key={index}>
            {/* ...the item's controls... */}
            {levelError?.message && <span role="alert">{levelError.message}</span>}
          </div>
        );
      })}
    </div>
  );
}
```

The path is relative to the field (`[index, 'level']`, or the string form
`'0.level'`); the helper returns the leaf `FieldError` there, or `undefined` when
nothing failed at that path or the path stops at a branch (a whole item's map of
errors). A whole-value message - a `refine` on the array itself, say - sits on the
error directly (`error.message` when the error is flat), so a structured kind that
renders both covers every rule its schema can produce. The built-in repeater works
exactly this way; [Repeater fields](./repeaters.md#item-errors) shows the rendered
behaviour.

Server-side, `parseValidationErrors` groups item issues under the top-level key
without item position - the flat envelope is a stated boundary of the no-JS path,
not something a kind should try to parse item positions out of. See the note on
[`parseValidationErrors`](./api-reference.md#generatedatavalidator).

### File upload field type

```typescript
import { registerFieldSchemaGenerator } from 'use-form-definition';

registerFieldSchemaGenerator('file', (field) => {
  let schema = z.instanceof(File);

  if (field.validation?.maxSize) {
    schema = schema.refine(
      (file) => file.size <= field.validation.maxSize,
      { message: `File size must be less than ${field.validation.maxSize} bytes` }
    );
  }

  if (field.validation?.allowedTypes) {
    const allowedTypes = field.validation.allowedTypes;
    schema = schema.refine(
      (file) => allowedTypes.includes(file.type),
      { message: `File type must be one of: ${allowedTypes.join(', ')}` }
    );
  }

  return field.validation?.required ? schema : schema.optional();
});
```

## Built-in plugins

### Email domain validation

```typescript
import { createPluginRegistry, builtInPlugins } from 'use-form-definition';

const registry = createPluginRegistry();

registry.register(
  'company-email',
  builtInPlugins.emailDomain(['company.com', 'subsidiary.com']),
  {
    name: 'company-email',
    version: '1.0.0',
    description: 'Restricts email to company domains'
  },
  ['email']
);
```

### Password strength validation

```typescript
registry.register(
  'strong-password',
  builtInPlugins.passwordStrength(
    12,    // minimum length
    true,  // require uppercase
    true,  // require lowercase
    true,  // require numbers
    true   // require special chars
  ),
  { name: 'strong-password', version: '1.0.0' },
  ['password']
);
```

### Confirm field validation

```typescript
registry.register(
  'confirm-password',
  builtInPlugins.confirmField('password'),
  { name: 'confirm-password', version: '1.0.0' },
  ['password']
);

const registrationForm = {
  password: {
    type: 'password',
    label: 'Password',
    validation: { required: true }
  },
  confirmPassword: {
    type: 'password',
    label: 'Confirm Password',
    validation: { required: true }
  }
};
```

## Custom async validation

### API-based validation

```typescript
import { createAsyncValidationRule, createPluginRegistry } from 'use-form-definition';

const registry = createPluginRegistry();

const emailUniquenessRule = createAsyncValidationRule(
  async (email: string, context) => {
    if (!email || context.field.type !== 'email') return true;

    const response = await fetch('/api/users/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const { available } = await response.json();
    return available;
  },
  'This email address is already registered'
);

registry.register(
  'unique-email',
  emailUniquenessRule,
  { name: 'unique-email', version: '1.0.0' },
  ['email']
);
```

## Cross-field validation

### Dependent field validation

```typescript
import { createDependentValidationRule, createPluginRegistry } from 'use-form-definition';

const registry = createPluginRegistry();

// End date must be after start date
const dateRangeValidation = createDependentValidationRule(
  ['startDate'],
  (endDate, dependentValues) => {
    if (!endDate || !dependentValues.startDate) return true;
    return new Date(endDate) > new Date(dependentValues.startDate);
  },
  'End date must be after start date'
);

registry.register(
  'date-range',
  dateRangeValidation,
  { name: 'date-range', version: '1.0.0' },
  ['date', 'datetime-local']
);
```

### Conditional validation

```typescript
import { ValidationPlugin } from 'use-form-definition';

const conditionalRequiredPlugin: ValidationPlugin = (context) => {
  const { field, formData } = context;

  if (formData?.accountType === 'business' && context.fieldKey === 'companyName') {
    const schema = z.string().min(1, 'Company name is required for business accounts');
    return { schema };
  }

  return { schema: z.any() };
};
```

## Validation rule composition

### Complex validation logic

```typescript
import { ValidationComposer, createAsyncValidationRule, createPluginRegistry } from 'use-form-definition';

const registry = createPluginRegistry();

const complexUsernameValidation = ValidationComposer
  .create()
  .add(createAsyncValidationRule(
    async (username) => {
      const response = await fetch(`/api/check-username/${username}`);
      return response.ok;
    },
    'Username is not available'
  ))
  .add(createAsyncValidationRule(
    async (username) => {
      const response = await fetch(`/api/check-prohibited/${username}`);
      return response.ok;
    },
    'Username contains prohibited content'
  ))
  .compose();

registry.register(
  'comprehensive-username',
  complexUsernameValidation,
  { name: 'comprehensive-username', version: '1.0.0' },
  ['text']
);
```

## Plugin management

```typescript
import { createPluginRegistry } from 'use-form-definition';

const registry = createPluginRegistry();

// Register plugins conditionally
if (process.env.NODE_ENV === 'development') {
  registry.register('debug-validator', debugPlugin, debugMetadata);
}

// List registered plugins
const allPlugins = registry.getAll();
const emailPlugins = registry.getForFieldType('email');

// Cleanup when done
registry.unregister('debug-validator');
```

## Notes

A few things worth keeping in mind when writing plugins:

- A plugin sees every field it's registered for, so guard for empty values and for field types you don't handle - return `z.any()` or `schema.optional()` in those cases, as the examples above do.
- Don't let a plugin throw on a failed request. A rejected `fetch` in an async rule shouldn't take the whole form's validation down with it.
- Async rules run on validation, which can be every keystroke. Cache what you can so a single character doesn't fire a request each time.
- The `metadata` you pass at registration (`name`, `version`, `description`) is yours to use however you like; the registry only reads `name` for lookup.
