# Examples

This directory contains example projects demonstrating `use-form-definition` with various UI libraries and frameworks.

## Available Examples

| Example | Stack | Features |
|---------|-------|----------|
| [basic-react](./basic-react) | Vite + React | Core features, built-in unstyled components |
| [nextjs](./nextjs) | Next.js 15 + App Router | Server actions, i18n, API routes |
| [mui](./mui) | Vite + Material UI | MUI integration, hidden input pattern |
| [antd](./antd) | Vite + Ant Design | Form.Item wrapper, 24-column grid |
| [shadcn](./shadcn) | Vite + shadcn/ui + Tailwind | Definition-driven shadcn forms |

## Getting Started

Each example can be run independently:

```bash
# From the repository root
pnpm install

# Navigate to an example
cd examples/basic-react

# Start the development server
pnpm dev
```

## Choosing an Example

### Just Getting Started?

Start with **[basic-react](./basic-react)** - it demonstrates all core features using the library's built-in unstyled components with minimal dependencies.

### Using Next.js?

Check out **[nextjs](./nextjs)** - it shows server actions, API route validation, async validation, and i18n integration with the App Router.

### Using a UI Library?

- **[mui](./mui)** - Material UI integration with DatePicker, Autocomplete, and the hidden input pattern
- **[antd](./antd)** - Ant Design with Form.Item as Field wrapper and 24-column grid layout
- **[shadcn](./shadcn)** - shadcn/ui with Tailwind CSS, showing how definition-driven forms simplify the typical shadcn + react-hook-form + zod setup

## Example Structure

All examples follow a similar structure:

```
example/
├── src/
│   ├── forms/              # Form definitions
│   ├── lib/
│   │   └── form.ts         # createFormDefinitionHook configuration
│   ├── components/
│   │   └── form/           # Custom form components
│   └── pages/ or app/      # Page components
└── package.json
```

## Key Patterns Demonstrated

| Pattern | Examples |
|---------|----------|
| Basic validation | All |
| Conditional validation (`requiredWhen`) | basic-react, nextjs |
| Password matching (`matchValue`) | basic-react, nextjs |
| Repeater fields | basic-react, nextjs |
| Server actions | nextjs |
| API route validation | nextjs |
| Async validation | nextjs |
| Translation/i18n | nextjs |
| Hidden input pattern | mui, antd |
| Custom Field wrapper | All |
| Custom layout system | mui, antd, shadcn |
