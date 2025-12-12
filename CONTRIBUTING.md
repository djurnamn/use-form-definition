# Contributing

Thank you for your interest in contributing to `use-form-definition`!

## Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/djurnamn/use-form-definition.git
   cd use-form-definition
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Build the library**

   ```bash
   pnpm build
   ```

4. **Run tests**

   ```bash
   pnpm test
   ```

## Project Structure

```
use-form-definition/
├── src/
│   ├── core/           # Core utilities, types, validation
│   ├── hooks/          # React hooks (useFormDefinition, createFormDefinitionHook)
│   ├── components/     # Built-in components (Field, Repeater, etc.)
│   └── server.ts       # Server-side exports
├── cli/                # CLI tool for copying components
├── examples/           # Example projects
│   ├── basic-react/    # Basic Vite + React example
│   ├── nextjs/         # Next.js with server actions
│   ├── mui/            # Material UI integration
│   ├── antd/           # Ant Design integration
│   └── shadcn/         # shadcn/ui integration
├── docs/               # Documentation
└── tests/              # Test files
```

## Development Workflow

### Running in Watch Mode

```bash
pnpm dev
```

### Type Checking

```bash
pnpm typecheck
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Open Vitest UI
pnpm test:ui
```

### Testing with Examples

To test changes with an example project:

```bash
# Build the library
pnpm build

# Navigate to an example
cd examples/basic-react

# Install and run
pnpm install
pnpm dev
```

## Pull Request Guidelines

1. **Create a feature branch** from `main`
2. **Write tests** for new functionality
3. **Update documentation** if adding new features
4. **Run the test suite** before submitting
5. **Keep commits focused** and descriptive

## Code Style

- Use TypeScript for all source files
- Follow existing code patterns and naming conventions
- Add JSDoc comments for public APIs
- Keep functions focused and composable

## Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Node version, React version, etc.)
- Code samples if applicable

## Questions?

Feel free to open an issue for questions or discussions about the project.
