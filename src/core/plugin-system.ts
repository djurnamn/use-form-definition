import { z } from "zod";
import { FormDefinition, FormFieldDefinition } from "./types";

/**
 * Enhanced validation context for plugins
 */
export interface ValidationContext {
  fieldKey: string;
  field: FormFieldDefinition;
  definition: FormDefinition;
  formData?: Record<string, unknown>;
  dependencies?: string[];
}

/**
 * Validation result from a plugin
 */
export interface ValidationResult {
  schema: z.ZodTypeAny;
  dependencies?: string[];
  errorMessages?: Record<string, string>;
}

/**
 * Plugin function type for custom validations
 */
export type ValidationPlugin = (
  context: ValidationContext
) => Promise<ValidationResult> | ValidationResult;

/**
 * Plugin metadata for registration
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
}

/**
 * Registered plugin with its metadata
 */
export interface RegisteredPlugin {
  plugin: ValidationPlugin;
  metadata: PluginMetadata;
}

/**
 * Plugin registry for managing validation plugins
 * SSR-safe: Can be instantiated per-request or per-form-instance
 */
export class PluginRegistry {
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private fieldTypePlugins: Map<string, string[]> = new Map();

  /**
   * Register a validation plugin
   */
  register(
    pluginName: string,
    plugin: ValidationPlugin,
    metadata: PluginMetadata,
    fieldTypes?: string[]
  ): void {
    // Validate plugin name
    if (this.plugins.has(pluginName)) {
      throw new Error(`Plugin '${pluginName}' is already registered`);
    }

    // Register the plugin
    this.plugins.set(pluginName, { plugin, metadata });

    // Associate with field types if specified
    if (fieldTypes) {
      fieldTypes.forEach(fieldType => {
        if (!this.fieldTypePlugins.has(fieldType)) {
          this.fieldTypePlugins.set(fieldType, []);
        }
        this.fieldTypePlugins.get(fieldType)!.push(pluginName);
      });
    }
  }

  /**
   * Unregister a validation plugin
   */
  unregister(pluginName: string): boolean {
    const removed = this.plugins.delete(pluginName);

    // Remove from field type associations
    for (const [fieldType, pluginNames] of this.fieldTypePlugins.entries()) {
      const index = pluginNames.indexOf(pluginName);
      if (index !== -1) {
        pluginNames.splice(index, 1);
        if (pluginNames.length === 0) {
          this.fieldTypePlugins.delete(fieldType);
        }
      }
    }

    return removed;
  }

  /**
   * Get a registered plugin
   */
  get(pluginName: string): RegisteredPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get all plugins for a specific field type
   */
  getForFieldType(fieldType: string): RegisteredPlugin[] {
    const pluginNames = this.fieldTypePlugins.get(fieldType) || [];
    return pluginNames
      .map(name => this.plugins.get(name))
      .filter(plugin => plugin !== undefined) as RegisteredPlugin[];
  }

  /**
   * Get all registered plugins
   */
  getAll(): RegisteredPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a plugin is registered
   */
  has(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.fieldTypePlugins.clear();
  }
}

/**
 * Factory function to create a new plugin registry instance
 * Use this in SSR contexts or when you need isolated plugin registries
 *
 * @example
 * ```typescript
 * // Server-side (per-request)
 * const registry = createPluginRegistry();
 * registry.register('my-plugin', myPlugin, metadata);
 *
 * // Or in createFormDefinitionHook
 * const useForm = createFormDefinitionHook({
 *   components: { ... },
 *   pluginRegistry: createPluginRegistry()
 * });
 * ```
 */
export const createPluginRegistry = (): PluginRegistry => {
  return new PluginRegistry();
};


/**
 * Apply plugins to a field schema
 *
 * @param context - Validation context for the field
 * @param baseSchema - Base Zod schema to apply plugins to
 * @param registry - Plugin registry to use (required)
 */
export const applyPlugins = async (
  context: ValidationContext,
  baseSchema: z.ZodTypeAny,
  registry?: PluginRegistry
): Promise<z.ZodTypeAny> => {
  // If no registry is provided, return the base schema unchanged
  if (!registry) {
    return baseSchema;
  }

  const plugins = registry.getForFieldType(context.field.type);

  if (plugins.length === 0) {
    return baseSchema;
  }

  let resultSchema = baseSchema;
  const allDependencies: string[] = [];
  const allErrorMessages: Record<string, string> = {};

  // Apply each plugin in sequence
  for (const { plugin } of plugins) {
    try {
      const result = await plugin(context);

      // Compose the schemas
      resultSchema = result.schema.and(resultSchema);

      // Collect dependencies and error messages
      if (result.dependencies) {
        allDependencies.push(...result.dependencies);
      }

      if (result.errorMessages) {
        Object.assign(allErrorMessages, result.errorMessages);
      }
    } catch (error) {
      console.error(`Plugin execution failed:`, error);
      // Continue with other plugins even if one fails
    }
  }

  return resultSchema;
};

