import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultValues } from "react-hook-form";
import { FormDefinition } from "./types";
// Import the new modular schema generation
import { generateSchema as generateSchemaModular } from "./schema/";
import { generateDefaultValues } from "./utilities";

// Generate Zod schema from form definition
// This now uses the new modular schema generation approach
export const generateSchema = generateSchemaModular;

/**
 * Generate form options with automatic type inference
 *
 * This function provides better TypeScript integration by leveraging
 * Zod's type inference capabilities.
 */
export const generateOptions = <T extends FormDefinition>(
  definition: T
) => {
  const schema = generateSchema(definition);
  type InferredType = z.infer<typeof schema>;

  const defaultValues = generateDefaultValues(definition) as DefaultValues<InferredType> | undefined;
  const resolver = zodResolver(schema);

  return {
    defaultValues,
    resolver,
    // Type helper for better IntelliSense
    _types: {} as InferredType,
  } as const;
};

// Generate data validator function - implemented in its own React-free
// module so the `./server` entry can re-export it directly.
export { generateDataValidator } from "./schema/data-validator";