import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormActionResult, FormConfig, FormDefinition } from '../../core/types';

// A whole-form message (a rate-limit refusal, an expired reset link, "invalid credentials")
// has no per-field home. The FormMessage region gives a binding a first-class place to render
// it inside the form, from either channel: a server-action envelope `message`, or a
// react-hook-form `root` error.

const definition: FormDefinition = {
  name: { type: 'text', validation: { required: true, minLength: 2 } },
};

type Action = (prev: FormActionResult | null, fd: FormData) => Promise<FormActionResult>;

const useDefault = createFormDefinitionHook({});

const CustomMessage = ({ message, status }: { message: string; status?: string }) => (
  <div data-testid="custom-message">
    CUSTOM[{status}]: {message}
  </div>
);
const useCustomMessage = createFormDefinitionHook({
  formComponents: { FormMessage: CustomMessage } as FormConfig['components'],
});
const useNoMessage = createFormDefinitionHook({
  formComponents: { FormMessage: false },
});

function ServerForm({
  serverAction,
  hook = useDefault,
}: {
  serverAction: Action;
  hook?: ReturnType<typeof createFormDefinitionHook>;
}) {
  const { RenderedForm } = hook(definition, { serverAction });
  return <RenderedForm />;
}

async function submitValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox'), 'Alice');
  await user.click(screen.getByRole('button'));
}

describe('FormMessage region - server-action envelope channel', () => {
  it('renders nothing before a submit (no message yet)', () => {
    const action = vi.fn(async () => ({ success: true }));
    const { container } = render(<ServerForm serverAction={action} />);
    expect(container.querySelector('[data-form-message]')).toBeNull();
  });

  it('renders an error envelope message inside the form, with role="alert"', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_p: FormActionResult | null, fd: FormData) => ({
      success: false,
      message: 'reset link invalid or expired',
      values: Object.fromEntries(fd) as Record<string, unknown>,
    }));
    const { container } = render(<ServerForm serverAction={action} />);

    await submitValid(user);

    const region = await screen.findByText('reset link invalid or expired');
    expect(region).toHaveAttribute('role', 'alert');
    expect(region).toHaveAttribute('data-status', 'error');
    // It lives inside the <form>, not somewhere outside it.
    expect(container.querySelector('form')?.contains(region)).toBe(true);
  });

  it('uses status="success" (role="status", not alert) for a successful envelope message', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ success: true, message: 'Your changes were saved' }));
    render(<ServerForm serverAction={action} />);

    await submitValid(user);

    const region = await screen.findByText('Your changes were saved');
    expect(region).toHaveAttribute('data-status', 'success');
    expect(region).toHaveAttribute('role', 'status');
  });

  it('renders no region when the envelope carries no message', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ success: false, errors: { name: ['taken'] } }));
    const { container } = render(<ServerForm serverAction={action} />);

    await submitValid(user);

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(container.querySelector('[data-form-message]')).toBeNull();
  });

  it('renders a per-binding overridden FormMessage component', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ success: false, message: 'nope' }));
    render(<ServerForm serverAction={action} hook={useCustomMessage} />);

    await submitValid(user);

    const custom = await screen.findByTestId('custom-message');
    expect(custom).toHaveTextContent('CUSTOM[error]: nope');
  });

  it('renders nothing when the FormMessage slot is set to false (opt-out)', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ success: false, message: 'nope' }));
    const { container } = render(<ServerForm serverAction={action} hook={useNoMessage} />);

    await submitValid(user);

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(container.querySelector('[data-form-message]')).toBeNull();
    expect(screen.queryByText('nope')).toBeNull();
  });

  it('returns FormMessage: null from the hook when the slot is set to false', () => {
    let returned: unknown = 'unset';
    function Probe() {
      const { FormMessage } = useNoMessage(definition);
      returned = FormMessage;
      return null;
    }
    render(<Probe />);
    expect(returned).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Client-side whole-form error channel: a react-hook-form `root` error, the idiomatic
// place a resolver / consumer records an error that belongs to the form as a whole.
// ---------------------------------------------------------------------------

function ClientRootErrorForm() {
  const { RenderedForm, form } = useDefault(definition);
  return (
    <div>
      <button
        type="button"
        onClick={() => form.setError('root', { type: 'server', message: 'account locked' })}
      >
        trigger
      </button>
      <RenderedForm onSubmit={() => {}} />
    </div>
  );
}

describe('FormMessage region - client-side root error channel', () => {
  it('surfaces a react-hook-form root error, reactively, with role="alert"', async () => {
    const user = userEvent.setup();
    const { container } = render(<ClientRootErrorForm />);

    expect(container.querySelector('[data-form-message]')).toBeNull();

    await user.click(screen.getByText('trigger'));

    const region = await screen.findByText('account locked');
    expect(region).toHaveAttribute('role', 'alert');
    expect(region).toHaveAttribute('data-status', 'error');
    expect(container.querySelector('form')?.contains(region)).toBe(true);
  });
});
