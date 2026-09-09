import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import { registerFieldType } from '../../core/schema/field-generators';
import { getNestedError, NestedFieldError } from '../../core/nested-errors';
import type { FormDefinition } from '../../core/types';

/**
 * A zod issue on an item *inside* a structured field value (a repeater row's cell, an
 * array element in a custom kind) nests under the field's top-level key as a tree of
 * per-item error objects. The flat-message handling used to reduce that tree to
 * `message: undefined`, so an invalid cell blocked submit with nothing rendered
 * anywhere. These tests pin the fixed contract: the tree reaches the component with
 * its shape (and translated messages) intact, the built-in Repeater renders each
 * cell's error at the cell, and `getNestedError` is the documented way in for a
 * custom structured kind.
 */

const useFormDefinition = createFormDefinitionHook({});

const definition: FormDefinition = {
  items: {
    type: 'repeater',
    label: 'Items',
    fields: {
      title: { type: 'text', validation: { required: true } },
      qty: { type: 'number' },
    },
  },
};

function RepeaterForm({ onSubmit }: { onSubmit: (data: unknown) => void }) {
  const { RenderedForm } = useFormDefinition(definition, {});
  return <RenderedForm onSubmit={onSubmit} />;
}

describe('an invalid repeater cell', () => {
  it('renders its message at the cell, not nowhere', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RepeaterForm onSubmit={onSubmit} />);

    // Add one row (title starts empty, and is required) and submit.
    await user.click(screen.getByRole('button', { name: '+' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    const message = await screen.findByText('This field is required');
    // At the cell: the id pairs with the aria-describedby the cell's control emits.
    expect(message.getAttribute('id')).toBe('items[0].title-error');
    expect(onSubmit).not.toHaveBeenCalled();
    // The whole-form notice must not double-fire - the failing field IS on screen now.
    expect(screen.queryByText(/not currently shown/i)).toBeNull();
  });

  it('marks only the failing row - a valid sibling row stays clean', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<RepeaterForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: '+' }));
    await user.click(screen.getByRole('button', { name: '+' }));
    // Fill row 0's title, leave row 1's empty.
    await user.type(container.querySelector('input[name="items[0].title"]')!, 'Sword');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    const messages = await screen.findAllByRole('alert');
    expect(messages).toHaveLength(1);
    expect(messages[0].getAttribute('id')).toBe('items[1].title-error');
  });

  it('clears once the cell is corrected, and the form submits', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<RepeaterForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: '+' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await screen.findByText('This field is required');

    await user.type(container.querySelector('input[name="items[0].title"]')!, 'Sword');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('This field is required')).toBeNull();
  });
});

describe('a whole-list error', () => {
  const minRowsDefinition: FormDefinition = {
    items: {
      type: 'repeater',
      label: 'Items',
      fields: { title: { type: 'text' } },
      validation: { minRows: 1 },
    },
  };

  it('still renders at the repeater itself', async () => {
    function MinRowsForm({ onSubmit }: { onSubmit: (data: unknown) => void }) {
      const { RenderedForm } = useFormDefinition(minRowsDefinition, {});
      return <RenderedForm onSubmit={onSubmit} />;
    }

    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MinRowsForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Must have at least 1 rows')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('a custom structured kind', () => {
  it('receives the nested error tree on its error prop, messages translated', async () => {
    registerFieldType('statList', {
      generator: () =>
        z.array(z.object({ title: z.string().min(1, '["required"]') })),
    });

    // The kind's own UI decides where item errors render; `getNestedError` is the seam.
    function StatList({
      value,
      error,
    }: {
      value?: Array<{ title: string }>;
      error?: NestedFieldError;
    }) {
      const itemError = getNestedError(error, '0.title');
      return (
        <div>
          <input type="hidden" name="stats" value={JSON.stringify(value ?? [])} />
          {itemError?.message && <span role="alert">first stat: {itemError.message}</span>}
        </div>
      );
    }

    const useCustomForm = createFormDefinitionHook({
      components: { statList: StatList },
    });

    const customDefinition: FormDefinition = {
      stats: { type: 'statList', label: 'Stats', defaultValue: [{ title: '' }] },
    };

    function CustomForm({ onSubmit }: { onSubmit: (data: unknown) => void }) {
      const { RenderedForm } = useCustomForm(customDefinition, {});
      return <RenderedForm onSubmit={onSubmit} />;
    }

    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CustomForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    // '["required"]' is the JSON message convention - it reaches the kind translated.
    expect(await screen.findByText('first stat: This field is required')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('getNestedError', () => {
  const tree: NestedFieldError = [
    { title: { type: 'required', message: 'This field is required' } },
    undefined,
  ];

  it('resolves array and string paths to the leaf error', () => {
    expect(getNestedError(tree, [0, 'title'])?.message).toBe('This field is required');
    expect(getNestedError(tree, '0.title')?.message).toBe('This field is required');
  });

  it('returns undefined for branches, misses, and non-tree errors', () => {
    // A row's map of cell errors is a branch, not a leaf error.
    expect(getNestedError(tree, [0])).toBeUndefined();
    expect(getNestedError(tree, [1, 'title'])).toBeUndefined();
    expect(getNestedError(tree, [5, 'title'])).toBeUndefined();
    expect(getNestedError(undefined, [0, 'title'])).toBeUndefined();
    expect(getNestedError(true, [0, 'title'])).toBeUndefined();
  });

  it('resolves an empty-relative path to a flat error', () => {
    const flat = { type: 'required', message: 'This field is required' };
    expect(getNestedError(flat, [])).toBe(flat);
  });
});
