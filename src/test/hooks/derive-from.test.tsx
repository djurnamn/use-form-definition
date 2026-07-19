import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import { registerFieldType } from '../../core/schema/field-generators';
import { registerDeriveTransform } from '../../core/derive';
import { generateSchema } from '../../core/schema/schema-builder';
import { generateDataValidator } from '../../core/schema/data-validator';
import TextInput from '../../components/TextInput';
import type { FormDefinition } from '../../core/types';

const slugify = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const useFormDefinition = createFormDefinitionHook({
  components: { slug: TextInput, shout: TextInput },
});

const input = (name: string): HTMLInputElement => {
  const element = document.querySelector(`input[name="${name}"]`);
  if (!element) throw new Error(`no input named "${name}"`);
  return element as HTMLInputElement;
};

/** Renders the full form and captures the RHF instance for state assertions. */
const renderForm = (definition: FormDefinition) => {
  let form: UseFormReturn<any> | undefined;
  const Harness = () => {
    const hook = useFormDefinition(definition);
    form = hook.form;
    return <hook.RenderedForm onSubmit={() => {}} />;
  };
  const view = render(<Harness />);
  return { view, form: () => form! };
};

describe('deriveFrom - declarative field derivation', () => {
  it('mirrors the transformed source into an empty target as the user types (create form)', async () => {
    const user = userEvent.setup();
    renderForm({
      title: { type: 'text' },
      slug: { type: 'text', deriveFrom: 'title', deriveTransform: slugify },
    });

    await user.type(input('title'), 'My Great Show');
    await waitFor(() => expect(input('slug').value).toBe('my-great-show'));
  });

  it('never overwrites a stored target value (edit form)', async () => {
    const user = userEvent.setup();
    renderForm({
      title: { type: 'text', defaultValue: 'My Great Show' },
      slug: {
        type: 'text',
        deriveFrom: 'title',
        deriveTransform: slugify,
        defaultValue: 'stored-slug',
      },
    });

    await user.type(input('title'), ' Renamed');
    expect(input('title').value).toBe('My Great Show Renamed');
    expect(input('slug').value).toBe('stored-slug');
  });

  it('stops deriving after a user edit and re-arms when the user clears the field', async () => {
    const user = userEvent.setup();
    renderForm({
      title: { type: 'text' },
      slug: { type: 'text', deriveFrom: 'title', deriveTransform: slugify },
    });

    await user.type(input('title'), 'Hello');
    await waitFor(() => expect(input('slug').value).toBe('hello'));

    // The user claims the field - derivation must stop.
    await user.clear(input('slug'));
    await user.type(input('slug'), 'custom-slug');
    await user.type(input('title'), ' World');
    expect(input('slug').value).toBe('custom-slug');

    // Clearing re-arms it - the next source change derives again, from the full source.
    await user.clear(input('slug'));
    await user.type(input('title'), '!');
    await waitFor(() => expect(input('slug').value).toBe('hello-world'));
  });

  it('does not mark the target dirty on derived writes, while user edits still do', async () => {
    const user = userEvent.setup();
    const { form } = renderForm({
      title: { type: 'text' },
      slug: { type: 'text', deriveFrom: 'title', deriveTransform: slugify },
    });

    await user.type(input('title'), 'Hello');
    await waitFor(() => expect(input('slug').value).toBe('hello'));
    expect(form().getFieldState('slug').isDirty).toBe(false);
    expect(form().getFieldState('title').isDirty).toBe(true);

    await user.type(input('slug'), '-edited');
    expect(form().getFieldState('slug').isDirty).toBe(true);
  });

  it('uses a kind-level transform registered via registerFieldType({ deriveTransform })', async () => {
    const user = userEvent.setup();
    // deriveTransform-only registration: attaches the transform without touching validation.
    registerFieldType('slug', { deriveTransform: slugify });
    renderForm({
      title: { type: 'text' },
      slug: { type: 'slug', deriveFrom: 'title' },
    });

    await user.type(input('title'), 'From The Kind');
    await waitFor(() => expect(input('slug').value).toBe('from-the-kind'));
  });

  it('lets a per-field deriveTransform override the kind-level registration', async () => {
    const user = userEvent.setup();
    registerDeriveTransform('shout', (value) => String(value ?? '').toUpperCase());
    renderForm({
      title: { type: 'text' },
      slug: {
        type: 'shout',
        deriveFrom: 'title',
        deriveTransform: slugify, // per-field wins over the kind's uppercase transform
      },
    });

    await user.type(input('title'), 'Per Field');
    await waitFor(() => expect(input('slug').value).toBe('per-field'));
  });

  it('falls back to identity when no transform is resolved', async () => {
    const user = userEvent.setup();
    renderForm({
      name: { type: 'text' },
      displayName: { type: 'text', deriveFrom: 'name' },
    });

    await user.type(input('name'), 'Verbatim Copy');
    await waitFor(() => expect(input('displayName').value).toBe('Verbatim Copy'));
  });

  it('keeps deriveFrom out of the DOM props of the rendered input', () => {
    renderForm({
      title: { type: 'text' },
      slug: { type: 'text', deriveFrom: 'title', deriveTransform: slugify },
    });

    expect(input('slug').hasAttribute('deriveFrom')).toBe(false);
    expect(input('slug').hasAttribute('derivefrom')).toBe(false);
  });

  describe('server-side inertness', () => {
    const definition: FormDefinition = {
      title: { type: 'text', validation: { required: true } },
      // No deriveTransform here - this definition shape is shareable with server code.
      slug: { type: 'text', deriveFrom: 'title', validation: { required: true } },
    };

    it('generateSchema validates a deriveFrom definition without deriving anything', () => {
      const schema = generateSchema(definition);
      const result = schema.safeParse({ title: 'My Show', slug: 'anything-at-all' });
      expect(result.success).toBe(true);

      // Derivation does not fill in a missing slug server-side - required still fails.
      const missing = schema.safeParse({ title: 'My Show', slug: '' });
      expect(missing.success).toBe(false);
    });

    it('generateDataValidator treats deriveFrom as inert', () => {
      const validator = generateDataValidator(definition);
      const formData = new FormData();
      formData.set('title', 'My Show');
      formData.set('slug', 'hand-written');
      const result = validator(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).slug).toBe('hand-written');
      }
    });
  });
});
