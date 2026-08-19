# Follow-ups

Known gaps carried deliberately, with the evidence needed to act on them. Each entry states what
is broken, what was measured, and **the decision required** - none of them are decided.

---

## 1. `name` on a field definition is broken: the key-space and the name-space never meet

**Filed:** 2026-08-17, out of a review of carrying unrendered fields across a post (a
carried payload was the first place both spaces landed in one object, which is how it
surfaced - the carry mechanism itself, since removed before release, was not the cause).

**Status:** unfixed, and deliberately so - the fix is a decision about which space is canonical, not
a patch. See "The decision required" below.

### What is broken

A field definition may override the DOM name:

```ts
const definition = {
  email: { type: 'text', name: 'contactEmail', validation: { required: true } },
};
```

The JSDoc documents this as supported ("Set this explicitly only when the form field should have a
different `name` from the definition key - e.g. nesting inside a flat HTML name like `user[email]`").
It does not work. Rendered, typed into, and submitted:

| | observed |
|---|---|
| DOM input `name` | `"contactEmail"` |
| `form.getValues()` | `{"email": "", "contactEmail": "a@b.c"}` - **two slots for one field** |
| generated schema keys | `["email"]` |
| `form.trigger()` | **`false`** - with the field filled in |
| `FormData` keys | `["contactEmail"]` |
| `generateDataValidator` | **FAILS** `email: Required` |

So a field with an explicit `name` can never pass client validation and is always reported missing
by the server. It is not a subtle drift; the feature is unusable.

### Why - three places disagree, by construction

- **Defaults key by the definition key.** `generateDefaultValues`
  (`src/core/default-values.ts:80-84`) reduces over `Object.keys(definition)`, so it seeds `email`.
- **Rendering keys by the name.** `renderField` derives `getFieldName(key, field)`
  (`src/hooks/useFormDefinition.tsx:633`; `getFieldName` is `field.name || key`,
  `src/core/utilities.ts:222`), so the `Controller` registers - and the DOM posts - `contactEmail`.
  That is what produces the second RHF slot.
- **The schema keys by the definition key.** `generateSchema` builds its shape from
  `Object.keys(definition)`, so the resolver and `generateDataValidator` both look for `email`.

One place already translates between the two: server-action errors are mapped definition-key →
DOM-name before `form.setError` (`src/hooks/useFormDefinition.tsx:1077`). So the seam was seen once
and handled locally rather than as a contract - which is the shape of the whole problem.

### The decision required

**Which space is canonical?** Both answers are coherent and neither is free:

- **Name-space canonical.** `generateDefaultValues` and `generateSchema` (and any future
  carry of unrendered fields) all key by `getFieldName(key, field)`. The model then
  matches the DOM and RHF exactly. Cost: the
  *schema* stops matching the definition, so `z.infer` output keys change for any field using
  `name`, and every consumer reading parsed data by definition key breaks. It also makes the
  posted-data shape depend on a presentational prop.
- **Key-space canonical.** Rendering keeps emitting the DOM name, and the boundaries translate:
  `generateDataValidator` maps posted names back to definition keys before parsing, and the
  `Controller` registers by definition key while the input carries `name` as a plain attribute.
  Cost: a translation table at every boundary, and `name` becomes purely cosmetic - which may be
  the honest answer, since HTML-nesting names like `user[email]` were the stated motivation and
  those are precisely what RHF would otherwise interpret as a nested *path*.
- **Drop `name`.** Remove the option and the ambiguity with it. Cheapest and arguably the most
  honest, since it is documented but non-functional, so nothing can be relying on it working.
  Cost: a breaking change for anyone who sets it and has silently been living with a broken field.

Whichever way it goes, the fix must also cover: `deriveFrom` (which already resolves both sides
through `getFieldName`, `:1376-1377`), repeater cell names, and any future mechanism that
carries unrendered fields (the section-mirror work).

### If it is not fixed

Say so in the `name` JSDoc. It is currently documented as working.

---

## 2. `multiselect` cannot validate through raw `FormData`

**Filed:** 2026-08-18, out of the section-concept workshop (local research notes, kept out
of the repo), where the mirror encoding for multiselect turned out to have nothing to copy.
The evidence below stands on its own.

**Status:** unfixed. Pre-existing, independent of sections.

### What is broken

The `multiselect` kind exists only at the schema layer: no built-in control renders it
(`Select.tsx` has no `multiple` handling), and its schema is a bare `z.array(z.string())`
with no preprocessing (`src/core/schema/field-generators.ts:358-391`). Meanwhile
`generateDataValidator` flattens the post with `Object.fromEntries(formData.entries())`,
which collapses duplicate names last-wins into a single string.

So the two ways a binding-supplied multiselect control could post both fail server-side:

- multiple same-name entries (a native `<select multiple>`): collapsed to one string,
  which fails `z.array`;
- a single JSON string (repeater-style): fails `z.array` too, because unlike the repeater
  schema there is no JSON-preprocessing step.

No current path delivers a multiselect array to the server validator on a native post.

### The decision required

Pick the wire encoding for a multiselect on a native post. The in-house precedent is the
repeater's (one hidden JSON input under the base name, schema preprocesses); the classic
alternative is multi-entry with `getAll()`-aware parsing plus a Rails-style blank
group-level sentinel for the empty state. Whichever is chosen also becomes the section
mirror's encoding for the kind.
