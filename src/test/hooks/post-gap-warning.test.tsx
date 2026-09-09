import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormDefinition, FormActionResult } from '../../core/types';

/**
 * The DOM is the payload (D5). A control that renders no named native element posts
 * nothing while the model holds a value, and the server keeps the stored one. Nothing
 * blocks; in development the JavaScript submit says so, naming the field.
 */

type Action = (prev: FormActionResult | null, fd: FormData) => Promise<FormActionResult>;

const Bare = ({ value }: { value?: unknown }) => <div>{String(value ?? '')}</div>;
const Named = ({ name, value }: { name?: string; value?: unknown }) => (
  <input type="hidden" name={name} value={String(value ?? '')} readOnly />
);

function formFor(
  definition: FormDefinition,
  components: Record<string, React.ComponentType<any>>,
  defaultValues?: Record<string, unknown>
) {
  const useFormDefinition = createFormDefinitionHook({ components });
  return function Form({ serverAction }: { serverAction: Action }) {
    const { RenderedForm } = useFormDefinition(definition, { serverAction, defaultValues });
    return <RenderedForm />;
  };
}

async function submit(Form: React.ComponentType<{ serverAction: Action }>) {
  const action: Action = vi.fn(async () => ({ success: true }));
  render(<Form serverAction={action} />);
  await userEvent.setup().click(screen.getByRole('button', { name: /submit/i }));
  await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  return action;
}

const ours = (warn: { mock: { calls: unknown[][] } }) =>
  warn.mock.calls.filter(([message]) => String(message).includes('the post carries no entry'));

describe('a declared field the post does not carry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('warns at submit in development, naming the field, and still dispatches', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Form = formFor(
      { name: { type: 'text' }, widget: { type: 'widget' } },
      { widget: Bare },
      { widget: 'stored' }
    );
    await submit(Form);
    expect(ours(warn)).toHaveLength(1);
    expect(String(ours(warn)[0][0])).toMatch(/`widget`/);
    expect(String(ours(warn)[0][0])).not.toMatch(/`name`/);
  });

  it('is quiet when the model value is empty - absence is what the browser posts', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Form = formFor(
      { agree: { type: 'checkbox' }, widget: { type: 'widget' } },
      { widget: Bare }
    );
    await submit(Form);
    expect(ours(warn)).toHaveLength(0);
  });

  it('is quiet when the control renders a named native element', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Form = formFor({ widget: { type: 'widget' } }, { widget: Named }, { widget: 'stored' });
    await submit(Form);
    expect(ours(warn)).toHaveLength(0);
  });

  it('is quiet in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Form = formFor({ widget: { type: 'widget' } }, { widget: Bare }, { widget: 'stored' });
    await submit(Form);
    expect(ours(warn)).toHaveLength(0);
  });
});
