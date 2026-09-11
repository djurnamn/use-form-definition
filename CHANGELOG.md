# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.9.0] - 2026-09-11

### Added

- **Validation messages can name their field.** Every message translation now receives `{field}` - the field's resolved label, or its definition key when it has none - and `{fieldKey}` alongside the message's own options (`{count}`, `{value}`), on the client through `RenderedField` and on the server through `parseValidationErrors(issues, translate, labels)`, whose new third argument maps definition keys to labels. A message can read `{field} is required`; ICU-style translators ignore values a message does not use, so existing translations and the built-in English defaults are unchanged. An error inside a structured field names the item field it belongs to: a repeater cell's message reads the column's label, with `{fieldKey}` as its key path (`classes.level`), on both rails. Found through a consumer whose every message names the field, and which had been re-encoding the library's translated output back into `[key, options]` to translate it once more with the label. (use-form-definition-dev#10)

### Fixed

- **A registered pattern's name type-checks in a definition.** `PatternKey` named only the built-in patterns, so `validation: { pattern: 'companyEmail' }` needed a cast for a pattern added with `registerPattern`. The type now accepts any string while keeping completion for the built-ins; an unknown name is still reported by the schema at run time. (use-form-definition-dev#11)
- **`requiredWhen` raises the `required` message key, not its English text.** The cross-field rule was the one place a message left the `[key, options]` convention, so a translated form showed "This field is required" untranslated where every other rule spoke the app's language. It also judged only `type: "date"` values as Dates; a custom date-like kind (a working-day picker) that transforms its input into a Date was judged as a string and never satisfied. The check now looks at the value: a Date must be valid, anything else must be non-empty. (use-form-definition-dev#8)
- **Registrations are shared between the two entry points.** `use-form-definition` and `use-form-definition/server` are built as separate bundles, and each carried its own copy of the module-level maps behind `registerFieldType`, `registerFieldSchemaGenerator`, `registerDeriveTransform`, `registerFieldTypeMirror` and `registerPattern`. A kind registered through the client entry was unknown to the server data validator (it validated as a string, or the built-in repeater took over a `repeater` override), so the two rails disagreed unless the consumer registered twice. Custom registrations now live on `globalThis` under a `Symbol.for` key (`core/registry.ts`), which every copy of the library in the process reads - the other entry point, and a duplicated `node_modules` copy alike. Built-in kinds and patterns stay module-local; a kind registration wins over a built-in of the same name everywhere. Because the store outlives a hot reload and is shared by both entry points, `registerPattern` now treats registering a name again with the same pattern and message as a no-op; a different definition under a taken name still throws. (use-form-definition-dev#9)

## [2.8.0] - 2026-09-09

### Added

- **Sections - a form can render part of itself and still post all of itself.** A form partitioned into named sections (tabs, wizard steps, visual grouping) renders the active section's controls while every *inactive* section's fields render as **value mirrors**: hidden inputs carrying the current values, per field, in the field's own wire encoding - text as strings, checkboxes as the `""`/`"", "on"` presence pair, repeaters and multiselects as their JSON convention. The posted `FormData` is therefore always the whole form, on both the JS and no-JS submit paths, and the server needs no section awareness: a mirror posts entries that parse to the same value the mounted control's post would have. Mirrors render through the same react-hook-form `Controller` the control would, so validation keeps their errors and a `deriveFrom` write into another section's field stays live. Declare sections as a hook option (`sections: { general: ['name', 'slug'], ... }` - the definition stays untouched; zero-config `<RenderedForm />` renders the groups) or wrap custom-layout regions in the returned **`RenderedSection`**; the app controls which section is active via **`currentSection` on `RenderedForm`** (omitted: everything renders; matching nothing: everything mirrors, with a development warning). Development builds also warn when a declared map and JSX membership disagree. See [docs/sections.md](./docs/sections.md).
- **The `sections` API on the hook return** - membership questions answered so navigation can stay app state: `sections.validate('lore')` validates one section's fields with focus-on-first-error (a wizard's Continue gate in one line), `sections.of(field)` and `sections.fields(name)` for lookups, `sections.withErrors(errors)` for tab badges. Answers come from the declared map, or - for JSX-declared sections - from membership observed while rendering, which is complete after first paint because mirrors render too. **`sectionsWithErrors` / `sectionOf`** are also exported from both entries, so an action can name the failing sections in its no-JS result `message`.
- **`Section` component slot** (`components.Section`, or `formComponents` on the factory) - the wrapper rendered around each section, receiving `{ name, label, active, children }`. A fragment by default, so declaring sections changes no DOM until a wrapper is configured; the natural implementation is a `<fieldset>` with a `<legend>`. `label` resolves through the new **`sections` translation category** (`form.sections.<name>`, off by default like the other categories). In zero-config rendering each active section gets its own `LayoutContainer` grid.
- **`mirror` option on `registerFieldType`** - a custom wire encoding for a kind's value mirror, for controls that post something the runtime-type derivation (boolean pair, JSON for arrays/objects, `String(value)` otherwise) would not reproduce. Return `null` for "this value cannot mirror". Files never mirror - a `File` does not fit a hidden input.
- The off-screen-errors notice understands mirrors: they are excluded from its visibility test (via a `data-ufd-mirror` marker), so a submit blocked only by mirrored fields raises the whole-form message instead of silently doing nothing.
- **`schemaOnlyRowProperties` - a repeater row can declare the state its cells do not cover.** A row's schema is a plain object over the declared `fields`, and a plain object drops undeclared keys: a row carrying state written by something other than the repeater's own controls parsed *successfully* while losing that state, on the client resolver and `generateDataValidator` alike, with no error anywhere. `schemaOnlyRowProperties` declares those properties so they validate and survive the parse, with no rendering consequence - a repeater renders exactly `fields`, so the built-in `Repeater`, a binding's, and your own all honour this untouched. Entries speak validation rather than rendering: `valueType` for the built-in value semantics, `validatesAs` to borrow the validator of a kind registered with `registerFieldType` (the path for an object, array or record shape), `validation` for the usual rules, and `defaultsTo` for what the *parse* fills in when a row omits the property - deliberately not `defaultValue`, because nothing renders or seeds a schema-only property, so the parse is the only place a value can land. Rendering vocabulary (`type`, `label`, `options`, `layout`) is reported rather than silently ignored, and a property colliding with a declared cell is an error. Issues nest at `[rowIndex][propertyKey]` like a cell's, so `getNestedError` reaches them. See [docs/repeaters.md](./docs/repeaters.md#row-state-the-cells-do-not-cover).
- **`getNestedError(error, path)` - the documented way into a structured field's item errors.** A structured field (the built-in repeater, or a custom kind registered with an array/object schema) now receives its react-hook-form error as the *nested tree* the resolver actually produces - an array of per-item error maps, every `message` translated - instead of a flattened object whose `message` was `undefined`. `getNestedError(error, [rowIndex, 'level'])` (or the string form `'0.level'`) resolves a path in that tree to the leaf `FieldError`, so an elaborate field type renders per-item errors inside its own UI without reading `formState.errors` behind the library's back. Exported with the `NestedFieldError` type from the main entry; see [docs/plugins.md](./docs/plugins.md#item-errors-in-structured-kinds).
- **A declared kind with no registered component fails loudly.** A field whose `type` has no component (`components` on `createFormDefinitionHook`, or `config.fieldTypes` on the call) used to render a "Component not found" placeholder (or, inside a custom layout that never rendered the field, nothing at all) while its value mirror kept posting from inactive sections - so the one section being edited was the one that never reached the post, and every save silently kept the stored value. The hook now checks the definition against the registered components once at creation, repeater cells included (the bare `useFormDefinition` with no components registered - the headless, schema-only use - is exempt), and **throws in development** naming each field and kind; production warns once and renders what it can. Found through a consumer's form whose three structured kinds were declared, validated and mirrored but never given a component.
- **A JavaScript submit warns, in development, when the post is missing a value the form holds.** The DOM is the payload: a custom control rendering no named native form element, or a custom kind with no mirror, posts nothing for its field while react-hook-form holds a value, and the server, seeing absence, keeps the stored one. The server-action submit handler now compares the outgoing `FormData` against the model once client validation passes and warns once per field it finds missing. An empty model value (an unchecked checkbox, an unselected radio group, an empty selection) is what the browser posts and is not reported; production is silent. Nothing blocks the post. This is the observable half of the decision to keep posting the DOM rather than a serialized model (a two-wire-format major that would leave the no-JS path as the neglected one); the binding contract in [docs/sections.md](./docs/sections.md#boundaries) is unchanged.

### Deprecated

- **`schema` on a `registerFieldType` registration, renamed to `validatesAs`.** The option borrows a registered kind's *validator* by name (`validatesAs: "checkbox"`); calling that `schema` invited the reading "a zod schema goes here", which it never accepted. The old spelling still works - `validatesAs` wins if both are set - and is slated for removal in the next major. The rename also frees the word `schema` for a possible future inline-zod seam, recorded, with the four questions it would have to answer, in the development repository's issue tracker.

### Fixed

- **An invalid repeater cell now renders its message at the cell.** Client-side, a zod issue on an item inside a structured field value (a repeater row's cell, an array element in a custom kind) nested under the top-level key as a tree of per-item error objects, and the flat-message handling reduced that tree to `message: undefined` - so the submit blocked with nothing rendered anywhere (the whole-form notice correctly stayed quiet, since the failing field *was* on screen). `RenderedField` now translates the whole error tree, shape intact, and the built-in `Repeater` reads each cell's error out of it and renders the message below the cell's control (id paired with the control's `aria-describedby`, `role="alert"`). Whole-list messages (`minRows`, `maxRows`, `required`) render at the repeater as before, plus react-hook-form's `root` convention for an array-level message alongside item errors. Flat fields and the section error routing (`sectionsWithErrors` matches top-level keys, which the nesting preserves) are unchanged. Server-side the action envelope deliberately stays flat and top-level-keyed; that boundary is now stated on `parseValidationErrors` and in [docs/repeaters.md](./docs/repeaters.md#item-errors) rather than left as an accident.
- **`multiselect` can now validate through raw `FormData`.** The kind had no wire encoding at all: `generateDataValidator` flattens a post with `Object.fromEntries`, which collapses duplicate names last-wins, so a native multi-entry post could never deliver an array - and the schema had no JSON handling either, so no encoding worked. The wire format is now the repeater's convention: one JSON string under the field's name (`""` for an empty selection), decoded by a schema preprocess; client-side array values pass through untouched. A mangled wire value degrades to an empty selection with a console warning, matching the repeater's failure shape.

## [2.7.0] - 2026-08-19

### Added

- **`extractSubmittedValues(formData)`** on the `./server` entry - the form's own fields from a posted `FormData`, for echoing back as `FormActionResult.values`. A post carries more than the form's fields: React's `$ACTION_REF_*` / `$ACTION_*` / `$ACTION_KEY` bookkeeping rides **every** no-JS submit. That was already a small leak before this release - `values` is not inert, since `useFormDefinition` spreads it over the generated defaults to seed `useForm()` on the no-JS validation-error round trip, so whatever an action echoes lands in the form model. `handleServerSubmit` has always stripped `$ACTION*` on the **JS** path; this applies the same rule on the path where it actually matters, in one place, so an action does not have to know React's reserved names to echo correctly. The guard is a `$ACTION` prefix, so ordinary fields called `action` or `transaction` are untouched.
- **`defaultValues` on the hook options** - initial values for the form the hook constructs (an edit form's stored record), merged over the definition's generated defaults and *under* a failed action's echoed `values`. It exists because the alternative silently broke progressive enhancement: the no-JS validation-error re-population happens where this hook builds the form, so a consumer who supplied their own `form` (the documented "full control" pattern, and the only way to start from stored values until now) lost it with no signal at all. Passing both `form` and `serverAction` now warns in development, and the `form` option documents the trade-off.

### Deprecated

- **`showActions` on `RenderedForm`.** Configure the slot instead: `config: { components: { Actions: false } }` on the hook, or a custom component there to replace the default. The slot mechanism already supports both per form, so the boolean was a redundant second switch; it keeps working until the next major.
- **A field-level `name` different from the definition key.** It has never worked - the field gets two react-hook-form slots, client validation fails with the field filled in, and the server reports it missing (measured; the evidence and the decision it needs are tracked in the development repository) - so nothing can be relying on it working. The JSDoc is marked `@deprecated` and a development-mode warning names the offending fields; removal is the likely resolution.

### Docs

- **[Without JavaScript](./docs/without-javascript.md)** - the no-JS contract in one place: a server-action form degrades to a working plain-HTML form, a client-only form does not, and the boundaries (tabs, `form` + `serverAction`, empty-state posting) each get a plain statement. Previously spread across changelog entries and JSDoc blocks.

### Fixed

- **A submit blocked entirely by errors on unrendered fields no longer looks like a dead button.** Any conditionally-rendered form could reach this and a tabbed one hits it constantly: the gate validates the whole definition, the failing field is on another page, and *nothing appears on screen* - no error, no message, no submit. `RenderedForm` now raises a whole-form message (`validation.errorsNotVisible`, overridable through the usual validation-translation path) when a blocked submit would otherwise show the user nothing, and retracts it as soon as a submit passes the client-side gate; a form whose errors render on their own fields is untouched. Visibility is read from `form.elements`, so a custom control counts as on-screen only if it renders a named native form element - every built-in does; a binding rendering only unnamed wrappers through the `Controller` should add a named element (a hidden input carrying its value) to participate. Both submit paths are covered - the gate is the resolver, not the server action, so a client-only tabbed form hit the same dead button. Two findings worth recording, both from running it rather than reading it. **react-hook-form drops errors for fields it never registered**, so on a page the user never opened `trigger()` returns `false` while `formState.errors` stays *empty* - the failing set has to be recomputed from the schema rather than read off form state (which also lags a render). And the notice is held in `RenderedForm`'s own state rather than pushed in as a `root` error, because a lingering root error combined with a client-side route change left the *next* submit dead, the handler never firing at all - it is also the more honest model, since this is the form saying where to look, not a validation error on a field.
- **The copy CLI works again, and its copies compile.** `npx use-form-definition copy` still listed `submit-button` pointing at `SubmitButton.tsx`, a file the v2.0.0 rename removed - so that entry (and the `all` sweep) had been failing since May; it is now `actions`, and `form-message` (added in 2.2.0) is registered too. Copies also rewrite the package's internal `../core/...` imports to `use-form-definition`, which re-exports everything the components use - a verbatim copy only compiled in a tree that mirrored this repo's layout. The stale `*SubmitButton` component names in the shadcn/mui/antd examples were renamed to `*Actions` as well.

## [2.6.0] - 2026-08-06

### Added

- **`description` - per-field explanatory text, as a first-class library prop.** A field definition can carry `description: "..."` - the standard form affordance for "what does this value actually do" - and it now reaches the `Field` wrapper (which every wrapper already received in full, but had no contract for), while being **filtered from the control's DOM props** like `label` and `placeholder`, so it never lands as an invalid `description="..."` attribute on an `<input>`. The built-in `Field` wrapper renders it under the control with `id="<fieldId>-description"`, and the built-in controls point `aria-describedby` at it automatically (joined with the error id when an error shows); custom `Field` components render it however their field chrome dictates. Field types that allowlist `description` in their `additionalProps` (as the djui binding's `checkbox` and `switch` do) keep their existing behaviour - there it reaches the control itself, as the control's own inline description. Also available as a typed runtime override on `RenderedField` (`description="..."` or `description={false}` to hide), like `label` and `placeholder`.
- **`descriptions` translation category.** `description` resolves through the same translation machinery as `label` and `placeholder`: `"auto"` (or `alwaysInclude`) resolves `form.descriptions.<key>` via the configured translation function, any other string is a translation key when the category is enabled or a literal otherwise, `"none"` opts out. Opt-in like `placeholders` (`enabled`/`alwaysInclude` default off unless a translation source implicitly enables categories), with `localePath` overridable. Nested (repeater) fields resolve it the same way.

### Fixed

- **Submitting a client-only `RenderedForm` without `onSubmit` now runs validation.** The client submit handler gated `form.handleSubmit` on an `onSubmit` being provided, so a form rendered without one swallowed the submit entirely - no validation ran, no errors showed, nothing happened. Validation now runs regardless, marking the fields and showing their errors; `onSubmit` remains optional and is simply not called when absent.

## [2.5.0] - 2026-07-29

### Fixed

- **A client-only form no longer submits as GET, which put passwords in the URL.** `RenderedForm` assembled the `<form>` props from a closed set (`className`, `style`, `noValidate`, then `action` + `onSubmit` or `onSubmit` alone) and never set `method`. For a **server-action** form that is harmless - React renders `<form action={fn}>` and POSTs to its own endpoint - but a form wired only with `onSubmit` got neither an `action` nor a `method`, so the browser's default applied to any submit that landed **before React hydrates**: a native **GET**, serializing every field into the query string. For a sign-in or password-reset form that is a credential disclosure into browser history, the `Referer` header of anything the page subsequently loads, and every access log in front of the app - and the exposure window is the whole page load on a slow connection, permanent for anyone whose JavaScript fails to run. Client-only forms now render `method="post"`. Once hydrated the method is never used (the submit handler calls `preventDefault()`), so this changes only the pre-hydration failure mode: from leaking the fields to posting them somewhere that ignores them. Server-action forms are untouched - `method` is deliberately not set there, so React keeps owning its own action endpoint. Found by a consumer's browser test, not by review: clicking sign-in before hydration navigated to `/sign-in?email=...&password=...`.

### Added

- **`method` on `RenderedForm`.** `'get' | 'post'`, overriding the client-only default above - pass `'get'` for the forms where a query string is the point (a search or filter form that should be linkable and shareable). Ignored when a server action is configured, since React owns the method on that path.

## [2.4.0] - 2026-07-19

### Added

- **`deriveFrom` - declarative field derivation with a pristine latch.** A field definition can declare `deriveFrom: "<sibling key>"` to auto-fill from a sibling field while the user hasn't claimed it - the classic case is a slug that follows the title until the user edits it by hand. While the target is *unclaimed* - empty, or still equal to the last value derivation wrote - every change to the source mirrors `transform(sourceValue)` into it. The latch covers edit forms for free: a stored value differs from any derivation (and the field isn't empty), so it is never overwritten; a user edit breaks the equality and derivation stops; a user *clearing* the field re-arms it. Derived writes use `shouldDirty: false`, so only user edits mark the target dirty. The definition carries only the field name - naturally serializable, so a definition shared with server code can carry it where it could never carry a function - and the transform is resolved at runtime: a per-field `deriveTransform` function on the definition, else the kind-level transform registered via `registerFieldType(type, { deriveTransform })` (a `deriveTransform`-only registration is now valid, attaching a transform to an already-registered or built-in kind without touching its validation; `registerDeriveTransform` is also exported standalone), else identity. Derivation is client-side only, a live-preview affordance - server validation (`generateSchema` / `generateDataValidator`) treats `deriveFrom` as inert, and the server's own canonicalization stays authoritative.

## [2.3.0] - 2026-07-15

### Added

- **`registerFieldType` - custom field kinds with a declared value type.** Unregistered custom field kinds validate as `z.string()` everywhere (via `createCustomFieldSchema`), which works for string-valued kinds (a `slug`, a `markdown` body) but makes a *non-string* custom kind impossible: a kind whose value is a boolean - a public/private `visibility` toggle, say - would run its boolean through a string schema on the client resolver, and parse the posted checkbox `"on"` as a string on the server data validator. `registerFieldType(type, registration)` registers a kind *with its value semantics*, so it validates with the right value type on **both** paths (`generateOptions` and `generateDataValidator`) and seeds the matching default value, while the rendering side still picks its own component by kind. Provide one of: `valueType: "string" | "number" | "boolean" | "date"` (validate like `text` / `number` / `checkbox` / `date`), `schema: "<existing kind>"` (alias a registered kind's exact validator - including `select`'s option/enum handling), or `generator` (a full custom Zod generator, equivalent to `registerFieldSchemaGenerator` but co-registered with the default value); an optional `defaultValue` overrides the resolved default. Call it once at module scope, from code imported by both the client and server bundles, so the two validators agree - a module-level registration like `registerFieldSchemaGenerator` / `registerPattern`. Exported from both the main entry and the React-free `use-form-definition/server` entry (which now also re-exports `registerFieldSchemaGenerator`). `getDefaultValueForField` moved into a React-free `core/default-values` module (re-exported from `utilities` - no import-surface change) so the server entry can consult registered defaults without loading React.

## [2.2.0] - 2026-07-12

### Added

- **Form-level message region (`FormMessage`).** `RenderedForm` now renders a whole-form message region inside the `<form>`, above the fields, whenever the form carries a message that has no per-field home - a rate-limit refusal, an expired reset link, "invalid credentials", and so on. It surfaces the message from either channel: a server-action envelope `message` (with severity derived from the result's `success` flag - `error` / `success` / `info`), or a react-hook-form `root` error (`form.setError('root', ...)`, always `error`), the envelope taking precedence when both are present. It renders nothing when there is no message. The region is a first-class, overridable form-chrome slot - register your own component in `components.FormMessage` (via `formComponents` on `createFormDefinitionHook`, or `config.components` at the call site), the same way you supply `Field` and `Actions`; a registered component receives `{ message, status }`. Set the slot to `false` to opt out. The built-in default is minimal and accessible: a single element with `role="alert"` for errors (`role="status"` otherwise), plus `data-status` / `data-form-message` styling hooks. The configured component is also returned from the hook as `FormMessage` for manual composition (`null` when the slot is `false`). Forms with no whole-form message render exactly as before; if your server action already returns a `message` that you render yourself from `actionState`, it will now also appear in this region - set `components.FormMessage: false` to keep your own rendering.
- **Custom form layout via `RenderedForm` `children`.** `<RenderedForm>` now accepts `children`; when provided, they render inside the form element *instead* of the automatic field grid (`LayoutContainer` / per-field `LayoutItem`), while `RenderedForm` keeps owning every bit of form wiring - the `<form action>` / `onSubmit` progressive-enhancement path, `actionState` → `form.setError`, no-JS value re-population, and the `onSuccess` / `onError` callbacks. Compose the body from the hook's `RenderedField` and `Actions`, arranged however you like (an image beside fields, multi-column sections, and so on). `showActions` is ignored in this mode - place `<Actions />` yourself. This is the supported way to build a bespoke layout without dropping to `Form` + `RenderedField` (which loses the server-action wiring).
- **`RenderedField` surfaces server-action errors in custom layouts.** A `RenderedField` placed by hand (in a `children` layout or standalone) now derives the same server-error map that the automatic grid passes down, so field-level errors from a server-action result render on SSR / no-JS, before the client `setError` effect runs. Previously only the auto-rendered grid showed those; standalone fields did not.
- **`InternalComponentProps.__resolveFieldLabel`.** Complex field components registered with `injectFormConfig: true` now receive a `__resolveFieldLabel(fieldKey, fieldDefinition)` resolver alongside the existing internals. It returns a nested field's display label resolved with the parent form's translation config - the same path the cells already use - so a component can translate labels it renders itself (e.g. a repeater's column headers). Optional and backward compatible: existing components that ignore it are unaffected.

### Fixed

- **Blank optional number/date fields no longer coerce to `0` / an Invalid Date.** A form control the user leaves empty submits an empty string (react-hook-form keeps `""`, an HTML form posts `""`), never `undefined`. Because `Number("")` is `0` and `new Date("")` is an Invalid Date, a blank *optional* `number` submitted as `0` (semantically wrong - "no value set" must stay absent) and a blank optional `date` (and `datetime-local`, which shares the generator) became an Invalid Date; a blank *required* `number` slipped past the required check as `0`. The number and date field-schema generators now normalize a blank (empty or whitespace-only) string to `undefined` before coercion, so a blank optional field resolves to absent and a blank required field fails with the library's normal required message. Every currently-correct behavior is preserved: a literal `"0"` still parses to `0`, real dates still transform to `Date`, and `min`/`max` still apply after coercion. (`time` / `month` / `week` are backed by the string generator, not coerced, so they keep the string convention and are unaffected.)
- **Repeater column headers respect translation.** The built-in `Repeater` now renders each `<th>` through `__resolveFieldLabel`, so when nested field labels are translation keys and a `translation.hook` is configured, the header shows the translated string instead of the raw key. Previously the header was the one place a nested label appeared where translation was not applied; the workaround was `hideHeader: true`. Forms without translation are unchanged (the resolver returns the raw label), and `hideHeader` still works.

## [2.1.1] - 2026-07-07

### Fixed

- **The `use-form-definition/server` entry no longer loads React.** It re-exported `generateDataValidator` from `core/schema`, a module that also exports `generateOptions` and so transitively imported `@hookform/resolvers/zod`, `react-hook-form` (`createContext`), and React's `useId`. Importing the server entry from a React-free context such as a Next.js server action therefore pulled React onto the server. `generateDataValidator` now lives in its own React-free module (`core/schema/data-validator.ts`) that the server entry imports directly, so the built `dist/server.*` bundles reference neither `react` nor `@hookform/resolvers`. The public API is unchanged.
- **Nested fields inside a repeater now get their presentation data translated.** The repeater cell renderer spread raw field definitions, so a nested `select`'s option labels and a field's `placeholder` showed their translation keys instead of the resolved text. It now runs the same `resolveFieldPresentationData` step as top-level fields. The field label stays suppressed, since a repeater's column header already carries it.

## [2.1.0] - 2026-06-17

### Added

- **Optional HTML5 validation attributes.** A new `emitHtml5Attributes` config flag (on `createFormDefinitionHook` and per-form `config`, default `false`) emits native HTML5 constraint attributes on rendered inputs, derived from each field's `validation` rules: `required`, `pattern`, `minLength`, `maxLength`, `min`, `max`, and `step`. This gives a no-JS HTML5 validation layer alongside react-hook-form / a server action - the counterpart to the `noValidate` opt-out. Each attribute is emitted only where it is valid HTML (e.g. `pattern` on text-like inputs, `min`/`max`/`step` on number, range, and date inputs), named pattern keys resolve to their regex source, and a conditional `requiredWhen` rule is not turned into a static `required` (a checkbox `mustBeTrue` is). The flag defaults to off, so existing output is unchanged.
- **Typed forwarding of `RenderedField` extra props.** `useFormDefinition` and `createFormDefinitionHook` take an optional second type argument describing the custom runtime props your field components accept: `useFormDefinition<typeof definition, { tooltip?: string }>(definition)`. The extras are added to `<RenderedField>`'s props, so passing an undeclared key or a wrong value type is now a compile error instead of being silently filtered. The type argument defaults to a permissive record, so existing untyped usage compiles unchanged. The extras are still filtered at runtime against each field type's `additionalProps` allowlist - typing them only adds compile-time checking. This completes the typed-forwarding work noted as planned in 2.0.0. A new `RenderedFieldBaseProps` type (the always-typed standard overrides, without the extras) is exported for advanced use.

### Changed

- **Value-aware messages for the string validators.** The `contains`, `startsWith`, and `endsWith` validators now include the constraint value in their message options, so a translation can say what the string must contain/start with/end with (the encoded message is `["contains", { value: "foo" }]` rather than `["contains", {}]`). `defaultValidationMessages` gained matching entries for these three plus `noWhitespace`, `uppercase`, and `lowercase`, which previously had no default and were humanized from the key (e.g. "No Whitespace") on the server. To override them, add `contains`/`startsWith`/`endsWith` keys to your message catalog and interpolate `{value}` (see the Next.js example's `messages/*.json`).
- **Bumped `@hookform/resolvers` from `^3.0.0` to `^5.4.0`.** The `zodResolver` usage is unchanged; this is a direct-dependency upgrade with no API change on our side. Because resolvers v5 requires `react-hook-form` `^7.55.0`, the `react-hook-form` peer dependency floor is raised from `>=7.0.0` to `>=7.55.0` to match (still Zod 3). Consumers on react-hook-form below 7.55.0 should upgrade.

## [2.0.0] - 2026-05-12

### Changed (BREAKING)

- **Now requires React 19.** The library uses `useActionState` and the `<form action>` form-action mechanism (for server actions / progressive enhancement), so the React peer dependency is now `>=19.0.0` (was `>=18.0.0`).

- **Renamed the `SubmitButton` form-config slot to `Actions`.** The slot already accepts an arbitrary `React.ComponentType`, so the previous name overstated its purpose - many real-world forms render `[Cancel] [Save]`, `[Reset] [Apply] [Save]`, destructive `[Delete]`, etc. The new name makes that intent explicit. Migration:
  - `FormConfig.components.SubmitButton` → `FormConfig.components.Actions`
  - `useFormDefinition(...)` returned `SubmitButton` → `Actions`
  - `<RenderedForm showSubmitButton={...} />` prop → `showActions`
  - Exported component `SubmitButton` (and `SubmitButtonProps` type) → `Actions` (and `ActionsProps`)
  - The component file `src/components/SubmitButton.tsx` was renamed to `src/components/Actions.tsx`
  - The default fallback (when no component is registered) is unchanged: a plain `<button type="submit">Submit</button>`

  No back-compat alias is provided; update all references in one pass.

- **Lifecycle separation: `RenderedField` accepts typed runtime override props instead of an untyped `additionalProps` bag.** Standard runtime props are now first-class on `<RenderedField>`: `disabled`, `options`, `label`, `placeholder`, `className`, `style`. The definition supplies the static default; the prop wins at runtime. Other forwarded props are accepted via a loose rest signature for now (full typed forwarding is planned for a future minor release). Migration:

  ```tsx
  // before
  <RenderedField name="role" additionalProps={{ disabled: true, options: roleOptions }} />

  // after
  <RenderedField name="role" disabled options={roleOptions} />
  ```

  Use this pattern when a field's value depends on render-scope state (an async query, a permission check, a feature flag). For purely static forms, `<RenderedForm />` still iterates the definition with no per-field props needed.

- **Removed `FormFieldDefinition.optionsCallback`.** Loading async options inside the static definition mixed runtime concerns into a structure that's meant to be hoist-able to module scope. Migration: load options in your component (e.g. `useQuery` or any data hook) and pass them to the field at the call site.

  ```tsx
  // before
  const definition = {
    role: { type: 'select', label: 'Role', optionsCallback: fetchRoles },
  };
  // ... and the built-in Select would fetch on mount

  // after
  const definition = {
    role: { type: 'select', label: 'Role' },   // static definition only
  };
  function MyForm() {
    const roleOptions = useRoleOptions();      // runtime
    return (
      <Form onSubmit={...}>
        <RenderedField name="role" options={roleOptions} />
        ...
      </Form>
    );
  }
  ```

  The built-in `Select` component (`src/components/Select.tsx`) no longer ships with internal async-load. If you need a self-fetching select, copy the component (`npx use-form-definition copy select ./src/components/`) and add your own fetch.

- **Renamed `<RenderedForm>` `action` prop to `serverAction`.** The HTML form element has its own `action` attribute, and the overload of the same word for a Next.js server action created ambiguity. The new name reads as what it is. Migration: `<RenderedForm action={myAction} />` → `<RenderedForm serverAction={myAction} />`.

- **Removed deprecated `TranslationConfigObject.t` field.** Use `function` instead. The `t` field had been marked `@deprecated` since v1; this release deletes it.

- **Removed unused public types.** The following were exported but had no usage (internal or downstream): `FieldComponent`, `Meta`, `FormOptions`. If you imported any of them, the migrations are:
  - `FieldComponent` - was an unused interface for field component props. Define your own type or use `React.ComponentProps<typeof YourComponent>`.
  - `Meta` - leftover from a pagination shape that was removed. Define your own if needed.
  - `FormOptions<T>` - was just an alias for React Hook Form's `UseFormProps<T>`. Import `UseFormProps` from `react-hook-form` directly.

- **`FormFieldDefinition.label` and `placeholder` now use `string | "auto" | "none"` instead of `string | boolean`.** The boolean form (`label: true`, `label: false`) was cryptic - `true` what? - and is replaced with explicit sentinel strings that self-document. Migration:
  - `label: true` → `label: "auto"` (use default translation localePath)
  - `label: false` → `label: "none"` (explicit opt-out)
  - `placeholder: true` → `placeholder: "auto"`
  - `placeholder: false` → `placeholder: "none"`

  Note: the special strings `"auto"` and `"none"` are reserved - a literal label of `"auto"` or `"none"` is no longer supported. Use a translation key or a different literal.

- **`<RenderedForm>` now honors `Actions: false` as an explicit opt-out.** Previously, setting `Actions: false` in the form config rendered the default `<button type="submit">` anyway - the falsy check fell through to the fallback. Now `Actions: false` renders no actions slot at all (consistent with how `LayoutContainer: false` and `LayoutItem: false` already behave). To opt out per-render instead of globally, use `<RenderedForm showActions={false} />`.

- **Tightened `FormConfig.pluginRegistry` type.** Was `any` (citing a circular dependency); now properly typed as `PluginRegistry | undefined` via a type-only import that breaks the cycle. No runtime behavior change.

### Changed (internal)

- **Consolidated `NestedFieldRenderer` type.** The type was previously defined in both `src/components/Repeater.tsx` and `src/hooks/useFormDefinition.tsx`. Single source of truth now lives in `src/core/types.ts` and both files re-export it for back-compat at the import-path level.

- **Extracted `CommonValidationRules` shared by all field-specific validation rule types.** `StringValidationRules`, `NumberValidationRules`, `DateValidationRules`, `ArrayValidationRules`, `SelectValidationRules`, and `BooleanValidationRules` now extend a single `CommonValidationRules` interface (`required`, `requiredWhen`) instead of redeclaring those rules. `BaseValidationRules` (the permissive umbrella type used as `FormFieldDefinition.validation`) now also extends `CommonValidationRules` and gets a JSDoc clarifying its purpose. Fixed an inconsistency where `BaseValidationRules.pattern` used `RegExp | PatternKey` but `StringValidationRules.pattern` used `RegExp | string` - both now use `RegExp | PatternKey` (typed pattern names like `"email"`, `"url"`, etc.).

- **Improved `FormFieldDefinition.name` JSDoc** to clearly explain that the field's name auto-derives from the definition object's key when omitted, and when you'd want to set it explicitly.

- **Formalized the library-injected internal-props pattern.** Added `InternalComponentProps` to `core/types.ts` documenting the `__formConfig`, `__renderNestedField`, and `__getDefaultValueForField` props that the library injects into complex field components registered with `injectFormConfig: true`. `RepeaterProps` now extends `Partial<InternalComponentProps>` instead of redeclaring the three props inline. Custom complex-field components should follow the same pattern.

- **Tightened the return type of `getDefaultFieldTypes`** from `Record<string, ComponentType<any> | any>` to `Record<string, ComponentType<any> | ProcessedComponentConfig>`. The `| any` was masking the fact that entries can also be config objects; the explicit union is more accurate and gives consumers proper completions.

### Added

- **`serverAction` as a `useFormDefinition` / `createFormDefinitionHook` option, with progressive enhancement.** Passing the server action to the hook (rather than as a `<RenderedForm serverAction={...}>` prop) makes the hook own the `useActionState` lifecycle and return `actionState`, `isPending`, and `formAction`. `<RenderedForm>` then wires it via `<form action={...}>`, so:
  - With JavaScript disabled, the form submits and validates server-side natively, the server's field errors render server-side, and the fields repopulate from `FormActionResult.values`.
  - With JavaScript, the form intercepts on submit, runs react-hook-form's client validation as a gate, then dispatches the action inside `startTransition` (so `isPending` updates and there's no "called outside a transition" warning). Server-side errors are pushed onto react-hook-form as `type: 'server'` errors and shown verbatim.

  Render your success/result view from `actionState` so it works with or without JS. The internal `useForm` uses `mode: 'onTouched'` when a `serverAction` is configured. Passing `serverAction` as a `<RenderedForm>` prop still works (back-compat) but does not expose `actionState`.
- **`FormActionResult.values`** - an optional bag of raw submitted values (e.g. `Object.fromEntries(formData.entries())`); when present on a failed result, `<RenderedForm>` re-populates the fields from it on a no-JS validation-error round-trip.
- **`noValidate` option** - disables the browser's built-in HTML5 constraint bubbles on the rendered `<form>`, so react-hook-form / your server action are the sole validators. Settable on `createFormDefinitionHook(...)` config, per-call `config`, or per form via `<RenderedForm noValidate>`.
- **`RenderedForm` and `RenderedField` are now stable component identities** - they no longer get recreated on every parent render, so the form subtree doesn't remount unnecessarily.
- **Conditional visibility example.** `examples/basic-react/src/pages/ContactPage.tsx` now uses manual rendering (`<Form>` + `<RenderedField>` + `form.watch()`) to show/hide the "Please specify" field based on the selected subject. Cross-linked from README and `docs/api-reference.md`.
- **Documentation for `RenderedField` runtime override props** in `docs/api-reference.md` - covers the new typed `disabled`, `options`, `label`, `placeholder`, `className`, `style`, and `render` props introduced by the lifecycle separation.
- **"When this saves you time" section** in README that explains the multi-system value (schema + form state + rendering + server validation in one definition) and honestly notes when the library isn't the right choice.

### Fixed

- **Server-action submit no longer dispatches the `useActionState` action outside a transition.** With JS, `<RenderedForm>` now dispatches inside `startTransition`, so React no longer logs "An async function with useActionState was called outside of a transition" and `isPending` updates correctly.
- **Controlled fields no longer desync after a server-action submit.** Previously the client went through React 19's `<form action>` lifecycle, which resets the form's DOM after the action - a controlled `<select>` would visually snap back to its first option while react-hook-form still held the chosen value, so the next submit posted the empty value and the server rejected it as an invalid selection. The client now `preventDefault()`s and dispatches the action itself, leaving the DOM untouched (the `action` attribute stays on the `<form>` so a no-JS submit still posts natively).
- **`useActionState` is now called unconditionally inside `RenderedForm`** (via a no-op fallback action when no `serverAction` is configured), fixing a Rules-of-Hooks violation where the hook was called conditionally on the presence of a server action.
- **Built-in validation messages now cover `invalidFormat`, `invalidSelection`, and `invalidSelections`.** The string-pattern, select, number-`required`, and multiselect schemas referenced these keys, but they were missing from `defaultValidationMessages` (and some were emitted as bare strings rather than message keys), so server-side validation produced humanized strings like `"Invalid Selection"` that an i18n client then failed to resolve back to a translation (`MISSING_MESSAGE`). The schemas now emit `createMessage(...)` keys consistently with every other validation rule, so messages round-trip for translation on both client and server.

## [1.0.0] - 2024-12-12

### Added

- **Definition-driven forms**: Generate type-safe forms from simple field definitions
- **UI-agnostic architecture**: Works with any React component library
- **React Hook Form integration**: Full compatibility with React Hook Form v7+
- **Zod validation**: Type-safe validation with Zod schemas
- **Component-based API**: `<RenderedField />` and `<RenderedForm />` components
- **Server action support**: Built-in support for Next.js server actions with `useActionState`
- **Plugin architecture**: Extensible validation with async validation, custom field types, and rule composition
- **Repeater fields**: Dynamic lists with add/remove functionality and recursive field definitions
- **Translation system**: Pluggable i18n support with hook and function patterns
- **Copy-and-customize CLI**: Tool for copying reference components to your project
- **Auto-layout system**: 2-column grid layout with customizable `LayoutContainer` and `LayoutItem`
- **Field wrapper patterns**: Support for both children and render prop Field components
- **15+ built-in validation patterns**: email, url, phone, slug, username, alphanumeric, and more
- **Type inference**: Automatic TypeScript type inference from form definitions
- **Factory pattern**: Pre-configure form behavior with `createFormDefinitionHook`
