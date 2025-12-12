# Type Inference

`use-form-definition` provides automatic type inference from your form definitions, eliminating the need for manual type definitions.

## Basic Type Inference

### Traditional Approach (Manual Types)

```typescript
// Old way - manually defining types
interface UserFormData {
  name: string;
  email: string;
  age?: number;
  isActive: boolean;
}

const userFormDefinition: FormDefinition = {
  name: { type: 'text', validation: { required: true } },
  email: { type: 'email', validation: { required: true } },
  age: { type: 'number', validation: { min: 0 } },
  isActive: { type: 'checkbox' }
};

const form = useForm<UserFormData>(generateOptions(userFormDefinition));
```

### Automatic Type Inference

```typescript
import { InferFormType, generateOptions } from 'use-form-definition';

// New way - types automatically inferred from definition
const userFormDefinition = {
  name: { type: 'text', validation: { required: true } },
  email: { type: 'email', validation: { required: true } },
  age: { type: 'number', validation: { min: 0 } },
  isActive: { type: 'checkbox' }
} as const;

// Type automatically inferred!
type UserFormData = InferFormType<typeof userFormDefinition>;
// UserFormData = {
//   name: string;
//   email: string;
//   age?: number;
//   isActive?: boolean;
// }

const options = generateOptions(userFormDefinition);
const formInstance = useForm(options); // Automatic type inference!
```

## Using createFormDefinition

```typescript
import { createFormDefinition } from 'use-form-definition';

const form = createFormDefinition({
  profile: {
    type: 'text',
    label: 'Profile Name',
    validation: { required: true, minLength: 2 }
  },
  settings: {
    type: 'repeater',
    fields: {
      key: { type: 'text', validation: { required: true } },
      value: { type: 'text', validation: { required: true } },
      enabled: { type: 'checkbox' }
    },
    validation: { minRows: 1 }
  }
});

// Get the inferred type
type FormData = typeof form._types;
// FormData = {
//   profile: string;
//   settings: Array<{
//     key: string;
//     value: string;
//     enabled?: boolean;
//   }>;
// }

// Use with React Hook Form
const formInstance = useForm<FormData>({
  defaultValues: form.defaultValues,
  resolver: form.resolver
});

// Type-safe validation
const result = form.safeParse(formInstance.getValues());
if (result.success) {
  console.log(result.data.profile); // TypeScript knows this is a string
  console.log(result.data.settings[0].key); // TypeScript knows this is a string
}
```

## Fluent Form Builder API

```typescript
import { FormBuilder } from 'use-form-definition';

const complexForm = new FormBuilder()
  .addField('title', {
    type: 'text',
    validation: { required: true, maxLength: 100 }
  })
  .addField('category', {
    type: 'select',
    options: [
      { value: 'tech', label: 'Technology' },
      { value: 'design', label: 'Design' }
    ],
    validation: { required: true }
  })
  .addRepeater('tags', {
    name: { type: 'text', validation: { required: true } },
    color: { type: 'text', validation: { pattern: 'hexColor' } }
  })
  .addField('publishDate', {
    type: 'date',
    validation: { required: true }
  })
  .build();

type ComplexFormData = typeof complexForm._types;
// Automatic type inference based on the builder chain!
```

## Server Action Integration

```typescript
import { createFormDefinition, FormActionResult } from 'use-form-definition';

const productForm = createFormDefinition({
  name: { type: 'text', validation: { required: true } },
  price: { type: 'number', validation: { required: true, min: 0 } },
  categories: {
    type: 'repeater',
    fields: {
      id: { type: 'text', validation: { required: true } },
      name: { type: 'text', validation: { required: true } }
    }
  }
});

type ProductFormData = typeof productForm._types;

// Server action with full type safety
export async function createProduct(
  prevState: any,
  formData: FormData
): Promise<FormActionResult<ProductFormData>> {

  const result = productForm.safeParse(Object.fromEntries(formData.entries()));

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors
    };
  }

  // result.data is fully typed as ProductFormData
  const productData = result.data;

  // TypeScript knows the exact structure
  await saveProduct({
    name: productData.name,        // string
    price: productData.price,      // number
    categories: productData.categories // Array<{id: string, name: string}>
  });

  return { success: true, data: productData };
}
```

## Benefits

### Automatic Type Safety
- No manual type definitions needed
- Types automatically stay in sync with form definitions
- Compile-time validation of form structure

### Better IntelliSense
- Full autocomplete for form data
- Type-aware error detection
- Better refactoring support

### Reduced Maintenance
- Single source of truth for form structure
- No risk of type/definition drift
- Automatic updates when form changes

### Runtime Safety
- Zod validation ensures runtime type safety
- Parse/safeParse methods with full typing
- Form submission validation with proper error handling
