import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import { parseValidationErrors } from '../../server';
import { generateSchema } from '../../core/schema/schema-builder';
import type { FormDefinition } from '../../core/types';

/**
 * A validation message can name its field: every translation receives `field` (the
 * resolved label, or the key) and `fieldKey` alongside the message's own options, on
 * the client and through `parseValidationErrors` (use-form-definition-dev#10).
 */
const definition: FormDefinition = {
  name: { type: 'text', label: 'Your name', validation: { required: true } },
  nickname: { type: 'text', label: 'nickname', validation: { minLength: 2 } },
};

const nested: FormDefinition = {
  classes: {
    type: 'repeater',
    label: 'Classes',
    fields: { level: { type: 'text', label: 'Level', validation: { required: true } } },
    defaultValue: [{ level: '' }],
  } as FormDefinition[string],
};

describe('the field in a validation message', () => {
  it('names the item field for an error inside a repeater, by label and key path', async () => {
    const translate = vi.fn((key: string, options?: Record<string, unknown>) =>
      key === 'required' ? `${options?.field} is required` : key
    );
    const useFormDefinition = createFormDefinitionHook({
      translation: { function: translate, validation: { enabled: true, localePath: (k) => k } },
    });
    function Form() {
      const { RenderedForm } = useFormDefinition(nested, {});
      return <RenderedForm onSubmit={() => {}} />;
    }
    render(<Form />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Level is required')).toBeTruthy();
    expect(screen.queryByText('Classes is required')).toBeNull();
    expect(translate).toHaveBeenCalledWith('required', expect.objectContaining({ field: 'Level', fieldKey: 'classes.level' }));
  }, 15000);

  it('is passed by parseValidationErrors for an item issue under its key path', () => {
    const result = generateSchema(nested).safeParse({ classes: [{ level: '' }] });
    expect(result.success).toBe(false);
    const translate = (key: string, options?: Record<string, unknown>) => `${key}:${options?.field}:${options?.fieldKey}`;
    const errors = parseValidationErrors(result.success ? [] : result.error.issues, translate, { 'classes.level': 'Level' });
    expect(errors.classes?.[0]).toBe('required:Level:classes.level');
  });

  it('reaches the client translation function with the label and the key', async () => {
    const translate = vi.fn((key: string, options?: Record<string, unknown>) => {
      if (key === 'required') return `${options?.field} is required`;
      if (key === 'minLength') return `${options?.field} needs ${options?.count} characters`;
      return key;
    });
    const useFormDefinition = createFormDefinitionHook({
      translation: { function: translate, validation: { enabled: true, localePath: (k) => k } },
    });
    function Form() {
      const { RenderedForm } = useFormDefinition(definition, {});
      return <RenderedForm onSubmit={() => {}} />;
    }
    render(<Form />);
    await userEvent.type(screen.getByLabelText('nickname'), 'b');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Your name is required')).toBeTruthy();
    expect(await screen.findByText('nickname needs 2 characters')).toBeTruthy();
    expect(translate).toHaveBeenCalledWith('required', expect.objectContaining({ field: 'Your name', fieldKey: 'name' }));
    expect(translate).toHaveBeenCalledWith('minLength', expect.objectContaining({ field: 'nickname', fieldKey: 'nickname', count: 2 }));
  }, 15000);

  it('is passed by parseValidationErrors from the labels it is given', () => {
    const result = generateSchema(definition).safeParse({ name: '', nickname: 'x' });
    expect(result.success).toBe(false);
    const translate = (key: string, options?: Record<string, unknown>) => `${key}:${options?.field}:${options?.fieldKey}`;
    const errors = parseValidationErrors(result.success ? [] : result.error.issues, translate, { name: 'Your name' });
    expect(errors.name?.[0]).toBe('required:Your name:name');
    expect(errors.nickname?.[0]).toBe('minLength:nickname:nickname');
  });

  it('leaves the built-in English messages unchanged', () => {
    const result = generateSchema(definition).safeParse({ name: '' });
    const errors = parseValidationErrors(result.success ? [] : result.error.issues);
    expect(errors.name?.[0]).toBe('This field is required');
  });
});
