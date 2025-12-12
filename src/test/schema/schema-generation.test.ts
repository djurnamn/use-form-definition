import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  generateSchema,
  generateSchemaAsync,
  generateFieldSchema,
  generateFieldSchemaSync,
  applyCrossFieldValidation,
} from '../../core/schema/schema-builder';
import { FormDefinition } from '../../core/types';

describe('Schema Generation', () => {
  describe('generateSchema (synchronous)', () => {
    it('should generate schema for simple form definition', () => {
      const definition: FormDefinition = {
        name: {
          type: 'text',
          validation: { required: true, minLength: 2 }
        },
        email: {
          type: 'email',
          validation: { required: true, pattern: 'email' }
        },
        age: {
          type: 'number',
          validation: { min: 18 }
        }
      };

      const schema = generateSchema(definition);
      
      // Test valid data
      const validData = { name: 'John', email: 'john@example.com', age: 25 };
      expect(() => schema.parse(validData)).not.toThrow();

      // Test invalid data
      expect(() => schema.parse({ name: 'J', email: 'john@example.com', age: 25 })).toThrow(); // name too short
      expect(() => schema.parse({ name: 'John', email: 'not-an-email', age: 25 })).toThrow(); // invalid email
      expect(() => schema.parse({ name: 'John', email: 'john@example.com', age: 17 })).toThrow(); // age too low
    });

    it('should handle optional fields', () => {
      const definition: FormDefinition = {
        required: {
          type: 'text',
          validation: { required: true }
        },
        optional: {
          type: 'text'
          // No required validation
        }
      };

      const schema = generateSchema(definition);
      
      expect(() => schema.parse({ required: 'value' })).not.toThrow();
      expect(() => schema.parse({ required: 'value', optional: 'value' })).not.toThrow();
      expect(() => schema.parse({ optional: 'value' })).toThrow(); // missing required
    });

    it('should handle select fields with options', () => {
      const definition: FormDefinition = {
        role: {
          type: 'select',
          options: [
            { value: 'admin', label: 'Administrator' },
            { value: 'user', label: 'User' }
          ],
          validation: { required: true }
        }
      };

      const schema = generateSchema(definition);
      
      expect(() => schema.parse({ role: 'admin' })).not.toThrow();
      expect(() => schema.parse({ role: 'user' })).not.toThrow();
      expect(() => schema.parse({ role: 'invalid' })).toThrow();
    });

    it('should handle repeater fields', () => {
      const definition: FormDefinition = {
        items: {
          type: 'repeater',
          fields: {
            name: { type: 'text', validation: { required: true } },
            quantity: { type: 'number', validation: { required: true, min: 1 } }
          },
          validation: { minRows: 1, maxRows: 5 }
        }
      };

      const schema = generateSchema(definition);
      
      const validData = {
        items: [
          { name: 'Item 1', quantity: 2 },
          { name: 'Item 2', quantity: 1 }
        ]
      };
      
      expect(() => schema.parse(validData)).not.toThrow();
      expect(() => schema.parse({ items: [] })).toThrow(); // violates minRows
      expect(() => schema.parse({ items: Array(6).fill({ name: 'Item', quantity: 1 }) })).toThrow(); // violates maxRows
    });
  });

  describe('generateSchemaAsync (with plugins)', () => {
    it('should generate schema with plugin support', async () => {
      const definition: FormDefinition = {
        username: {
          type: 'text',
          validation: { required: true, minLength: 3 }
        }
      };

      const schema = await generateSchemaAsync(definition);
      
      expect(() => schema.parse({ username: 'valid' })).not.toThrow();
      expect(() => schema.parse({ username: 'ab' })).toThrow();
    });

    it('should handle form data context', async () => {
      const definition: FormDefinition = {
        field1: { type: 'text', validation: { required: true } },
        field2: { type: 'text', validation: { required: true } }
      };

      const formData = { field1: 'value1', field2: 'value2' };
      const schema = await generateSchemaAsync(definition, formData);
      
      expect(() => schema.parse(formData)).not.toThrow();
    });
  });

  describe('Cross-field validation', () => {
    it('should handle matchValue validation', () => {
      const definition: FormDefinition = {
        password: {
          type: 'password',
          validation: { required: true, minLength: 8 }
        },
        confirmPassword: {
          type: 'password',
          validation: { 
            required: true,
            matchValue: 'password'
          }
        }
      };

      const schema = generateSchema(definition);
      
      // Matching passwords should pass
      const validData = { password: 'password123', confirmPassword: 'password123' };
      expect(() => schema.parse(validData)).not.toThrow();

      // Non-matching passwords should fail
      const invalidData = { password: 'password123', confirmPassword: 'different' };
      expect(() => schema.parse(invalidData)).toThrow();
    });

    it('should handle requiredWhen validation', () => {
      const definition: FormDefinition = {
        hasJob: {
          type: 'checkbox',
          validation: { required: false }
        },
        employer: {
          type: 'text',
          validation: {
            requiredWhen: { field: 'hasJob', value: true }
          }
        }
      };

      const schema = generateSchema(definition);
      
      // When hasJob is false, employer is not required
      expect(() => schema.parse({ hasJob: false })).not.toThrow();
      
      // When hasJob is true, employer is required
      expect(() => schema.parse({ hasJob: true })).toThrow();
      expect(() => schema.parse({ hasJob: true, employer: 'Company Inc.' })).not.toThrow();
    });
  });

  describe('Field schema generation', () => {
    it('should generate different schemas for different field types', () => {
      const textField = { type: 'text', validation: { required: true } };
      const numberField = { type: 'number', validation: { required: true, min: 0 } };
      const dateField = { type: 'date', validation: { required: true } };

      const crossFieldValidation = { matchValue: [], requiredWhen: [] };

      const textSchema = generateFieldSchemaSync('text', textField, crossFieldValidation);
      const numberSchema = generateFieldSchemaSync('number', numberField, crossFieldValidation);
      const dateSchema = generateFieldSchemaSync('date', dateField, crossFieldValidation);

      expect(() => textSchema.parse('valid text')).not.toThrow();
      expect(() => textSchema.parse('')).toThrow();

      expect(() => numberSchema.parse(5)).not.toThrow();
      expect(() => numberSchema.parse(-1)).toThrow();

      expect(() => dateSchema.parse(new Date())).not.toThrow();
      expect(() => dateSchema.parse('2024-01-01')).not.toThrow(); // Should transform
    });
  });

  describe('Validation rule application', () => {
    it('should apply multiple validation rules correctly', () => {
      const definition: FormDefinition = {
        username: {
          type: 'text',
          validation: {
            required: true,
            minLength: 3,
            maxLength: 20,
            pattern: /^[a-zA-Z0-9_]+$/
          }
        }
      };

      const schema = generateSchema(definition);
      
      expect(() => schema.parse({ username: 'valid_user123' })).not.toThrow();
      expect(() => schema.parse({ username: 'ab' })).toThrow(); // too short
      expect(() => schema.parse({ username: 'a'.repeat(21) })).toThrow(); // too long
      expect(() => schema.parse({ username: 'invalid-user!' })).toThrow(); // invalid pattern
    });

    it('should handle pattern validation with named patterns', () => {
      const definition: FormDefinition = {
        email: {
          type: 'text',
          validation: {
            required: true,
            pattern: 'email' // Named pattern
          }
        }
      };

      const schema = generateSchema(definition);
      
      expect(() => schema.parse({ email: 'user@example.com' })).not.toThrow();
      expect(() => schema.parse({ email: 'invalid-email' })).toThrow();
    });
  });

  describe('Error handling', () => {
    it('should provide meaningful error messages', () => {
      const definition: FormDefinition = {
        name: {
          type: 'text',
          validation: { 
            required: true,
            minLength: { value: 2, message: 'Name must be at least 2 characters' }
          }
        }
      };

      const schema = generateSchema(definition);
      
      try {
        schema.parse({ name: 'a' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        const zodError = error as z.ZodError;
        // The error message might be in the first error or nested
        const errorMessage = zodError.errors[0].message;
        expect(errorMessage).toContain('2 characters');
      }
    });
  });

  describe('Complex form scenarios', () => {
    it('should handle nested repeater fields', () => {
      const definition: FormDefinition = {
        sections: {
          type: 'repeater',
          fields: {
            title: { type: 'text', validation: { required: true } },
            items: {
              type: 'repeater',
              fields: {
                name: { type: 'text', validation: { required: true } },
                value: { type: 'number', validation: { required: true } }
              }
            }
          }
        }
      };

      const schema = generateSchema(definition);
      
      const validData = {
        sections: [
          {
            title: 'Section 1',
            items: [
              { name: 'Item 1', value: 10 },
              { name: 'Item 2', value: 20 }
            ]
          }
        ]
      };
      
      expect(() => schema.parse(validData)).not.toThrow();
    });

    it('should handle multiselect fields', () => {
      const definition: FormDefinition = {
        tags: {
          type: 'multiselect',
          options: [
            { value: 'tag1', label: 'Tag 1' },
            { value: 'tag2', label: 'Tag 2' },
            { value: 'tag3', label: 'Tag 3' }
          ],
          validation: { required: true }
        }
      };

      const schema = generateSchema(definition);
      
      expect(() => schema.parse({ tags: ['tag1', 'tag2'] })).not.toThrow();
      expect(() => schema.parse({ tags: [] })).toThrow(); // required but empty
      expect(() => schema.parse({ tags: ['invalid'] })).toThrow(); // invalid option
    });
  });
});