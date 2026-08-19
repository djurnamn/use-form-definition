import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormDefinition, FormActionResult } from '../../core/types';

/**
 * The submit gate validates the whole definition, but a form may render only part of
 * itself. When every failing field is off-screen the button looks dead: nothing submits,
 * and no error appears anywhere to say why.
 */

const useFormDefinition = createFormDefinitionHook({});

const definition: FormDefinition = {
  name: { type: 'text', validation: { required: true } },
  handle: { type: 'text', validation: { required: true } },
};

type Action = (prev: FormActionResult | null, fd: FormData) => Promise<FormActionResult>;

function TwoPageForm({ serverAction }: { serverAction: Action }) {
  const { RenderedForm, RenderedField } = useFormDefinition(definition, { serverAction });
  const [page, setPage] = useState<'one' | 'two'>('one');

  return (
    <RenderedForm>
      <button type="button" onClick={() => setPage(page === 'one' ? 'two' : 'one')}>
        Switch
      </button>
      {page === 'one' ? <RenderedField name="name" /> : <RenderedField name="handle" />}
      <button type="submit">Submit</button>
    </RenderedForm>
  );
}

/** The same two pages, client-only - the dead button is not server-action-specific. */
function TwoPageClientForm({ onSubmit }: { onSubmit: (data: unknown) => void }) {
  const { RenderedForm, RenderedField } = useFormDefinition(definition, {});
  const [page, setPage] = useState<'one' | 'two'>('one');

  return (
    <RenderedForm onSubmit={onSubmit}>
      <button type="button" onClick={() => setPage(page === 'one' ? 'two' : 'one')}>
        Switch
      </button>
      {page === 'one' ? <RenderedField name="name" /> : <RenderedField name="handle" />}
      <button type="submit">Submit</button>
    </RenderedForm>
  );
}

describe('a submit blocked entirely by off-screen errors', () => {
  it('says so, instead of doing nothing', async () => {
    const user = userEvent.setup();
    const serverAction: Action = vi.fn(async () => ({ success: true }));
    const { container } = render(<TwoPageForm serverAction={serverAction} />);

    // Fill the visible field; `handle` is required and lives on the other page.
    await user.type(container.querySelector('input[name="name"]')!, 'Astrid');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(screen.getByText(/not currently shown/i)).toBeTruthy()
    );
    expect(serverAction).not.toHaveBeenCalled();
  });

  it('stays quiet when the failing field is on screen - the error renders on the field', async () => {
    const user = userEvent.setup();
    const serverAction: Action = vi.fn(async () => ({ success: true }));
    render(<TwoPageForm serverAction={serverAction} />);

    // Submit with `name` empty: it IS rendered, so the per-field error is visible and the
    // whole-form message would be noise on top of it.
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(serverAction).not.toHaveBeenCalled());
    expect(screen.queryByText(/not currently shown/i)).toBeNull();
  });

  it('clears once the off-screen field is filled and the form submits', async () => {
    const user = userEvent.setup();
    const serverAction: Action = vi.fn(async () => ({ success: true }));
    const { container } = render(<TwoPageForm serverAction={serverAction} />);

    await user.type(container.querySelector('input[name="name"]')!, 'Astrid');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(screen.getByText(/not currently shown/i)).toBeTruthy());

    await user.click(screen.getByRole('button', { name: 'Switch' }));
    await user.type(container.querySelector('input[name="handle"]')!, 'astrid');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(serverAction).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/not currently shown/i)).toBeNull();
  });

  it('also fires on a client-only form - the gate is the resolver, not the server action', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<TwoPageClientForm onSubmit={onSubmit} />);

    await user.type(container.querySelector('input[name="name"]')!, 'Astrid');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(screen.getByText(/not currently shown/i)).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears on a client-only form once the submit goes through', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<TwoPageClientForm onSubmit={onSubmit} />);

    await user.type(container.querySelector('input[name="name"]')!, 'Astrid');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(screen.getByText(/not currently shown/i)).toBeTruthy());

    await user.click(screen.getByRole('button', { name: 'Switch' }));
    await user.type(container.querySelector('input[name="handle"]')!, 'astrid');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/not currently shown/i)).toBeNull();
  });
});
