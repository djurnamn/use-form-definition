# Without JavaScript

What a form built with this library does before hydration, or with JavaScript disabled
entirely. This contract was previously spread across changelog entries and JSDoc blocks;
this page is the one place that states it.

The short version: **a server-action form degrades to a working plain-HTML form; a
client-only form does not.** Everything else on this page is the detail of where that
line runs.

One qualifier on the strong half: how far "without JavaScript" stretches also depends on
how the framework renders the form component. React documents the full no-JS guarantee
for forms rendered from Server Components, while Next.js documents Client Component
forms (which a `RenderedForm` is) as *queuing* pre-hydration submissions rather than
posting natively with JS disabled outright - a distinction between "before hydration"
and "JS off entirely" that is the framework's, not this library's. The library's side of
the contract - native `action`, server validation, the echo round trip - holds either
way; verify the framework's side in your app if the JS-disabled case matters to you.

## How the no-JS path works

A form wired with a `serverAction` renders `action={formAction}` on the `<form>` element,
so the browser can post it natively - no handler required. React adds its own
progressive-enhancement bookkeeping inputs (`$ACTION_REF_*`, `$ACTION_*`, `$ACTION_KEY`)
to route the post to the right action.

With JavaScript, the library intercepts the submit, runs client validation, and
dispatches the action itself. Without it, the browser posts whatever is in the DOM and
the page re-renders server-side with the action's result in hand. Both paths end at the
same action; the server validates either way and stays the source of truth.

## What works without JavaScript

- **Submitting a server-action form.** The native post reaches the action with the
  rendered fields' values.
- **Server-side validation.** `generateDataValidator(definition)` parses the posted
  `FormData` against the same schema the client resolver uses.
- **The validation-error round trip.** An action that returns
  `{ success: false, errors, values }` gets both halves rendered on the server pass:
  the per-field errors render directly from the action result, and the echoed `values`
  seed the form's defaults so the fields re-populate with what the user typed rather
  than resetting. Echo with `extractSubmittedValues(formData)` from the `./server`
  entry - it strips React's bookkeeping, which is not one of the form's fields.
- **`defaultValues`** (an edit form's stored record). It merges under the echoed
  `values`, so a failed submit re-populates with the user's input, not the record.
- **The whole-form message region.** A `message` in the action result renders from the
  envelope on the server pass.
- **Sections' value mirrors** (see [Sections](./sections.md)). An inactive section's
  fields are server-rendered as hidden inputs carrying the values the form was rendered
  with, so a native post carries the whole form - and for a no-JS user, who cannot
  switch sections anyway, render-time values are the only truth there is.

## What requires JavaScript

- **Client-only forms.** A form wired with `onSubmit` and no `serverAction` has no
  endpoint; without JS the browser posts natively to the current URL and nothing
  handles it. The POST-by-default `method` exists for exactly this window - it keeps a
  pre-hydration submit's values out of the URL, browser history, and access logs - but
  it does not make the submit do anything.
- **Client validation and everything driven by it**: the `onTouched` re-validation
  mode, per-field error clearing as the user types, and the off-screen-errors notice
  (it is client state raised by the submit handler). On the no-JS path the server's
  errors come back for the whole definition, but an error on a field the form did not
  render still renders nowhere - if a form renders a subset of itself, put a
  whole-form `message` in the action result so the user is not left with nothing.
- **`deriveFrom`.** Derivation runs through a `form.watch` subscription. Without JS a
  derived field posts whatever it was rendered with; the server should treat a derived
  field as untrusted input like any other and re-derive or validate it if it matters.

## Boundaries worth knowing

- **`form` + `serverAction` disables no-JS re-population.** The echoed `values` merge
  into the form this hook constructs; a consumer-supplied `form` was built before the
  hook ran and cannot receive them, so a no-JS user loses what they typed on a
  validation-error round trip. A development warning fires on the combination; if you
  only need starting values, pass `defaultValues` and let the hook own the form.
- **Tabs and pages.** Local-state tabs cannot switch without JS, so a no-JS user can
  only ever fill the initially rendered page - there are no later edits to lose.
  Routed tabs (`?tab=` across real navigations) do switch without JS, but each
  navigation discards unsaved edits on the other tabs. Which mechanism the app picks
  decides its no-JS story; the library cannot know which it is.
- **Empty states post nothing.** A browser submits no entry for an unchecked checkbox,
  a fully-deselected multi-select, or a radio group with no selection - "empty" and
  "absent" are the same observation in a posted `FormData`. An absent checkbox coerces
  to `false`; other absent optional fields simply parse as absent (`undefined`). Correct
  on its own; it becomes a design constraint the moment anything supplies a value
  underneath the post, which is why it is written down here.
- **The action author's checklist.** Validate with `generateDataValidator`; echo
  `values` through `extractSubmittedValues`; and whitelist what you write - a posted
  `FormData` is client-supplied, so the fields your JSX rendered are not a boundary the
  server can rely on.
