import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormDefinition } from '../../core/types';

/**
 * A declared kind with no registered component fails loudly at hook creation. The
 * silent shape it replaces: the field validates, mirrors from inactive sections and
 * type-checks, but the active section has no control, so the value being edited never
 * posts and every save keeps the stored one.
 */

const definition: FormDefinition = {
  name: { type: 'text' },
  mechanics: { type: 'structured-mechanics' },
};

const nested: FormDefinition = {
  parts: {
    type: 'repeater',
    fields: { amount: { type: 'number' }, effect: { type: 'structured-effect' } },
  },
};

const Passthrough = ({ value }: { value?: unknown }) => <span>{String(value ?? '')}</span>;

function formFor(definition: FormDefinition, config: Record<string, unknown> = {}) {
  const useFormDefinition = createFormDefinitionHook(config);
  return function Form() {
    const { RenderedForm } = useFormDefinition(definition);
    return <RenderedForm />;
  };
}

describe('a declared kind with no registered component', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('throws at hook creation in development, naming the field and its kind', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Form = formFor(definition);
    expect(() => render(<Form />)).toThrow(/`mechanics` \(kind `structured-mechanics`\)/);
  });

  it('reaches into a repeater\'s cells', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Form = formFor(nested);
    expect(() => render(<Form />)).toThrow(/`parts\.effect` \(kind `structured-effect`\)/);
  });

  it('renders once the kind has a component', () => {
    const Form = formFor(definition, { components: { 'structured-mechanics': Passthrough } });
    expect(() => render(<Form />)).not.toThrow();
  });

  it('warns once and renders what it can in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Form = formFor(definition);
    const { container, rerender } = render(<Form />);
    rerender(<Form />);
    expect(container.querySelector('input[name="name"]')).not.toBeNull();
    const ours = warn.mock.calls.filter(([message]) =>
      String(message).includes('no component is registered')
    );
    expect(ours).toHaveLength(1);
  });
});
