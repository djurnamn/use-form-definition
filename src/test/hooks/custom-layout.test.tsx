import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormDefinition, FormActionResult } from '../../core/types';

// Configured hook → built-in field components + default Form/Actions/Field.
const useFormDefinition = createFormDefinitionHook({});

const profileDefinition: FormDefinition = {
  name: { type: 'text', validation: { required: true, minLength: 2 } },
  bio: { type: 'textarea' },
};

type Action = (prev: FormActionResult | null, fd: FormData) => Promise<FormActionResult>;

// A form that supplies a hand-arranged layout (an "aside" beside the fields) through
// `RenderedForm`'s `children`, composed from `RenderedField` + `Actions`.
function CustomLayoutForm({ serverAction }: { serverAction: Action }) {
  const { RenderedForm, RenderedField, Actions } = useFormDefinition(profileDefinition, {
    serverAction,
  });
  return (
    <RenderedForm>
      <div data-testid="aside">
        <RenderedField name="name" />
      </div>
      <div data-testid="body">
        <RenderedField name="bio" />
      </div>
      <Actions />
    </RenderedForm>
  );
}

describe('RenderedForm with a custom layout (children)', () => {
  it('renders the supplied layout instead of the automatic field grid', () => {
    const action = vi.fn(async () => ({ success: true }));
    render(<CustomLayoutForm serverAction={action} />);

    // Each field renders inside the hand-placed container it was put in.
    expect(within(screen.getByTestId('aside')).getByRole('textbox')).toBeInTheDocument();
    expect(within(screen.getByTestId('body')).getByRole('textbox')).toBeInTheDocument();
    // Exactly one submit button (Actions placed once by the app, no duplicate from the grid).
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('keeps the server-action wiring - dispatch + submitted data - in the custom layout', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_prev: FormActionResult | null, fd: FormData) => ({
      success: true,
      data: Object.fromEntries(fd) as any,
    }));
    render(<CustomLayoutForm serverAction={action} />);

    await user.type(within(screen.getByTestId('aside')).getByRole('textbox'), 'Alice');
    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0][1].get('name')).toBe('Alice');
  });

  it('shows a server-action error on a field placed by hand in the custom layout', async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_prev: FormActionResult | null, fd: FormData) => ({
      success: false,
      errors: { name: ['That name is already taken'] },
      values: Object.fromEntries(fd) as Record<string, unknown>,
    }));
    render(<CustomLayoutForm serverAction={action} />);

    await user.type(within(screen.getByTestId('aside')).getByRole('textbox'), 'Alice');
    await user.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(screen.getByText('That name is already taken')).toBeInTheDocument()
    );
  });
});
