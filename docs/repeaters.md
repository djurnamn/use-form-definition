# Repeater fields

A repeater renders a dynamic list of rows, where each row is built from a nested field definition. It adds row controls (add and remove) and validates each row with the same rules as a top-level field.

## Basic usage

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

## Data structure

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

## Configuration options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hideHeader` | boolean | false | Hide the table header row |
| `disableAddRow` | boolean | false | Disable the add row button |
| `disableRemoveRow` | boolean | false | Disable remove buttons on rows |
| `validation.minRows` | number | - | Minimum number of rows required |
| `validation.maxRows` | number | - | Maximum number of rows allowed |

## Validation

Each field in a row validates independently, with the same rules it would use at the top level. `requiredWhen` resolves against the other fields in the same row. `minRows` and `maxRows` constrain the list as a whole. On submit, the rows travel as a JSON-encoded hidden field and are parsed back before validation (see [How it works](#how-it-works)).

## Advanced example

```typescript
const advancedDefinition: FormDefinition = {
  stops: {
    type: 'repeater',
    label: 'Trip stops',
    fields: {
      place: {
        type: 'text',
        label: 'Place',
        validation: { required: true }
      },
      kind: {
        type: 'select',
        label: 'Kind',
        options: [
          { value: 'city', label: 'City' },
          { value: 'coast', label: 'Coast' },
          { value: 'mountains', label: 'Mountains' }
        ]
      },
      booked: {
        type: 'checkbox',
        label: 'Accommodation booked'
      },
      arrival: {
        type: 'date',
        label: 'Arrival date',
        validation: { required: true }
      }
    },
    validation: { minRows: 1, maxRows: 5 }
  }
};
```

## Column headers and translation

By default each column header shows the nested field's `label`, falling back to the field key. Per-cell labels are suppressed (in a table the label belongs in the header, not repeated in every row), so the header is the only place a nested label appears.

When a `translation.hook` is configured and the nested labels are translation keys, the built-in `Repeater` resolves each header through the parent form's translation config, so the `<th>` shows the translated string rather than the key - no per-field change needed. `hideHeader: true` still removes the header row entirely.

If you build your own repeater (or any complex component registered with `injectFormConfig: true`) that renders its own headers, use the injected `__resolveFieldLabel` to translate them the same way:

```tsx
interface MyRepeaterProps extends Partial<InternalComponentProps> {
  name: string;
  fields: FormDefinition;
}

function MyRepeater({ fields, __resolveFieldLabel }: MyRepeaterProps) {
  return (
    <table>
      <thead>
        <tr>
          {Object.keys(fields).map((key) => (
            <th key={key}>
              {/* Translated when a hook is configured; raw label (or key) otherwise. */}
              {__resolveFieldLabel?.(key, fields[key]) ?? (fields[key].label || key)}
            </th>
          ))}
        </tr>
      </thead>
      {/* ...rows via __renderNestedField... */}
    </table>
  );
}
```

`__resolveFieldLabel` returns the translated string when a hook is configured, the raw label otherwise, or `undefined` when the field has no label - keep the `?? (fields[key].label || key)` fallback so the component also works standalone (without the form hook), where the prop is absent.

## How it works

A repeater's `fields` is an ordinary `FormDefinition`, the same shape used at the root, so each row renders through your configured field components and there are no special column types to learn. The inferred type for the field is an array of the row's shape (see [Type inference](./type-inference.md)).

Rows are managed client-side: the component keeps the list in React state and writes it to a hidden input as JSON, which the server parses back before validation. That means a repeater needs JavaScript to add or remove rows. This is the one part of the library that isn't progressively enhanced - a plain `<input type="text">` field still posts and validates without JS, but a repeater's row controls won't. If a form has to work with JS disabled, prefer a fixed set of named fields over a repeater.