/**
 * Validation rule composition utilities
 */
export class ValidationComposer {
  private rules: ValidationPlugin[] = [];

  /**
   * Add a validation rule to the composition
   */
  add(rule: ValidationPlugin): this {
    this.rules.push(rule);
    return this;
  }

  /**
   * Compose all validation rules into a single plugin
   */
  compose(): ValidationPlugin {
    return async (context: ValidationContext): Promise<ValidationResult> => {
      let composedSchema: z.ZodTypeAny = z.any();
      const allDependencies: string[] = [];
      const allErrorMessages: Record<string, string> = {};

      // Apply each rule and combine the results
      for (const rule of this.rules) {
        try {
          const result = await rule(context);
          
          // Intersect schemas for stricter validation
          composedSchema = composedSchema.and(result.schema);
          
          // Collect dependencies and error messages
          if (result.dependencies) {
            allDependencies.push(...result.dependencies);
          }
          
          if (result.errorMessages) {
            Object.assign(allErrorMessages, result.errorMessages);
          }
        } catch (error) {
          console.error(`Validation rule execution failed:`, error);
        }
      }

      return {
        schema: composedSchema,
        dependencies: [...new Set(allDependencies)], // Remove duplicates
        errorMessages: allErrorMessages,
      };
    };
  }

  /**
   * Create a new composer instance
   */
  static create(): ValidationComposer {
    return new ValidationComposer();
  }
}

/**
 * Helper function to create simple async validation rules
 */
export const createAsyncValidationRule = (
  validator: (value: unknown, context: ValidationContext) => Promise<boolean>,
  errorMessage: string
): ValidationPlugin => {
  return async (context: ValidationContext): Promise<ValidationResult> => {
    const schema = z.any().refine(
      async (value) => await validator(value, context),
      { message: errorMessage }
    );

    return {
      schema,
      errorMessages: { [context.fieldKey]: errorMessage },
    };
  };
};

/**
 * Helper function to create dependency-aware validation rules
 */
export const createDependentValidationRule = (
  dependencies: string[],
  validator: (value: unknown, dependentValues: Record<string, unknown>, context: ValidationContext) => boolean,
  errorMessage: string
): ValidationPlugin => {
  return (context: ValidationContext): ValidationResult => {
    const schema = z.any().refine(
      (value) => {
        if (!context.formData) {
          return true; // Skip validation if no form data available
        }

        const dependentValues: Record<string, unknown> = {};
        dependencies.forEach(dep => {
          dependentValues[dep] = context.formData![dep];
        });

        return validator(value, dependentValues, context);
      },
      { message: errorMessage }
    );

    return {
      schema,
      dependencies,
      errorMessages: { [context.fieldKey]: errorMessage },
    };
  };
};

/**
 * Built-in plugins for common use cases
 */
export const builtInPlugins = {
  /**
   * Email domain validation plugin
   */
  emailDomain: (allowedDomains: string[]): ValidationPlugin => {
    return (context: ValidationContext): ValidationResult => {
      if (context.field.type !== 'email') {
        return { schema: z.any() };
      }

      const schema = z.string().refine(
        (email) => {
          if (!email) return true; // Let required validation handle empty values
          const domain = email.split('@')[1];
          return allowedDomains.includes(domain);
        },
        { message: `Email must be from one of these domains: ${allowedDomains.join(', ')}` }
      );

      return { schema };
    };
  },

  /**
   * Password strength validation plugin
   */
  passwordStrength: (
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true
  ): ValidationPlugin => {
    return (context: ValidationContext): ValidationResult => {
      if (context.field.type !== 'password') {
        return { schema: z.any() };
      }

      const schema = z.string().refine(
        (password) => {
          if (!password) return true; // Let required validation handle empty values
          
          if (password.length < minLength) return false;
          if (requireUppercase && !/[A-Z]/.test(password)) return false;
          if (requireLowercase && !/[a-z]/.test(password)) return false;
          if (requireNumbers && !/\d/.test(password)) return false;
          if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
          
          return true;
        },
        {
          message: `Password must be at least ${minLength} characters and include ${[
            requireUppercase && 'uppercase letters',
            requireLowercase && 'lowercase letters',
            requireNumbers && 'numbers',
            requireSpecialChars && 'special characters'
          ].filter(Boolean).join(', ')}`
        }
      );

      return { schema };
    };
  },

  /**
   * Cross-field validation plugin
   */
  confirmField: (confirmFieldKey: string): ValidationPlugin => {
    return createDependentValidationRule(
      [confirmFieldKey],
      (value, dependentValues) => value === dependentValues[confirmFieldKey],
      `Must match ${confirmFieldKey}`
    );
  },
};

