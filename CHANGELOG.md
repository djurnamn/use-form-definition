# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-05-12

### Changed (BREAKING)

- **Now requires React 19.** The library uses `useActionState` and the `<form action>` form-action mechanism (for server actions / progressive enhancement), so the React peer dependency is now `>=19.0.0` (was `>=18.0.0`).

- **Renamed the `SubmitButton` form-config slot to `Actions`.** The slot already accepts an arbitrary `React.ComponentType`, so the previous name overstated its purpose — many real-world forms render `[Cancel] [Save]`, `[Reset] [Apply] [Save]`, destructive `[Delete]`, etc. The new name makes that intent explicit. Migration:
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
  - `FieldComponent` — was an unused interface for field component props. Define your own type or use `React.ComponentProps<typeof YourComponent>`.
  - `Meta` — leftover from a pagination shape that was removed. Define your own if needed.
  - `FormOptions<T>` — was just an alias for React Hook Form's `UseFormProps<T>`. Import `UseFormProps` from `react-hook-form` directly.

- **`FormFieldDefinition.label` and `placeholder` now use `string | "auto" | "none"` instead of `string | boolean`.** The boolean form (`label: true`, `label: false`) was cryptic — `true` what? — and is replaced with explicit sentinel strings that self-document. Migration:
  - `label: true` → `label: "auto"` (use default translation localePath)
  - `label: false` → `label: "none"` (explicit opt-out)
  - `placeholder: true` → `placeholder: "auto"`
  - `placeholder: false` → `placeholder: "none"`

  Note: the special strings `"auto"` and `"none"` are reserved — a literal label of `"auto"` or `"none"` is no longer supported. Use a translation key or a different literal.

- **`<RenderedForm>` now honors `Actions: false` as an explicit opt-out.** Previously, setting `Actions: false` in the form config rendered the default `<button type="submit">` anyway — the falsy check fell through to the fallback. Now `Actions: false` renders no actions slot at all (consistent with how `LayoutContainer: false` and `LayoutItem: false` already behave). To opt out per-render instead of globally, use `<RenderedForm showActions={false} />`.

- **Tightened `FormConfig.pluginRegistry` type.** Was `any` (citing a circular dependency); now properly typed as `PluginRegistry | undefined` via a type-only import that breaks the cycle. No runtime behavior change.

### Changed (internal)

- **Consolidated `NestedFieldRenderer` type.** The type was previously defined in both `src/components/Repeater.tsx` and `src/hooks/useFormDefinition.tsx`. Single source of truth now lives in `src/core/types.ts` and both files re-export it for back-compat at the import-path level.

- **Extracted `CommonValidationRules` shared by all field-specific validation rule types.** `StringValidationRules`, `NumberValidationRules`, `DateValidationRules`, `ArrayValidationRules`, `SelectValidationRules`, and `BooleanValidationRules` now extend a single `CommonValidationRules` interface (`required`, `requiredWhen`) instead of redeclaring those rules. `BaseValidationRules` (the permissive umbrella type used as `FormFieldDefinition.validation`) now also extends `CommonValidationRules` and gets a JSDoc clarifying its purpose. Fixed an inconsistency where `BaseValidationRules.pattern` used `RegExp | PatternKey` but `StringValidationRules.pattern` used `RegExp | string` — both now use `RegExp | PatternKey` (typed pattern names like `"email"`, `"url"`, etc.).

- **Improved `FormFieldDefinition.name` JSDoc** to clearly explain that the field's name auto-derives from the definition object's key when omitted, and when you'd want to set it explicitly.

- **Formalized the library-injected internal-props pattern.** Added `InternalComponentProps` to `core/types.ts` documenting the `__formConfig`, `__renderNestedField`, and `__getDefaultValueForField` props that the library injects into complex field components registered with `injectFormConfig: true`. `RepeaterProps` now extends `Partial<InternalComponentProps>` instead of redeclaring the three props inline. Custom complex-field components should follow the same pattern.

- **Tightened the return type of `getDefaultFieldTypes`** from `Record<string, ComponentType<any> | any>` to `Record<string, ComponentType<any> | ProcessedComponentConfig>`. The `| any` was masking the fact that entries can also be config objects; the explicit union is more accurate and gives consumers proper completions.

### Added

- **`serverAction` as a `useFormDefinition` / `createFormDefinitionHook` option, with progressive enhancement.** Passing the server action to the hook (rather than as a `<RenderedForm serverAction={...}>` prop) makes the hook own the `useActionState` lifecycle and return `actionState`, `isPending`, and `formAction`. `<RenderedForm>` then wires it via `<form action={...}>`, so:
  - With JavaScript disabled, the form submits and validates server-side natively, the server's field errors render server-side, and the fields repopulate from `FormActionResult.values`.
  - With JavaScript, the form intercepts on submit, runs react-hook-form's client validation as a gate, then dispatches the action inside `startTransition` (so `isPending` updates and there's no "called outside a transition" warning). Server-side errors are pushed onto react-hook-form as `type: 'server'` errors and shown verbatim.

  Render your success/result view from `actionState` so it works with or without JS. The internal `useForm` uses `mode: 'onTouched'` when a `serverAction` is configured. Passing `serverAction` as a `<RenderedForm>` prop still works (back-compat) but does not expose `actionState`.
- **`FormActionResult.values`** — an optional bag of raw submitted values (e.g. `Object.fromEntries(formData.entries())`); when present on a failed result, `<RenderedForm>` re-populates the fields from it on a no-JS validation-error round-trip.
- **`noValidate` option** — disables the browser's built-in HTML5 constraint bubbles on the rendered `<form>`, so react-hook-form / your server action are the sole validators. Settable on `createFormDefinitionHook(...)` config, per-call `config`, or per form via `<RenderedForm noValidate>`.
- **`RenderedForm` and `RenderedField` are now stable component identities** — they no longer get recreated on every parent render, so the form subtree doesn't remount unnecessarily.
- **Conditional visibility example.** `examples/basic-react/src/pages/ContactPage.tsx` now uses manual rendering (`<Form>` + `<RenderedField>` + `form.watch()`) to show/hide the "Please specify" field based on the selected subject. Cross-linked from README and `docs/api-reference.md`.
- **Documentation for `RenderedField` runtime override props** in `docs/api-reference.md` — covers the new typed `disabled`, `options`, `label`, `placeholder`, `className`, `style`, and `render` props introduced by the lifecycle separation.
- **"When this saves you time" section** in README that explains the multi-system value (schema + form state + rendering + server validation in one definition) and honestly notes when the library isn't the right choice.

### Fixed

- **Server-action submit no longer dispatches the `useActionState` action outside a transition.** With JS, `<RenderedForm>` now dispatches inside `startTransition`, so React no longer logs "An async function with useActionState was called outside of a transition" and `isPending` updates correctly.
- **Controlled fields no longer desync after a server-action submit.** Previously the client went through React 19's `<form action>` lifecycle, which resets the form's DOM after the action — a controlled `<select>` would visually snap back to its first option while react-hook-form still held the chosen value, so the next submit posted the empty value and the server rejected it as an invalid selection. The client now `preventDefault()`s and dispatches the action itself, leaving the DOM untouched (the `action` attribute stays on the `<form>` so a no-JS submit still posts natively).
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
