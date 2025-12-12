# Repeater Fields

Repeater fields allow you to create dynamic lists of form data with add/remove functionality and full validation support.

## Basic Usage

```typescript
import { FormDefinition } from 'use-form-definition';

const formDefinition: FormDefinition = {
  items: {
    type: 'repeater',
    label: 'Items',
    fields: {
      name: {
        type: 'text',
        label: 'Item Name',
        validation: { required: true, minLength: 2 }
      },
      quantity: {
        type: 'number',
        label: 'Quantity',
        validation: { required: true, min: 1 }
      },
      category: {
        type: 'select',
        label: 'Category',
        options: [
          { value: 'electronics', label: 'Electronics' },
          { value: 'books', label: 'Books' },
          { value: 'clothing', label: 'Clothing' }
        ],
        validation: { required: true }
      },
      description: {
        type: 'textarea',
        label: 'Description'
      }
    },
    validation: {
      required: true,
      minRows: 1,
      maxRows: 10
    },
    hideHeader: false,
    disableAddRow: false,
    disableRemoveRow: false
  }
};
```

## Data Structure

The repeater field produces an array of objects:

```typescript
{
  items: [
    {
      name: "Laptop",
      quantity: 2,
      category: "electronics",
      description: "High-performance laptops"
    },
    {
      name: "Book",
      quantity: 5,
      category: "books",
      description: "Programming books"
    }
  ]
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hideHeader` | boolean | false | Hide the table header row |
| `disableAddRow` | boolean | false | Disable the add row button |
| `disableRemoveRow` | boolean | false | Disable remove buttons on rows |
| `validation.minRows` | number | - | Minimum number of rows required |
| `validation.maxRows` | number | - | Maximum number of rows allowed |

## Validation Features

1. **Row-level validation**: Each field validates independently
2. **Repeater-level validation**: Min/max row counts
3. **Cross-field validation**: `requiredWhen` works within each row
4. **JSON parsing**: Handles form submission with hidden JSON field

## Advanced Example

```typescript
const advancedDefinition: FormDefinition = {
  teamMembers: {
    type: 'repeater',
    label: 'Team Members',
    fields: {
      name: {
        type: 'text',
        label: 'Name',
        validation: { required: true }
      },
      role: {
        type: 'select',
        label: 'Role',
        options: [
          { value: 'developer', label: 'Developer' },
          { value: 'designer', label: 'Designer' },
          { value: 'manager', label: 'Manager' }
        ]
      },
      isLead: {
        type: 'checkbox',
        label: 'Team Lead'
      },
      startDate: {
        type: 'date',
        label: 'Start Date',
        validation: { required: true }
      }
    },
    validation: { minRows: 1, maxRows: 5 }
  }
};
```

## Key Features

- **Recursive field definitions**: Uses the same FormDefinition structure as root-level fields
- **Automatic component integration**: Uses your configured field components
- **Clean schema generation**: Leverages the modular schema system
- **Simplified API**: No custom column types, just standard field definitions
- **Better validation**: Full Zod schema validation with proper error handling
- **Type safety**: Full TypeScript support throughout
