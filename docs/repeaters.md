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
| `schemaOnlyRowProperties` | object | - | Properties every row carries that no cell renders (see [Row state the cells do not cover](#row-state-the-cells-do-not-cover)) |

## Validation

Each field in a row validates independently, with the same rules it would use at the top level. `requiredWhen` resolves against the other fields in the same row. `minRows` and `maxRows` constrain the list as a whole. On submit, the rows travel as a JSON-encoded hidden field and are parsed back before validation (see [How it works](#how-it-works)).

## Row state the cells do not cover

A row's schema is a plain object over the declared `fields`, and a plain object drops what it does not declare. A row carrying state beyond its cells therefore parses *successfully* while losing everything undeclared, with no error anywhere: the value in `form.getValues()` is complete, and the value the resolver hands `onSubmit` is not.

That matters when something other than the repeater's own controls writes into a row. Declare those properties as `schemaOnlyRowProperties` and they survive the parse, validated, on both rails:

```typescript
const definition: FormDefinition = {
  classes: {
    type: 'repeater',
    fields: {
      key: { type: 'select', label: 'Class', options: classOptions },
      level: { type: 'select', label: 'Level', options: levelOptions },
    },
    schemaOnlyRowProperties: {
      subclass: { valueType: 'string' },
      hasAddedStartingEquipment: { valueType: 'boolean', defaultsTo: false },
      featureSelections: { validatesAs: 'selectionMap' },
    },
  },
};
```

Nothing renders them. A repeater renders exactly `fields`, so an existing repeater component (the built-in one, a binding's, your own) needs no change to honour this.

A property declares how its value **validates**, never how it looks, so its vocabulary is not a field's:

| Key | Meaning |
|-----|---------|
| `valueType` | The built-in value semantics: `"string"`, `"number"`, `"boolean"`, `"date"`. Validates like `text` / `number` / `checkbox` / `date`, with the same wire coercions. |
| `validatesAs` | A kind registered with [`registerFieldType`](./plugins.md) whose validator this property borrows. The path for a shape no value type can express: an object, an array, a record. |
| `validation` | Validation rules, resolved exactly as a field's `validation` block is. |
| `defaultsTo` | What the **parse** fills in when a row omits this property. |

Two of those repay a closer look.

`type` is deliberately not accepted. It names a control, and a schema-only property renders none, so `{ type: 'checkbox' }` would be asking for a control that never appears. Write `{ valueType: 'boolean' }` instead. A property block carrying rendering vocabulary (`type`, `label`, `options`, `layout`) says so rather than quietly ignoring it.

`defaultsTo` is not `defaultValue`, and the difference is the point. A field's `defaultValue` seeds react-hook-form's defaults and never touches the schema. Nothing renders a schema-only property and no repeater seeds one into a new row, so the parse is the only place a value can land: `defaultsTo` becomes a zod default, applied on the client resolver and on `generateDataValidator` alike. That is what gives a freshly added row its stamp.

Errors compose with the rest of the row. A property's issue nests at `[rowIndex][propertyKey]`, the same shape a cell's issue takes, so `getNestedError(error, [rowIndex, 'subclass'])` reaches it (see [Item errors](#item-errors)) even though no cell renders there. A whole-form notice will report the field, and a structured kind can surface the message wherever it does render that state.

A property that collides with a declared cell is an error, not a merge: a row's shape is described once, and `fields` versus `schemaOnlyRowProperties` is the split between what renders and what does not.

## Item errors

A failing cell renders its message at the cell, exactly as a top-level field would. The mechanics: the resolver roots each item issue under the repeater's key, so the field's error is a nested tree - an array of per-row error maps - rather than a flat `FieldError`. `RenderedField` translates every message in that tree and passes it down whole; the built-in `Repeater` reads each cell's error out of it (`error[rowIndex][columnKey]`) and renders the message below the cell's control, with an id the control's `aria-describedby` points at.

Whole-list rules (`minRows`, `maxRows`, `required`) carry their message on the error itself and render once, at the repeater - never per cell.

A custom repeater (or any structured kind - see [Custom field kinds and item errors](./plugins.md#item-errors-in-structured-kinds)) receives the same tree on its `error` prop and reads it with `getNestedError`:

```tsx
import { getNestedError, type NestedFieldError } from 'use-form-definition';

// Inside the component, for one cell:
const cellError = getNestedError(error, [rowIndex, columnKey]);
// cellError?.message is display-ready - translated like any top-level field's message.
```

Server-side, the action envelope stays flat: `parseValidationErrors` groups an issue at `items.0.title` under `errors.items`, without the item position. That is deliberate - the envelope is what `sectionsWithErrors` and the no-JS round trip consume, and on the no-JS path (where a repeater's row controls do not work anyway, see below) the honest answer is the field-level message plus the failing section name. With JavaScript, the client re-validates with the same schema, so item errors render at the item regardless of what the envelope carries.

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
