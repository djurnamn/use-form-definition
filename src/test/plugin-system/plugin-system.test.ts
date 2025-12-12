import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  createPluginRegistry,
  applyPlugins,
  ValidationComposer,
  createAsyncValidationRule,
  createDependentValidationRule,
  builtInPlugins,
  PluginRegistry,
  type ValidationPlugin,
  type ValidationContext
} from '../../core/plugin-system';

describe('Plugin System', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    // Create a fresh registry for each test
    registry = createPluginRegistry();
  });

  describe('Plugin Registration', () => {
    it('should register a plugin successfully', () => {
      const mockPlugin: ValidationPlugin = () => ({ schema: z.string() });
      const metadata = { name: 'test-plugin', version: '1.0.0' };

      registry.register('test-plugin', mockPlugin, metadata, ['text']);

      expect(registry.get('test-plugin')).toBeDefined();
      expect(registry.get('test-plugin')?.metadata).toEqual(metadata);
    });

    it('should throw error when registering duplicate plugin', () => {
      const mockPlugin: ValidationPlugin = () => ({ schema: z.string() });
      const metadata = { name: 'test-plugin', version: '1.0.0' };

      registry.register('test-plugin', mockPlugin, metadata);

      expect(() => {
        registry.register('test-plugin', mockPlugin, metadata);
      }).toThrow('Plugin \'test-plugin\' is already registered');
    });

    it('should associate plugin with field types', () => {
      const mockPlugin: ValidationPlugin = () => ({ schema: z.string() });
      const metadata = { name: 'test-plugin', version: '1.0.0' };

      registry.register('test-plugin', mockPlugin, metadata, ['text', 'email']);

      const textPlugins = registry.getForFieldType('text');
      const emailPlugins = registry.getForFieldType('email');

      expect(textPlugins).toHaveLength(1);
      expect(emailPlugins).toHaveLength(1);
      expect(textPlugins[0].metadata.name).toBe('test-plugin');
    });
  });

  describe('Plugin Unregistration', () => {
    it('should unregister plugin successfully', () => {
      const mockPlugin: ValidationPlugin = () => ({ schema: z.string() });
      const metadata = { name: 'test-plugin', version: '1.0.0' };

      registry.register('test-plugin', mockPlugin, metadata, ['text']);
      expect(registry.get('test-plugin')).toBeDefined();

      const result = registry.unregister('test-plugin');
      expect(result).toBe(true);
      expect(registry.get('test-plugin')).toBeUndefined();
    });

    it('should remove from field type associations', () => {
      const mockPlugin: ValidationPlugin = () => ({ schema: z.string() });
      const metadata = { name: 'test-plugin', version: '1.0.0' };

      registry.register('test-plugin', mockPlugin, metadata, ['text']);
      expect(registry.getForFieldType('text')).toHaveLength(1);

      registry.unregister('test-plugin');
      expect(registry.getForFieldType('text')).toHaveLength(0);
    });

    it('should return false when unregistering non-existent plugin', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Plugin Retrieval', () => {
    it('should get all registered plugins', () => {
      const plugin1: ValidationPlugin = () => ({ schema: z.string() });
      const plugin2: ValidationPlugin = () => ({ schema: z.number() });

      registry.register('plugin1', plugin1, { name: 'plugin1', version: '1.0.0' });
      registry.register('plugin2', plugin2, { name: 'plugin2', version: '1.0.0' });

      const allPlugins = registry.getAll();
      expect(allPlugins).toHaveLength(2);
    });

    it('should return empty array for unknown field type', () => {
      const plugins = registry.getForFieldType('unknown-type');
      expect(plugins).toHaveLength(0);
    });
  });

  describe('Plugin Application', () => {
    it('should apply plugins to field schema', async () => {
      const mockPlugin: ValidationPlugin = (context) => {
        if (context.field.type === 'text') {
          return { schema: z.string().min(5, 'Minimum 5 characters') };
        }
        return { schema: z.any() };
      };

      registry.register('min-length', mockPlugin, { name: 'min-length', version: '1.0.0' }, ['text']);

      const context: ValidationContext = {
        fieldKey: 'username',
        field: { type: 'text', label: 'Username' },
        definition: { username: { type: 'text', label: 'Username' } }
      };

      const baseSchema = z.string();
      const resultSchema = await applyPlugins(context, baseSchema, registry);

      // Should apply the plugin's validation
      expect(() => resultSchema.parse('abc')).toThrow();
      expect(() => resultSchema.parse('abcdef')).not.toThrow();
    });

    it('should handle plugins that return dependencies', async () => {
      const mockPlugin: ValidationPlugin = () => ({
        schema: z.string(),
        dependencies: ['otherField'],
        errorMessages: { username: 'Custom error' }
      });

      registry.register('dependency-plugin', mockPlugin, { name: 'dependency-plugin', version: '1.0.0' }, ['text']);

      const context: ValidationContext = {
        fieldKey: 'username',
        field: { type: 'text', label: 'Username' },
        definition: { username: { type: 'text', label: 'Username' } }
      };

      const baseSchema = z.string();
      const result = await applyPlugins(context, baseSchema, registry);
      // Dependencies and error messages are collected but not directly testable in this unit test
      // The result schema should be defined
      expect(result).toBeDefined();
    });

    it('should continue execution if a plugin fails', async () => {
      // Suppress console.error during this test to avoid stderr noise
      const originalError = console.error;
      console.error = vi.fn();

      try {
        const failingPlugin: ValidationPlugin = () => {
          throw new Error('Plugin failed');
        };

        const workingPlugin: ValidationPlugin = () => ({
          schema: z.string().min(3)
        });

        registry.register('failing', failingPlugin, { name: 'failing', version: '1.0.0' }, ['text']);
        registry.register('working', workingPlugin, { name: 'working', version: '1.0.0' }, ['text']);

        const context: ValidationContext = {
          fieldKey: 'username',
          field: { type: 'text', label: 'Username' },
          definition: { username: { type: 'text', label: 'Username' } }
        };

        const baseSchema = z.string();
        const resultSchema = await applyPlugins(context, baseSchema, registry);

        // Should still apply the working plugin
        expect(() => resultSchema.parse('ab')).toThrow();
        expect(() => resultSchema.parse('abc')).not.toThrow();
      } finally {
        // Restore console.error
        console.error = originalError;
      }
    });
  });

  describe('ValidationComposer', () => {
    it('should compose multiple validation rules', async () => {
      const rule1: ValidationPlugin = () => ({
        schema: z.string().min(3, 'Too short')
      });

      const rule2: ValidationPlugin = () => ({
        schema: z.string().max(10, 'Too long')
      });

      const composedPlugin = ValidationComposer
        .create()
        .add(rule1)
        .add(rule2)
        .compose();

      const context: ValidationContext = {
        fieldKey: 'test',
        field: { type: 'text', label: 'Test' },
        definition: { test: { type: 'text', label: 'Test' } }
      };

      const result = await composedPlugin(context);

      expect(() => result.schema.parse('ab')).toThrow(); // Too short
      expect(() => result.schema.parse('abcde')).not.toThrow(); // Valid
      expect(() => result.schema.parse('abcdefghijk')).toThrow(); // Too long
    });

    it('should collect dependencies and error messages', async () => {
      const rule1: ValidationPlugin = () => ({
        schema: z.string(),
        dependencies: ['field1'],
        errorMessages: { test: 'Error 1' }
      });

      const rule2: ValidationPlugin = () => ({
        schema: z.string(),
        dependencies: ['field2'],
        errorMessages: { test: 'Error 2' }
      });

      const composedPlugin = ValidationComposer
        .create()
        .add(rule1)
        .add(rule2)
        .compose();

      const context: ValidationContext = {
        fieldKey: 'test',
        field: { type: 'text', label: 'Test' },
        definition: { test: { type: 'text', label: 'Test' } }
      };

      const result = await composedPlugin(context);

      expect(result.dependencies).toEqual(['field1', 'field2']);
      expect(result.errorMessages).toEqual({ test: 'Error 2' }); // Later overwrites earlier
    });

    it('should handle failing rules gracefully', async () => {
      // Suppress console.error during this test to avoid stderr noise
      const originalError = console.error;
      console.error = vi.fn();

      try {
        const failingRule: ValidationPlugin = () => {
          throw new Error('Rule failed');
        };

        const workingRule: ValidationPlugin = () => ({
          schema: z.string().min(2)
        });

        const composedPlugin = ValidationComposer
          .create()
          .add(failingRule)
          .add(workingRule)
          .compose();

        const context: ValidationContext = {
          fieldKey: 'test',
          field: { type: 'text', label: 'Test' },
          definition: { test: { type: 'text', label: 'Test' } }
        };

        const result = await composedPlugin(context);

        // Should still apply the working rule despite the failing one
        expect(() => result.schema.parse('a')).toThrow(); // Too short for working rule
        expect(() => result.schema.parse('ab')).not.toThrow(); // Valid for working rule
      } finally {
        // Restore console.error
        console.error = originalError;
      }
    });
  });

  describe('Helper Functions', () => {
    describe('createAsyncValidationRule', () => {
      it('should create async validation rule', async () => {
        const asyncValidator = vi.fn().mockResolvedValue(true);
        const plugin = createAsyncValidationRule(asyncValidator, 'Async validation failed');

        const context: ValidationContext = {
          fieldKey: 'test',
          field: { type: 'text', label: 'Test' },
          definition: { test: { type: 'text', label: 'Test' } }
        };

        const result = await plugin(context);
        
        // The schema should be set up for async validation
        expect(result.schema).toBeDefined();
        expect(result.errorMessages?.test).toBe('Async validation failed');
      });
    });

    describe('createDependentValidationRule', () => {
      it('should create dependent validation rule', async () => {
        const validator = vi.fn().mockReturnValue(true);
        const plugin = createDependentValidationRule(
          ['dependency1', 'dependency2'],
          validator,
          'Dependent validation failed'
        );

        const context: ValidationContext = {
          fieldKey: 'test',
          field: { type: 'text', label: 'Test' },
          definition: { test: { type: 'text', label: 'Test' } },
          formData: { dependency1: 'value1', dependency2: 'value2' }
        };

        const result = await plugin(context);

        expect(result.dependencies).toEqual(['dependency1', 'dependency2']);
        expect(result.errorMessages?.test).toBe('Dependent validation failed');
      });

      it('should skip validation when no form data available', async () => {
        const validator = vi.fn().mockReturnValue(false);
        const plugin = createDependentValidationRule(['dependency'], validator, 'Error');

        const context: ValidationContext = {
          fieldKey: 'test',
          field: { type: 'text', label: 'Test' },
          definition: { test: { type: 'text', label: 'Test' } }
          // No formData
        };

        const result = await plugin(context);

        // Should create a schema that passes validation when no form data
        expect(() => result.schema.parse('any value')).not.toThrow();
      });
    });
  });

  describe('Built-in Plugins', () => {
    describe('emailDomain plugin', () => {
      it('should validate email domains', async () => {
        const plugin = builtInPlugins.emailDomain(['company.com', 'partner.org']);

        const context: ValidationContext = {
          fieldKey: 'email',
          field: { type: 'email', label: 'Email' },
          definition: { email: { type: 'email', label: 'Email' } }
        };

        const result = await plugin(context);

        expect(() => result.schema.parse('user@company.com')).not.toThrow();
        expect(() => result.schema.parse('user@partner.org')).not.toThrow();
        expect(() => result.schema.parse('user@other.com')).toThrow();
      });

      it('should not apply to non-email fields', async () => {
        const plugin = builtInPlugins.emailDomain(['company.com']);

        const context: ValidationContext = {
          fieldKey: 'username',
          field: { type: 'text', label: 'Username' },
          definition: { username: { type: 'text', label: 'Username' } }
        };

        const result = await plugin(context);

        // Should return any schema for non-email fields
        expect(result.schema._def.typeName).toBe('ZodAny');
      });
    });

    describe('passwordStrength plugin', () => {
      it('should validate password strength requirements', async () => {
        const plugin = builtInPlugins.passwordStrength(8, true, true, true, true);

        const context: ValidationContext = {
          fieldKey: 'password',
          field: { type: 'password', label: 'Password' },
          definition: { password: { type: 'password', label: 'Password' } }
        };

        const result = await plugin(context);

        expect(() => result.schema.parse('weak')).toThrow();
        expect(() => result.schema.parse('StrongPass123!')).not.toThrow();
      });
    });

    describe('confirmField plugin', () => {
      it('should create dependent validation for field confirmation', async () => {
        const plugin = builtInPlugins.confirmField('password');

        const result = await plugin({
          fieldKey: 'confirmPassword',
          field: { type: 'password', label: 'Confirm Password' },
          definition: {
            password: { type: 'password', label: 'Password' },
            confirmPassword: { type: 'password', label: 'Confirm Password' }
          }
        });

        expect(result.dependencies).toEqual(['password']);
      });
    });
  });
});