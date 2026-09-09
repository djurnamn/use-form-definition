# Sections

A form can be partitioned into named **sections** - for tabs, wizard steps, or plain
visual grouping - without the definition, the generated schema, or the server knowing
anything about it. The partition is purely presentational; what makes it more than
styling is what happens when a section is *inactive*.

## The mechanism: value mirrors

With a `currentSection`, the active section renders its controls and every other
section renders its fields as **value mirrors**: hidden inputs carrying the current
values, one field at a time, in the field's own wire encoding. The DOM's `FormData` is
therefore always the whole form - a tabbed form submitted from tab one posts tab two's
values too, on both the JS and no-JS submit paths, with nothing extra to opt into.

The contract that keeps the server oblivious: **a mirror posts entries that parse to
the same value the mounted control's post would have.** Text and numbers mirror as
plain strings; a checkbox mirrors as `""` unchecked and `"", "on"` checked; repeaters
and multiselects mirror as their JSON wire encoding. `generateDataValidator` needs no
section awareness at all.

Mirrors stay live: they render through the same react-hook-form `Controller` the
control would, so the field stays registered (validation keeps its errors) and a
`deriveFrom` write into a field on another section shows up in its mirror immediately.

## Declaring sections

Two ways, freely combined:

**A declared map** (a hook option) - the definition stays untouched:

```tsx
const factionSections = {
  general: ['name', 'slug'],
  lore:    ['summary', 'motto'],
} satisfies FormSections<typeof factionDefinition>;

const { RenderedForm, sections } = useFormDefinition(factionDefinition, {
  serverAction,
  sections: factionSections,
});

<RenderedForm currentSection={tab} />
```

With no children, `RenderedForm` renders the sections in declared order - the active
one as its own field grid, the rest as mirrors - followed by any fields listed in no
section (always visible), then the actions. Without `currentSection`, every section
renders its controls: structural grouping on one page.

**JSX sections** (for custom layouts) - membership lives where the rendering is:

```tsx
const { RenderedForm, RenderedSection, RenderedField } = useFormDefinition(
  factionDefinition,
  { serverAction }
);

<RenderedForm currentSection={tab}>
  <TabStrip active={tab} onChange={setTab} />
  <RenderedSection name="general">
    <RenderedField name="name" />
    <RenderedField name="slug" />
  </RenderedSection>
  <RenderedSection name="lore">
    <RenderedField name="summary" />
    <RenderedField name="motto" />
  </RenderedSection>
  <Actions />
</RenderedForm>
```

Content outside any `RenderedSection` always renders. When a declared map and JSX
sections are both present, development builds warn if they disagree about a field. A
`currentSection` matching no section mirrors everything - coherent, but almost
certainly a typo, so development builds warn about that too.

## The `Section` component slot

Each section renders through `components.Section` - a fragment by default, so
declaring sections changes no DOM until you configure a wrapper:

```tsx
const Section = ({ name, label, active, children }) => (
  <fieldset data-section={name} data-active={active}>
    <legend>{label}</legend>
    {children}
  </fieldset>
);
```

`label` resolves through the `sections` translation category
(`form.sections.<name>` by default, falling back to the section name), and `active`
tells a wrapper when its fields are rendering as mirrors.

## Per-section validation and error routing

The hook returns a `sections` API that answers membership questions; navigation stays
yours. A wizard's Continue gate is one line:

```tsx
const [step, setStep] = useState(0);
const steps = ['general', 'lore'] as const;

const next = async () => {
  // Validates only this step's fields, focusing the first error.
  if (await sections.validate(steps[step])) setStep(step + 1);
};
```

Tab badges come from `sections.withErrors(actionState?.errors)`, and an action can name
the failing sections in its whole-form `message` for the no-JS round trip - where
client-side badges never render - using the same helper from the server entry:

```ts
import {
  generateDataValidator,
  extractSubmittedValues,
  parseValidationErrors,
  sectionsWithErrors,
} from 'use-form-definition/server';

if (!result.success) {
  const errors = parseValidationErrors(result.error.issues);
  return {
    success: false,
    errors,
    values: extractSubmittedValues(formData),
    message: `There is a problem on: ${sectionsWithErrors(factionSections, errors).join(', ')}`,
  };
}
```

When a submit is blocked and every failing field is mirrored, the built-in
whole-form notice ("Some fields need attention, but are not currently shown") fires -
mirrors are excluded from its visibility test, so an off-screen error is never
silently swallowed.

## Boundaries

- **Files cannot mirror.** A `File` does not fit a hidden input; a file field in an
  inactive section posts nothing. This is every carry mechanism's boundary.
- **Custom field kinds** get their mirror encoding derived from the value's runtime
  type (boolean pair, JSON for arrays and objects, `String(value)` otherwise) - correct
  whenever the kind's control posts the conventional encodings. A kind whose control
  posts something else declares its own via `registerFieldType`'s `mirror` option.
- **Custom controls must render a named native form element** (all built-ins do) to
  count as visible for the off-screen notice, and for their value to reach the post at
  all; a binding rendering bare divs through the `Controller` should include a named
  element carrying its value. In development, a JavaScript submit warns, naming the
  field, when the form holds a value the outgoing post does not carry.
- **Never treat the partition as a server-side write filter.** A posted `FormData` is
  client-supplied; what was rendered - or sectioned - is not a boundary the server can
  rely on. Validate and whitelist server-side as always.
- Definition keys must not start with `$` (reserved for framework bookkeeping).
