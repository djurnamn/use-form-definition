import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  registerFieldType,
  getFieldSchemaGenerator,
  createCustomFieldSchema,
} from '../../core/schema/field-generators';
import { generateSchema } from '../../core/schema/schema-builder';
import { generateDataValidator } from '../../core/schema/data-validator';
import { getDefaultValueForField, generateDefaultValues } from '../../core/utilities';
import { FormDefinition } from '../../core/types';

/**
 * `registerFieldType` lets a custom (unregistered) field kind declare its value semantics, so
 * a non-string custom kind - e.g. a `visibility` toggle whose value is a boolean - validates
 * with the right value type on both the client resolver and the server data validator, instead
 * of the `z.string()` fallback every unregistered kind gets.
 */
describe('registerFieldType', () => {
  describe('valueType: "boolean"', () => {
    // Register once at module scope, the intended usage (client + server bundles).
    registerFieldType('visibility', { valueType: 'boolean' });

    const definition: FormDefinition = { isPublic: { type: 'visibility' } };

    it('validates like a checkbox on the client schema, coercing the posted "on"', () => {
      const schema = generateSchema(definition);

      expect(schema.parse({ isPublic: true })).toEqual({ isPublic: true });
      expect(schema.parse({ isPublic: false })).toEqual({ isPublic: false });
      // An HTML checkbox posts "on" when checked - z.coerce.boolean() turns it into `true`.
      expect(schema.parse({ isPublic: 'on' })).toEqual({ isPublic: true });
    });

    it('coerces the posted checkbox value through the server data validator', () => {
      const validate = generateDataValidator(definition);

      const checked = new FormData();
      checked.set('isPublic', 'on');
      const checkedResult = validate(checked);
      expect(checkedResult.success).toBe(true);
      if (checkedResult.success) {
        expect(checkedResult.data.isPublic).toBe(true);
      }

      // An unchecked checkbox is absent from FormData; the boolean kind defaults it to `false`.
      const unchecked = new FormData();
      const uncheckedResult = validate(unchecked);
      expect(uncheckedResult.success).toBe(true);
      if (uncheckedResult.success) {
        expect(uncheckedResult.data.isPublic).toBe(false);
      }
    });

    it('seeds the react-hook-form default as `false`, not the generic ""', () => {
      expect(getDefaultValueForField({ type: 'visibility' })).toBe(false);
      expect(generateDefaultValues(definition)).toEqual({ isPublic: false });
    });

    it('still honours an explicit defaultValue on the field', () => {
      expect(getDefaultValueForField({ type: 'visibility', defaultValue: true })).toBe(true);
    });
  });

  describe('valueType: "number"', () => {
    registerFieldType('rating', { valueType: 'number' });

    it('coerces a posted numeric string to a number on the server path', () => {
      const validate = generateDataValidator({ rating: { type: 'rating' } });
      const data = new FormData();
      data.set('rating', '42');
      const result = validate(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rating).toBe(42);
      }
    });

    it('defaults to 0', () => {
      expect(getDefaultValueForField({ type: 'rating' })).toBe(0);
    });
  });

  describe('schema alias', () => {
    it('aliasing "checkbox" validates identically to valueType: "boolean"', () => {
      registerFieldType('togglePrivate', { schema: 'checkbox' });
      const schema = generateSchema({ flag: { type: 'togglePrivate' } });
      expect(schema.parse({ flag: 'on' })).toEqual({ flag: true });
      expect(getDefaultValueForField({ type: 'togglePrivate' })).toBe(false);
    });

    it('throws when aliasing an unregistered kind, naming the key the caller wrote', () => {
      expect(() => registerFieldType('bogus', { schema: 'does-not-exist' })).toThrow(
        /\{ schema: "does-not-exist" \}\): no field kind "does-not-exist" is registered/
      );
    });

    it('throws when aliasing the string fallback ("default")', () => {
      expect(() => registerFieldType('bogus', { schema: 'default' })).toThrow();
    });
  });

  describe('generator', () => {
    it('registers a fully custom Zod generator', () => {
      registerFieldType('csv', {
        generator: () => z.string().transform((v: string) => v.split(',')),
      });
      const generator = getFieldSchemaGenerator('csv');
      expect(generator).not.toBe(createCustomFieldSchema);
    });
  });

  describe('argument validation', () => {
    it('throws on an unknown valueType', () => {
      expect(() =>
        registerFieldType('weird', { valueType: 'bigint' as never })
      ).toThrow(/unknown valueType/);
    });

    it('throws when no strategy is given', () => {
      expect(() => registerFieldType('empty', {})).toThrow(
        /provide one of/
      );
    });
  });

  describe('regression: unregistered kinds still validate as strings', () => {
    it('an unregistered custom kind falls back to z.string()', () => {
      // `slug` and `markdown` are string-valued custom kinds that rely on this fallback.
      const schema = generateSchema({ slug: { type: 'slug' } });
      expect(schema.parse({ slug: 'hello-world' })).toEqual({ slug: 'hello-world' });
      expect(getDefaultValueForField({ type: 'slug' })).toBe('');
    });
  });
});
