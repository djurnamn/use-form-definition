# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
