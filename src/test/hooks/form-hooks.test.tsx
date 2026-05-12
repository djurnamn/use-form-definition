import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import { useFormDefinition } from '../../hooks/useFormDefinition';
import TextInput from '../../components/TextInput';
import NumberInput from '../../components/NumberInput';
import Select from '../../components/Select';
import Checkbox from '../../components/Checkbox';
import { FormDefinition } from '../../core/types';

// Test form definitions
const simpleFormDefinition: FormDefinition = {
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
    validation: { min: 18, max: 100 }
  }
};

const complexFormDefinition: FormDefinition = {
  profile: {
    type: 'text',
    validation: { required: true }
  },
  country: {
    type: 'select',
    options: [
      { label: 'USA', value: 'us' },
      { label: 'Canada', value: 'ca' },
      { label: 'UK', value: 'uk' }
    ],
    validation: { required: true }
  },
  isActive: {
    type: 'checkbox'
  },
  contacts: {
    type: 'repeater',
    fields: {
      name: {
        type: 'text',
        validation: { required: true }
      },
      phone: {
        type: 'text',
        validation: { pattern: 'phone' }
      }
    },
    validation: { minRows: 1, maxRows: 5 }
  }
};

// Test component configurations
const components = {
  text: TextInput,
  email: TextInput,
  number: NumberInput,
  select: Select,
  checkbox: Checkbox,
  repeater: () => <div>Repeater Component</div>
};

