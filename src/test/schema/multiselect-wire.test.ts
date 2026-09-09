import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateDataValidator } from '../../core/schema/data-validator';
import { generateSchema } from '../../core/schema/schema-builder';
import { FormDefinition } from '../../core/types';

/**
 * The multiselect wire encoding: one JSON string under the field's name, the repeater's
 * convention. `generateDataValidator` flattens posts with `Object.fromEntries` (duplicate
 * names collapse last-wins), so native multi-entry posting cannot deliver an array - a
 * multiselect control posts its selection as JSON in a single entry.
 */

const definition: FormDefinition = {
  name: { type: 'text', validation: { required: true } },
  tags: {
    type: 'multiselect',
    options: [
      { label: 'Red', value: 'red' },
      { label: 'Blue', value: 'blue' },
      { label: 'Green', value: 'green' },
    ],
  },
};

const requiredDefinition: FormDefinition = {
  tags: {
    type: 'multiselect',
    validation: { required: true },
    options: [{ label: 'Red', value: 'red' }],
  },
};

function post(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) formData.set(key, value);
  return formData;
}

describe('multiselect over raw FormData', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validate = generateDataValidator(definition);

  it('parses a JSON wire value into the array', () => {
    const result = validate(post({ name: 'Astrid', tags: '["red","blue"]' }));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.tags).toEqual(['red', 'blue']);
  });

  it('treats an empty string as an empty selection', () => {
    const result = validate(post({ name: 'Astrid', tags: '' }));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.tags).toEqual([]);
  });

  it('still validates selections against the declared options', () => {
    const result = validate(post({ name: 'Astrid', tags: '["red","mauve"]' }));

    expect(result.success).toBe(false);
  });

  it('degrades a mangled wire value to an empty selection with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // A native multi-entry post collapses to a plain string like this - the encoding
    // is JSON by decision, so this degrades legibly rather than crashing the parse.
    const result = validate(post({ name: 'Astrid', tags: 'red' }));

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tags).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('fails required on an empty selection', () => {
    const result = generateDataValidator(requiredDefinition)(post({ tags: '' }));

    expect(result.success).toBe(false);
  });

  it('passes client-side array values through untouched', () => {
    const schema = generateSchema(definition);
    const result = schema.safeParse({ name: 'Astrid', tags: ['green'] });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.tags).toEqual(['green']);
  });
});
