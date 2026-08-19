import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useForm, type FieldValues } from 'react-hook-form';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormDefinition, FormActionResult } from '../../core/types';

/**
 * The `defaultValues` hook option: starting values for the form the hook constructs (an
 * edit form's stored record), merged over the definition's generated defaults.
 *
 * The third tier of the merge - a failed action's echoed `values` winning over these on
 * the no-JS round trip - happens at a server render where `useActionState` already holds
 * the result at mount, which jsdom cannot prime through the real hook; that ordering
 * lives in `generatedOptions` next to this option and is documented there.
 */

const useFormDefinition = createFormDefinitionHook({});

const definition: FormDefinition = {
  name: { type: 'text', validation: { required: true } },
  bio: { type: 'text' },
};

type Action = (prev: FormActionResult | null, fd: FormData) => Promise<FormActionResult>;

function EditForm({ defaultValues }: { defaultValues?: Record<string, unknown> }) {
  const { RenderedForm } = useFormDefinition(definition, { defaultValues });
  return <RenderedForm />;
}

function ConsumerFormWins({ serverAction }: { serverAction?: Action }) {
  const form = useForm<FieldValues>({
    defaultValues: { name: 'from consumer form', bio: '' },
  });
  const { RenderedForm } = useFormDefinition(definition, {
    form,
    defaultValues: { name: 'from ignored option' },
    serverAction,
  });
  return <RenderedForm />;
}

const field = (container: HTMLElement, name: string) =>
  container.querySelector(`input[name="${name}"]`) as HTMLInputElement;

describe('the defaultValues hook option', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('seeds the internally-created form over the generated defaults', () => {
    const { container } = render(
      <EditForm defaultValues={{ name: 'Astrid' }} />
    );

    // The stored record's value where given; the definition's generated default ("")
    // where not - a partial record must not blank the rest.
    expect(field(container, 'name').value).toBe('Astrid');
    expect(field(container, 'bio').value).toBe('');
  });

  it('is ignored when the consumer passes their own form', () => {
    const { container } = render(<ConsumerFormWins />);

    expect(field(container, 'name').value).toBe('from consumer form');
  });

  it('warns once in development when form and serverAction are combined', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const serverAction: Action = vi.fn(async () => ({ success: true }));
    render(<ConsumerFormWins serverAction={serverAction} />);

    const warnings = warn.mock.calls.filter(([message]) =>
      String(message).includes('`form` and `serverAction`')
    );
    expect(warnings).toHaveLength(1);
  });

  it('stays quiet about the combination when only one of the two is present', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<ConsumerFormWins />);
    render(<EditForm defaultValues={{ name: 'Astrid' }} />);

    const warnings = warn.mock.calls.filter(([message]) =>
      String(message).includes('`form` and `serverAction`')
    );
    expect(warnings).toHaveLength(0);
  });
});
