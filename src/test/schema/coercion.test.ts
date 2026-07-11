import { describe, it, expect } from 'vitest';
import { generateSchema } from '../../core/schema/schema-builder';
import type { FormDefinition } from '../../core/types';

// A form control the user leaves empty submits an empty string (react-hook-form keeps `""`,
// and an HTML form posts `""`), never `undefined`. For coerced field types that would turn
// `""` into a wrong concrete value - `Number("")` is `0`, `new Date("")` is Invalid - a blank
// optional field must resolve to *absent*, and a blank required field must fail the normal
// required check (not slip through as `0` / an Invalid Date).

const parse = (definition: FormDefinition, data: unknown) =>
  generateSchema(definition).safeParse(data);

const firstMessageKey = (definition: FormDefinition, data: unknown): string => {
  const result = parse(definition, data);
  if (result.success) throw new Error('expected a validation failure');
  // Library messages are createMessage-encoded JSON `["key", options]`.
  return JSON.parse(result.error.errors[0].message)[0];
};

describe('Blank-value coercion for optional/required fields', () => {
  describe('number', () => {
    const optional: FormDefinition = { n: { type: 'number' } };
    const required: FormDefinition = { n: { type: 'number', validation: { required: true } } };
    const bounded: FormDefinition = { n: { type: 'number', validation: { min: 1, max: 10 } } };

    it('resolves a blank optional number to absent/undefined (not 0)', () => {
      const result = parse(optional, { n: '' });
      expect(result.success).toBe(true);
      expect(result.success && (result.data as Record<string, unknown>).n).toBeUndefined();
    });

    it('resolves a whitespace-only optional number to absent/undefined', () => {
      const result = parse(optional, { n: '   ' });
      expect(result.success).toBe(true);
      expect(result.success && (result.data as Record<string, unknown>).n).toBeUndefined();
    });

    it('still parses a literal "0" to 0', () => {
      const result = parse(optional, { n: '0' });
      expect(result.success && result.data).toEqual({ n: 0 });
    });

    it('still parses a non-zero numeric string', () => {
      const result = parse(optional, { n: '42' });
      expect(result.success && result.data).toEqual({ n: 42 });
    });

    it('fails a blank required number with the required message (not a NaN/type error)', () => {
      expect(parse(required, { n: '' }).success).toBe(false);
      expect(firstMessageKey(required, { n: '' })).toBe('required');
    });

    it('accepts "0" for a required number (a real zero is a value)', () => {
      const result = parse(required, { n: '0' });
      expect(result.success && result.data).toEqual({ n: 0 });
    });

    it('still applies min/max after coercion, and skips them for a blank optional value', () => {
      expect(parse(bounded, { n: '0' }).success).toBe(false); // below min
      expect(parse(bounded, { n: '11' }).success).toBe(false); // above max
      expect(parse(bounded, { n: '5' }).success).toBe(true);
      expect(parse(bounded, { n: '' }).success).toBe(true); // blank optional bypasses min/max
    });
  });

  describe('date', () => {
    const optional: FormDefinition = { d: { type: 'date' } };
    const required: FormDefinition = { d: { type: 'date', validation: { required: true } } };

    it('resolves a blank optional date to absent (not an Invalid Date)', () => {
      const result = parse(optional, { d: '' });
      expect(result.success).toBe(true);
      expect(result.success && 'd' in result.data && result.data.d).toBeUndefined();
    });

    it('still transforms a valid date string to a Date', () => {
      const result = parse(optional, { d: '2024-01-01' });
      expect(result.success).toBe(true);
      const value = result.success ? (result.data as { d: Date }).d : undefined;
      expect(value).toBeInstanceOf(Date);
      expect(value && !isNaN(value.getTime())).toBe(true);
    });

    it('fails a blank required date with the required message', () => {
      expect(parse(required, { d: '' }).success).toBe(false);
      expect(firstMessageKey(required, { d: '' })).toBe('required');
    });

    it('accepts a valid required date', () => {
      const result = parse(required, { d: '2024-01-01' });
      expect(result.success).toBe(true);
    });
  });

  describe('datetime-local (shares the date generator)', () => {
    const optional: FormDefinition = { d: { type: 'datetime-local' } };

    it('resolves a blank optional datetime-local to absent', () => {
      const result = parse(optional, { d: '' });
      expect(result.success).toBe(true);
      expect(result.success && (result.data as Record<string, unknown>).d).toBeUndefined();
    });

    it('transforms a valid datetime-local value to a Date', () => {
      const result = parse(optional, { d: '2024-01-01T10:30' });
      const value = result.success ? (result.data as { d: Date }).d : undefined;
      expect(value).toBeInstanceOf(Date);
      expect(value && !isNaN(value.getTime())).toBe(true);
    });
  });

  describe('requiredWhen date', () => {
    const definition: FormDefinition = {
      hasJob: { type: 'checkbox' },
      startDate: {
        type: 'date',
        validation: { requiredWhen: { field: 'hasJob', value: true } },
      },
    };

    it('allows a blank conditional date when the condition is not met', () => {
      expect(parse(definition, { hasJob: false, startDate: '' }).success).toBe(true);
    });

    it('requires the conditional date when the condition is met', () => {
      expect(parse(definition, { hasJob: true, startDate: '' }).success).toBe(false);
      expect(parse(definition, { hasJob: true, startDate: '2024-01-01' }).success).toBe(true);
    });
  });
});
