import { z } from "zod";
import { FormDefinition } from "./types";
import { generateSchema, generateFieldSchema } from "./schema/schema-builder";
import { generateDefaultValues } from "./utilities";

/**
 * Type inference utilities for form definitions
 * 
 * This module provides utilities to automatically infer TypeScript types
 * from form definitions using Zod's z.infer capability.
 */

/**
 * Infer the TypeScript type from a form definition
 * 
 * @example
 * ```typescript
 * const userFormDefinition = {
 *   name: { type: 'text', validation: { required: true } },
 *   email: { type: 'email', validation: { required: true } },
 *   age: { type: 'number', validation: { min: 0 } }
 * } as const;
 * 
 * type UserFormData = InferFormType<typeof userFormDefinition>;
 * // UserFormData = {
 * //   name: string;
 * //   email: string;
 * //   age?: number;
 * // }
 * ```
 */
export type InferFormType<T extends FormDefinition> = z.infer<ReturnType<typeof generateSchema<T>>>;

/**
 * Generate schema and infer type from form definition
 * 
 * This function creates both the Zod schema and its inferred TypeScript type
 * for type safety throughout your application.
 */
export const generateSchemaWithTypes = <T extends FormDefinition>(definition: T) => {
  const schema = generateSchema(definition);
  
  return {
    schema,
    // Type helper for better IntelliSense
    _types: {} as z.infer<typeof schema>,
  };
};

/**
 * Create a form definition with automatic type inference
 * 
 * This helper provides automatic type inference for form definitions.
 * 
 * @example
 * ```typescript
 * const form = createFormDefinition({
 *   name: { type: 'text', validation: { required: true } },
 *   email: { type: 'email', validation: { required: true } }
 * });
 * 
 * type FormData = typeof form._types; // Automatically inferred!
 * ```
 */
export const createFormDefinition = <T extends FormDefinition>(definition: T) => {
  const { schema, _types } = generateSchemaWithTypes(definition);
  
  return {
    definition,
    schema,
    _types,
    
    // Helper to get the inferred type (for documentation purposes)
    getType: () => _types,
    
    // Validate data with full type safety
    parse: (data: unknown) => schema.parse(data) as typeof _types,
    safeParse: (data: unknown) => schema.safeParse(data),
  };
};

/**
 * Utility type to extract the data type from a form definition
 */
export type ExtractFormDataType<T> = T extends { _types: infer U } ? U : never;

/**
 * Helper to create form options for React Hook Form
 * 
 * @example
 * ```typescript
 * const { definition, schema, _types } = createFormDefinition({
 *   name: { type: 'text', validation: { required: true } }
 * });
 * 
 * const formOptions = createFormOptions(definition, schema);
 * const form = useForm<typeof _types>(formOptions);
 * ```
 */
export const createFormOptions = <T extends FormDefinition>(
  definition: T,
  schema: z.ZodSchema
) => {
  const defaultValues = generateDefaultValues(definition);

  return {
    defaultValues,
    resolver: async (values: any) => {
      const result = await schema.safeParseAsync(values);
      return {
        values: result.success ? result.data : {},
        errors: result.success ? {} : result.error.flatten().fieldErrors,
      };
    },
  };
};

/**
 * Form definition builder with method chaining
 * 
 * Provides a fluent API for building form definitions with full type safety.
 * 
 * @example
 * ```typescript
 * const form = new FormBuilder()
 *   .addField('name', { type: 'text', validation: { required: true } })
 *   .addField('email', { type: 'email', validation: { required: true } })
 *   .addRepeater('items', {
 *     name: { type: 'text', validation: { required: true } },
 *     quantity: { type: 'number', validation: { min: 1 } }
 *   })
 *   .build();
 * 
 * type FormData = typeof form._types;
 * ```
 */
export class FormBuilder<T extends Record<string, any> = {}> {
  private definition: FormDefinition = {};

  addField<K extends string, F extends FormDefinition[string]>(
    key: K,
    field: F
  ): FormBuilder<T & { [P in K]: any }> {
    this.definition[key] = field;
    return this as any;
  }

  addRepeater<K extends string, F extends FormDefinition>(
    key: K,
    fields: F
  ): FormBuilder<T & { [P in K]: Array<any> }> {
    this.definition[key] = {
      type: 'repeater',
      fields,
    };
    return this as any;
  }

  build() {
    return createFormDefinition(this.definition);
  }
}

// Note: generateFieldSchema is imported from schema-builder
// The FormBuilder class provides a fluent API for form building