import { describe, it, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { FormDefinition } from '../../core/types';
import { generateSchema } from '../../core/schema/schema-builder';
import { InferFormType, createFormDefinition } from '../../core/types-inference';

// Test form definitions for type inference
const simpleFormDefinition = {
  name: {
    type: 'text' as const,
    validation: { required: true, minLength: 2 }
  },
  email: {
    type: 'email' as const,
    validation: { required: true, pattern: 'email' as const }
  },
  age: {
    type: 'number' as const,
    validation: { min: 18, max: 100 }
  },
  isActive: {
    type: 'checkbox' as const
  }
} satisfies FormDefinition;

const complexFormDefinition = {
  profile: {
    type: 'text' as const,
    validation: { required: true }
  },
  country: {
    type: 'select' as const,
    options: [
      { label: 'USA', value: 'us' },
      { label: 'Canada', value: 'ca' }
    ],
    validation: { required: true }
  },
  preferences: {
    type: 'multiselect' as const,
    options: [
      { label: 'Email', value: 'email' },
      { label: 'SMS', value: 'sms' },
      { label: 'Push', value: 'push' }
    ]
  },
  contacts: {
    type: 'repeater' as const,
    fields: {
      name: {
        type: 'text' as const,
        validation: { required: true }
      },
      phone: {
        type: 'text' as const,
        validation: { pattern: 'phone' as const }
      },
      isPrimary: {
        type: 'checkbox' as const
      }
    },
    validation: { minRows: 1, maxRows: 5 }
  }
} satisfies FormDefinition;

const optionalFieldsDefinition = {
  required: {
    type: 'text' as const,
    validation: { required: true }
  },
  optional: {
    type: 'text' as const
  },
  conditionallyRequired: {
    type: 'text' as const,
    validation: {
      requiredWhen: { field: 'required', value: 'yes' }
    }
  }
} satisfies FormDefinition;

describe('Type Inference Tests', () => {
  describe('InferFormType utility', () => {
    it('should infer correct types for simple form fields', () => {
      type InferredType = InferFormType<typeof simpleFormDefinition>;
      
      // Test that the inferred type matches expected structure
      const validData: InferredType = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true
      };

      expect(validData.name).toBe('John Doe');
      expect(validData.email).toBe('john@example.com');
      expect(validData.age).toBe(30);
      expect(validData.isActive).toBe(true);

      // TypeScript compile-time type checking
      expectTypeOf<InferredType['name']>().toMatchTypeOf<string>();
      expectTypeOf<InferredType['email']>().toMatchTypeOf<string>();
      expectTypeOf<InferredType['age']>().toMatchTypeOf<number | undefined>();
      expectTypeOf<InferredType['isActive']>().toMatchTypeOf<boolean | undefined>();
    });

    it('should handle optional and required fields correctly', () => {
      type InferredType = InferFormType<typeof optionalFieldsDefinition>;

      const validData: InferredType = {
        required: 'This is required',
        optional: undefined,
        conditionallyRequired: undefined
      };

      expect(validData.required).toBe('This is required');

      // Type checking: required fields should not be undefined
      expectTypeOf<InferredType['required']>().toMatchTypeOf<string>();
      // Optional fields should allow undefined
      expectTypeOf<InferredType['optional']>().toMatchTypeOf<string | undefined>();
      expectTypeOf<InferredType['conditionallyRequired']>().toMatchTypeOf<string | undefined>();
    });

    it('should infer correct types for complex nested structures', () => {
      type InferredType = InferFormType<typeof complexFormDefinition>;

      const validData: InferredType = {
        profile: 'Software Engineer',
        country: 'us',
        preferences: ['email', 'sms'],
        contacts: [
          {
            name: 'John Smith',
            phone: '+1234567890',
            isPrimary: true
          },
          {
            name: 'Jane Doe',
            phone: '+0987654321',
            isPrimary: false
          }
        ]
      };

      expect(validData.profile).toBe('Software Engineer');
      expect(validData.contacts).toHaveLength(2);

      // Type checking for complex structures
      expectTypeOf<InferredType['profile']>().toMatchTypeOf<string>();
      expectTypeOf<InferredType['country']>().toMatchTypeOf<string>();
      expectTypeOf<InferredType['preferences']>().toMatchTypeOf<string[] | undefined>();
      expectTypeOf<InferredType['contacts']>().toMatchTypeOf<Array<{
        name: string;
        phone: string | undefined;
        isPrimary: boolean | undefined;
      }> | undefined>();
    });

    it('should work with array field types (repeaters)', () => {
      type ContactsType = InferFormType<typeof complexFormDefinition>['contacts'];
      
      const contacts: ContactsType = [
        {
          name: 'Contact 1',
          phone: '+1234567890',
          isPrimary: true
        }
      ];

      expect(contacts).toBeDefined();
      expect(contacts![0].name).toBe('Contact 1');

      // Verify array element type structure
      expectTypeOf<ContactsType>().toMatchTypeOf<Array<{
        name: string;
        phone: string | undefined;
        isPrimary: boolean | undefined;
      }> | undefined>();
    });
  });

  describe('createFormDefinition utility', () => {
    it('should create typed form definition with inference', () => {
      const typedDef = createFormDefinition(simpleFormDefinition);

      // Should preserve the original definition
      expect(typedDef.definition).toEqual(simpleFormDefinition);

      // Should have the correct inferred type
      expectTypeOf<typeof typedDef._types>().toMatchTypeOf<{
        name: string;
        email: string;
        age: number | undefined;
        isActive: boolean | undefined;
      }>();
    });

    it('should work with complex nested definitions', () => {
      const typedDef = createFormDefinition(complexFormDefinition);

      expect(typedDef.definition).toEqual(complexFormDefinition);

      // Verify complex type inference
      expectTypeOf<typeof typedDef._types>().toMatchTypeOf<{
        profile: string;
        country: string;
        preferences: string[] | undefined;
        contacts: Array<{
          name: string;
          phone: string | undefined;
          isPrimary: boolean | undefined;
        }> | undefined;
      }>();
    });

    it('should maintain type safety with satisfies constraint', () => {
      // This should compile successfully
      const validDef = createFormDefinition({
        name: {
          type: 'text' as const,
          validation: { required: true }
        }
      } satisfies FormDefinition);

      expect(validDef.definition.name.type).toBe('text');

      // Type should be inferred correctly
      expectTypeOf<typeof validDef._types>().toMatchTypeOf<{
        name: string;
      }>();
    });
  });

  describe('Schema integration with type inference', () => {
    it('should generate schema that validates inferred types', () => {
      const schema = generateSchema(simpleFormDefinition);
      type SchemaType = z.infer<typeof schema>;
      type InferredType = InferFormType<typeof simpleFormDefinition>;

      // The schema inferred type should match our custom inference
      expectTypeOf<SchemaType>().toEqualTypeOf<InferredType>();

      const validData: InferredType = {
        name: 'John',
        email: 'john@example.com',
        age: 25,
        isActive: true
      };

      // Should validate successfully
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should handle type inference for optional fields', () => {
      const schema = generateSchema(optionalFieldsDefinition);
      type SchemaType = z.infer<typeof schema>;

      const dataWithOptionals: SchemaType = {
        required: 'Required value',
        optional: 'Optional value',
        conditionallyRequired: 'Conditional value'
      };

      const dataWithoutOptionals: SchemaType = {
        required: 'Required value'
        // optional and conditionallyRequired are not required
      };

      expect(schema.safeParse(dataWithOptionals).success).toBe(true);
      expect(schema.safeParse(dataWithoutOptionals).success).toBe(true);
    });

    it('should handle complex nested type inference', () => {
      const schema = generateSchema(complexFormDefinition);
      type SchemaType = z.infer<typeof schema>;

      const complexData: SchemaType = {
        profile: 'Engineer',
        country: 'us',
        preferences: ['email'],
        contacts: [
          {
            name: 'John',
            phone: '+123',
            isPrimary: true
          }
        ]
      };

      const result = schema.safeParse(complexData);
      expect(result.success).toBe(true);
    });
  });

  describe('Type safety edge cases', () => {
    it('should handle empty form definitions', () => {
      const emptyDef = {} satisfies FormDefinition;
      const typedEmpty = createFormDefinition(emptyDef);

      expectTypeOf<typeof typedEmpty._types>().toMatchTypeOf<{}>();
    });

    it('should handle single field definitions', () => {
      const singleFieldDef = {
        onlyField: {
          type: 'text' as const,
          validation: { required: true }
        }
      } satisfies FormDefinition;

      const typed = createFormDefinition(singleFieldDef);

      expectTypeOf<typeof typed._types>().toMatchTypeOf<{
        onlyField: string;
      }>();
    });

    it('should handle mixed field types correctly', () => {
      const mixedDef = {
        text: { type: 'text' as const, validation: { required: true } },
        number: { type: 'number' as const, validation: { required: true } },
        checkbox: { type: 'checkbox' as const },
        select: { 
          type: 'select' as const,
          options: [{ label: 'A', value: 'a' }],
          validation: { required: true }
        },
        multiselect: {
          type: 'multiselect' as const,
          options: [{ label: 'A', value: 'a' }]
        }
      } satisfies FormDefinition;

      type MixedType = InferFormType<typeof mixedDef>;

      expectTypeOf<MixedType>().toMatchTypeOf<{
        text: string;
        number: number;
        checkbox: boolean | undefined;
        select: string;
        multiselect: string[] | undefined;
      }>();
    });

    it('should preserve const assertions in field types', () => {
      // This tests that the type system correctly preserves string literals
      const constDef = {
        status: {
          type: 'select' as const,
          options: [
            { label: 'Active', value: 'active' as const },
            { label: 'Inactive', value: 'inactive' as const }
          ] as const,
          validation: { required: true }
        }
      } satisfies FormDefinition;

      const typed = createFormDefinition(constDef);

      // The value should be inferred as the union of literal types
      expectTypeOf<typeof typed._types>().toMatchTypeOf<{
        status: string; // Note: Currently string, but could be 'active' | 'inactive' with enhanced inference
      }>();
    });
  });

  describe('Runtime type validation', () => {
    it('should reject invalid data at runtime', () => {
      const schema = generateSchema(simpleFormDefinition);
      
      const invalidData = {
        name: 'J', // Too short
        email: 'invalid-email', // Invalid format
        age: 15, // Below minimum
        isActive: 'not a boolean' // Wrong type
      };

      const result = schema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should accept valid data that matches inferred types', () => {
      const schema = generateSchema(complexFormDefinition);
      
      const validData = {
        profile: 'Software Engineer',
        country: 'us',
        preferences: ['email', 'sms'],
        contacts: [
          {
            name: 'John Smith',
            phone: '+1234567890',
            isPrimary: true
          }
        ]
      };

      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });
  });
});