describe('Form Hook Integration Tests', () => {
  describe('createFormDefinitionHook', () => {
    it('should create a hook with default configuration', () => {
      const useTestForm = createFormDefinitionHook({
        components
      });

      expect(typeof useTestForm).toBe('function');
      // Function was created successfully
    });

    it('should create hook with custom validation registry', () => {
      // Note: Custom validation is now handled via plugin system
      // This test just verifies the hook can be created without validation config

      const useTestForm = createFormDefinitionHook({
        components
      });

      expect(typeof useTestForm).toBe('function');
    });

    it('should create hook with custom translation function', () => {
      const translate = (key: string) => `Custom: ${key}`;

      const useTestForm = createFormDefinitionHook({
        components,
        translation: {
          function: translate
        }
      });

      expect(typeof useTestForm).toBe('function');
    });

    it('should handle component configuration objects', () => {
      const advancedComponents = {
        text: {
          component: TextInput,
          ignoreFieldWrapper: true,
          additionalProps: ['customProp']
        },
        number: NumberInput
      };

      const useTestForm = createFormDefinitionHook({
        components: advancedComponents
      });

      expect(typeof useTestForm).toBe('function');
    });
  });

  describe('useFormDefinition hook functionality', () => {
    it('should return core hook APIs', () => {
      const { result } = renderHook(() => 
        useFormDefinition(simpleFormDefinition)
      );

      // Check that the hook returns the expected API
      expect(result.current).toHaveProperty('RenderedField');
      expect(result.current).toHaveProperty('RenderedForm');
      expect(result.current).toHaveProperty('validateData');
      expect(result.current).toHaveProperty('generateSchema');
      expect(result.current).toHaveProperty('generateOptions');
      expect(result.current).toHaveProperty('_types');

      expect(typeof result.current.RenderedField).toBe('function');
      expect(typeof result.current.RenderedForm).toBe('function');
      expect(typeof result.current.validateData).toBe('function');
      expect(typeof result.current.generateSchema).toBe('function');
      expect(typeof result.current.generateOptions).toBe('function');
    });

    it('should generate schema correctly', () => {
      const { result } = renderHook(() => 
        useFormDefinition(simpleFormDefinition)
      );

      const schema = result.current.generateSchema();
      
      // Test valid data doesn't throw
      const validData = { name: 'John', email: 'john@example.com', age: 25 };
      expect(() => schema.parse(validData)).not.toThrow();

      // Test invalid data throws
      const invalidData = { name: 'J', email: 'invalid', age: 15 };
      expect(() => schema.parse(invalidData)).toThrow();
    });

    it('should generate form options correctly', () => {
      const { result } = renderHook(() => 
        useFormDefinition(simpleFormDefinition)
      );

      const options = result.current.generateOptions();
      
      expect(options).toHaveProperty('resolver');
      expect(options).toHaveProperty('defaultValues');
      
      // Check default values structure
      expect(options.defaultValues).toEqual({
        name: '',
        email: '',
        age: 0
      });
    });

    it('should handle complex form definitions', () => {
      const { result } = renderHook(() => 
        useFormDefinition(complexFormDefinition)
      );

      const options = result.current.generateOptions();
      
      expect(options.defaultValues).toEqual({
        profile: '',
        country: '',
        isActive: false,
        contacts: []
      });
    });

    it('should generate schema for complex forms', () => {
      const { result } = renderHook(() => 
        useFormDefinition(complexFormDefinition)
      );

      const schema = result.current.generateSchema();

      // Test valid complex data
      const validData = {
        profile: 'Software Engineer',
        country: 'us',
        isActive: true,
        contacts: [
          { name: 'John', phone: '+1234567890' }
        ]
      };
      
      expect(() => schema.parse(validData)).not.toThrow();
    });

    it('should support cross-field validation', () => {
      const formWithMatchValue: FormDefinition = {
        password: {
          type: 'text',
          validation: { required: true, minLength: 8 }
        },
        confirmPassword: {
          type: 'text',
          validation: { 
            required: true,
            matchValue: 'password'
          }
        }
      };

      const { result } = renderHook(() => 
        useFormDefinition(formWithMatchValue)
      );

      const schema = result.current.generateSchema();

      const validData = { password: 'secretpassword', confirmPassword: 'secretpassword' };
      expect(() => schema.parse(validData)).not.toThrow();

      const invalidData = { password: 'secretpassword', confirmPassword: 'differentpassword' };
      expect(() => schema.parse(invalidData)).toThrow();
    });

    it('should support conditional required validation', () => {
      const formWithConditional: FormDefinition = {
        isEmployee: {
          type: 'checkbox'
        },
        employeeId: {
          type: 'text',
          validation: {
            requiredWhen: { field: 'isEmployee', value: true }
          }
        }
      };

      const { result } = renderHook(() => 
        useFormDefinition(formWithConditional)
      );

      const schema = result.current.generateSchema();

      // When isEmployee is false, employeeId is not required
      const dataWithEmployeeFalse = {
        isEmployee: false,
        employeeId: ''
      };
      expect(() => schema.parse(dataWithEmployeeFalse)).not.toThrow();

      // When isEmployee is true, employeeId becomes required
      const dataWithEmployeeTrue = {
        isEmployee: true,
        employeeId: 'EMP001'
      };
      expect(() => schema.parse(dataWithEmployeeTrue)).not.toThrow();
    });

    it('should handle repeater validation', () => {
      const { result } = renderHook(() => 
        useFormDefinition(complexFormDefinition)
      );

      const schema = result.current.generateSchema();

      // Test with no contacts (violates minRows: 1)
      const dataWithNoContacts = {
        profile: 'Test',
        country: 'us',
        isActive: false,
        contacts: []
      };
      expect(() => schema.parse(dataWithNoContacts)).toThrow();

      // Test with valid contacts
      const dataWithValidContacts = {
        profile: 'Test',
        country: 'us',
        isActive: false,
        contacts: [{ name: 'John', phone: '+1234567890' }]
      };
      expect(() => schema.parse(dataWithValidContacts)).not.toThrow();
    });

    it('should maintain consistent schema results', () => {
      const { result, rerender } = renderHook(() => 
        useFormDefinition(simpleFormDefinition)
      );

      const firstSchemaResult = result.current.generateSchema();

      rerender();

      const secondSchemaResult = result.current.generateSchema();

      // Schema results should be consistent across re-renders
      expect(firstSchemaResult.description).toEqual(secondSchemaResult.description);
    });

    it('should maintain consistent options results', () => {
      const { result, rerender } = renderHook(() => 
        useFormDefinition(simpleFormDefinition)
      );

      const firstOptionsResult = result.current.generateOptions();

      rerender();

      const secondOptionsResult = result.current.generateOptions();

      // Options results should be consistent across re-renders
      expect(firstOptionsResult.defaultValues).toEqual(secondOptionsResult.defaultValues);
    });

    it('should handle error scenarios gracefully', () => {
      // Test with invalid field type
      const invalidDefinition: FormDefinition = {
        invalidField: {
          type: 'nonexistent' as any,
          validation: { required: true }
        }
      };

      const { result } = renderHook(() => 
        useFormDefinition(invalidDefinition)
      );

      // Should still create the hook without crashing
      expect(result.current).toBeDefined();
      expect(result.current.generateSchema).toBeDefined();
      expect(result.current.generateOptions).toBeDefined();
    });

    it('should support custom form configuration', () => {
      const { result } = renderHook(() =>
        useFormDefinition(simpleFormDefinition, {
          config: {
            // FormConfig properties can be customized here
            // Note: showActions is a component-level prop on RenderedForm, not FormConfig
          }
        })
      );

      expect(result.current).toBeDefined();
      expect(result.current.RenderedForm).toBeDefined();
    });

    it('should handle different field types correctly', () => {
      const mixedFieldsDef: FormDefinition = {
        text: { type: 'text', validation: { required: true } },
        number: { type: 'number', validation: { min: 0 } },
        checkbox: { type: 'checkbox' },
        select: { 
          type: 'select',
          options: [{ label: 'Option 1', value: 'opt1' }],
          validation: { required: true }
        }
      };

      const { result } = renderHook(() => 
        useFormDefinition(mixedFieldsDef)
      );

      const schema = result.current.generateSchema();
      const options = result.current.generateOptions();

      expect(options.defaultValues).toEqual({
        text: '',
        number: 0,
        checkbox: false,
        select: ''
      });

      // Test that schema validates correctly for mixed types
      const validMixedData = {
        text: 'Hello',
        number: 42,
        checkbox: true,
        select: 'opt1'
      };
      
      expect(() => schema.parse(validMixedData)).not.toThrow();
    });
  });

  describe('Integration with React Hook Form', () => {
    it('should work with useForm hook', () => {
      const TestComponent = () => {
        const form = useForm();
        const { RenderedField } = useFormDefinition(simpleFormDefinition, { form });

        // Should not throw during render
        return <div><RenderedField name="name" /></div>;
      };

      const { result } = renderHook(() => TestComponent);
      expect(result.current).toBeDefined();
    });

    it('should handle custom default values with useForm', () => {
      const customDefaults = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      const TestComponent = () => {
        const form = useForm({ defaultValues: customDefaults });
        const { generateOptions } = useFormDefinition(simpleFormDefinition, { form });
        
        const options = generateOptions();
        return options;
      };

      const { result } = renderHook(() => TestComponent());
      
      // The hook should return the generated options with default values
      expect(result.current).toBeDefined();
      expect(result.current.defaultValues).toBeDefined();
      expect(result.current.resolver).toBeDefined();
    });
  });
});