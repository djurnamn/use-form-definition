import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormDefinition } from '../../core/types';

// A repeater whose nested field labels are translation keys. With a configured
// `translation.hook`, the column headers must render the *translated* string, not the key.
const teamDefinition: FormDefinition = {
  members: {
    type: 'repeater',
    label: 'Team',
    fields: {
      name: { type: 'text', label: 'name' },
      email: { type: 'text', label: 'email' },
    },
  },
};

// Minimal dictionary; the header should show these values, never the raw keys.
const dictionary: Record<string, string> = {
  name: 'Namn',
  email: 'E-post',
};

describe('Repeater column-header translation', () => {
  it('renders translated <th> headers when a translation hook is configured', () => {
    const useFormDefinition = createFormDefinitionHook({
      translation: {
        // The hook runs inside the form hook body and returns the translation function.
        hook: () => (key: string) => dictionary[key] ?? key,
        labels: { enabled: true },
      },
    });

    function TeamForm() {
      const { RenderedForm } = useFormDefinition(teamDefinition);
      return <RenderedForm />;
    }
    render(<TeamForm />);

    // Headers show the translated strings...
    expect(screen.getByRole('columnheader', { name: 'Namn' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'E-post' })).toBeInTheDocument();
    // ...and never the raw translation keys.
    expect(screen.queryByRole('columnheader', { name: 'name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'email' })).not.toBeInTheDocument();
  });

  it('leaves headers as the raw label when no translation is configured', () => {
    const useFormDefinition = createFormDefinitionHook({});

    function TeamForm() {
      const { RenderedForm } = useFormDefinition(teamDefinition);
      return <RenderedForm />;
    }
    render(<TeamForm />);

    // Backward compatible: the resolver returns the raw label, matching the pre-change fallback.
    expect(screen.getByRole('columnheader', { name: 'name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'email' })).toBeInTheDocument();
  });
});
