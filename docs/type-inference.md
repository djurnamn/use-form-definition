# Type inference

`use-form-definition` infers TypeScript types from your form definitions, so you don't keep a separate type in sync with the definition by hand.

## Basic type inference

### Manual types

```typescript
// Writing the type by hand, separate from the definition
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

### Inferred types

```typescript
import { InferFormType, generateOptions } from 'use-form-definition';

// The type is derived from the definition
const userFormDefinition = {
  name: { type: 'text', validation: { required: true } },
  email: { type: 'email', validation: { required: true } },
  age: { type: 'number', validation: { min: 0 } },
  isActive: { type: 'checkbox' }
} as const;

// Type inferred from the definition
type UserFormData = InferFormType<typeof userFormDefinition>;
// UserFormData = {
//   name: string;
//   email: string;
//   age?: number;
//   isActive?: boolean;
// }

const options = generateOptions(userFormDefinition);
const formInstance = useForm(options); // typed from the definition
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

## Fluent form builder API

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
// Inferred from the builder chain
```

## Server action integration

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

## Why it's set up this way

The definition is the single source for the form's shape, so the type can't drift from it the way a hand-written interface can - rename a field or change its rules and the type updates with it, with autocomplete and compile errors following. The same definition also drives a Zod schema, so the values are validated at runtime, not only checked at compile time.
