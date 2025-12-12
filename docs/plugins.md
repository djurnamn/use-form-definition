# Plugin System

The plugin system allows you to extend validation capabilities, create custom field types, and compose complex validation logic while maintaining type safety.

## Table of Contents

- [Basic Plugin Registration](#basic-plugin-registration)
- [Validation Rule Registry](#validation-rule-registry)
- [Field Schema Generator Registry](#field-schema-generator-registry)
- [Built-in Plugins](#built-in-plugins)
- [Custom Async Validation](#custom-async-validation)
- [Cross-Field Validation](#cross-field-validation)
- [Validation Rule Composition](#validation-rule-composition)
- [Plugin Management](#plugin-management)

## Basic Plugin Registration

### Simple Validation Plugin

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

### Using Async Schema Generation

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

## Validation Rule Registry

### Registering Custom Validation Rules

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

### Pattern-based Validation Rules

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

## Field Schema Generator Registry

### Custom Field Type

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

### File Upload Field Type

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

## Built-in Plugins

### Email Domain Validation

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

### Password Strength Validation

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

### Confirm Field Validation

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

## Custom Async Validation

### API-based Validation

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

## Cross-Field Validation

### Dependent Field Validation

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

### Conditional Validation

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

## Validation Rule Composition

### Complex Validation Logic

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

## Plugin Management

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

## Best Practices

1. **Handle edge cases**: Check for empty values and invalid field types
2. **Use meaningful error messages**: Provide clear, actionable feedback
3. **Consider performance**: Cache expensive operations and avoid unnecessary API calls
4. **Handle failures gracefully**: Plugin failures shouldn't break form validation
5. **Document dependencies**: Clearly specify what fields or data your plugin depends on
6. **Version your plugins**: Use semantic versioning for plugin metadata
7. **Test thoroughly**: Create comprehensive test suites for custom plugins
