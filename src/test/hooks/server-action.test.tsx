import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormDefinition, FormActionResult } from '../../core/types';

// Use the configured hook so we get the built-in field-type components + default Form/Actions/Field.
const useFormDefinition = createFormDefinitionHook({});

const feedbackDefinition: FormDefinition = {
  name: { type: 'text', validation: { required: true, minLength: 2 } },
  rating: {
    type: 'select',
    options: [
      { value: '5', label: 'Excellent' },
      { value: '4', label: 'Good' },
      { value: '3', label: 'Average' },
    ],
    validation: { required: true },
  },
};

type Action = (prev: FormActionResult | null, fd: FormData) => Promise<FormActionResult>;

function FeedbackForm({
  serverAction,
  onSuccess,
  onError,
}: {
  serverAction: Action;
  onSuccess?: (r: FormActionResult) => void;
  onError?: (r: FormActionResult) => void;
}) {
  const { RenderedForm, actionState, isPending } = useFormDefinition(feedbackDefinition, { serverAction });
  return (
    <div>
      <div data-testid="pending">{isPending ? 'pending' : 'idle'}</div>
      <div data-testid="state">{actionState ? 'has-state' : 'null'}</div>
      {actionState?.success && (
        <div data-testid="success">Thanks, {String((actionState.data as any)?.name ?? '')}</div>
      )}
      <RenderedForm onSuccess={onSuccess} onError={onError} />
    </div>
  );
}

// Fill the form with values that pass client validation.
async function fillValid(user: ReturnType<typeof userEvent.setup>, name = 'Alice', rating = '5') {
  await user.clear(screen.getByRole('textbox'));
  await user.type(screen.getByRole('textbox'), name);
  await user.selectOptions(screen.getByRole('combobox'), rating);
}

describe('RenderedForm with a server action', () => {
  it('exposes a null actionState and is not pending before submit', () => {
    const action = vi.fn(async () => ({ success: true }));
    render(<FeedbackForm serverAction={action} />);
    expect(screen.getByTestId('state')).toHaveTextContent('null');
    expect(screen.getByTestId('pending')).toHaveTextContent('idle');
    expect(action).not.toHaveBeenCalled();
  });

  it('runs the client-validation gate before dispatching — invalid input shows client errors and the action is not called', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ success: true }));
    render(<FeedbackForm serverAction={action} />);

    await user.click(screen.getByRole('button'));

    // `name` is empty → react-hook-form's own validation kicks in (built-in English message), and
    // we never round-trip to the server.
    await waitFor(() => expect(screen.getByText('Must be at least 2 characters')).toBeInTheDocument());
    expect(action).not.toHaveBeenCalled();
  });

  it('dispatches the action with the submitted form data and surfaces the success result', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_prev: FormActionResult | null, fd: FormData) => ({
      success: true,
      data: Object.fromEntries(fd) as any,
    }));
    render(<FeedbackForm serverAction={action} />);

    await fillValid(user, 'Alice', '5');
    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByTestId('success')).toBeInTheDocument());
    expect(action).toHaveBeenCalledTimes(1);
    const fd = action.mock.calls[0][1];
    expect(fd.get('name')).toBe('Alice');
    expect(fd.get('rating')).toBe('5');
    // React's progressive-enhancement bookkeeping inputs must not leak into the payload.
    expect([...fd.keys()].some((k) => k.startsWith('$ACTION'))).toBe(false);
    expect(screen.getByTestId('success')).toHaveTextContent('Thanks, Alice');
  });

  it('renders server-side validation errors verbatim (no re-translation of the server message)', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_prev: FormActionResult | null, fd: FormData) => ({
      success: false,
      // A server-only rule the client can't check — comes back already display-ready.
      errors: { name: ['That name is already taken'] },
      values: Object.fromEntries(fd) as Record<string, unknown>,
    }));
    render(<FeedbackForm serverAction={action} />);

    await fillValid(user, 'Alice', '5'); // passes the client gate so we actually hit the server
    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByText('That name is already taken')).toBeInTheDocument());
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('keeps a controlled <select> value after a server-action submit that returns errors', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_prev: FormActionResult | null, fd: FormData) => ({
      success: false,
      errors: { name: ['Server rejected this'] },
      values: Object.fromEntries(fd) as Record<string, unknown>,
    }));
    render(<FeedbackForm serverAction={action} />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    await fillValid(user, 'Alice', '4');
    expect(select.value).toBe('4');

    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText('Server rejected this')).toBeInTheDocument());

    // React 19's <form action> reset would otherwise snap the <select> back to its first option.
    expect(select.value).toBe('4');

    // ...and a second submit must send that value, not an empty string.
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    expect(action.mock.calls[1][1].get('rating')).toBe('4');
  });

  it('toggles isPending around the action and fires onSuccess', async () => {
    const user = userEvent.setup();
    let resolveAction!: (r: FormActionResult) => void;
    const action = vi.fn(() => new Promise<FormActionResult>((resolve) => { resolveAction = resolve; }));
    const onSuccess = vi.fn();
    const onError = vi.fn();
    render(<FeedbackForm serverAction={action} onSuccess={onSuccess} onError={onError} />);

    await fillValid(user, 'Bob', '5');
    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('pending'));
    resolveAction({ success: true, data: { name: 'Bob' } as any });
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('idle'));
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});
