import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { generateSchema } from '../../core/schema/schema-builder';
import { registerFieldType } from '../../core/schema/field-generators';
import type { FormDefinition } from '../../core/types';

/**
 * `requiredWhen` used to raise the English default text where every other rule raises a
 * `[key, options]` message, so a translated form showed it untranslated
 * (use-form-definition-dev#8). It also judged only `type: "date"` as a Date; a custom
 * date-like kind was judged as a string and never satisfied.
 */
describe('requiredWhen', () => {
  const definition: FormDefinition = {
    method: { type: 'select', options: [{ value: 'pickup', label: 'Pickup' }, { value: 'delivery', label: 'Delivery' }] },
    pickupDate: { type: 'date', validation: { requiredWhen: { field: 'method', value: 'pickup' } } },
  };

  it('raises the required message key like every other rule', () => {
    const result = generateSchema(definition).safeParse({ method: 'pickup', pickupDate: '' });
    expect(result.success).toBe(false);
    expect(result.success ? null : JSON.parse(result.error.issues[0]!.message)).toEqual(['required', {}]);
  });

  it('accepts a Date from a custom date-like kind', () => {
    registerFieldType('working-date', {
      generator: () => z.string().transform((v) => (v === '' ? null : new Date(v))).optional(),
    });
    const custom: FormDefinition = {
      ...definition,
      pickupDate: { type: 'working-date', validation: { requiredWhen: { field: 'method', value: 'pickup' } } },
    };
    const schema = generateSchema(custom);
    expect(schema.safeParse({ method: 'pickup', pickupDate: '2026-09-14' }).success).toBe(true);
    expect(schema.safeParse({ method: 'pickup', pickupDate: '' }).success).toBe(false);
    expect(schema.safeParse({ method: 'delivery', pickupDate: '' }).success).toBe(true);
  });
});
