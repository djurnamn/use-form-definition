import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultValues } from "react-hook-form";
import { FormDefinition } from "../types";
import { generateDefaultValues } from "../utilities";
import { generateSchema } from "./schema-builder";

/**
 * Generate form options with automatic type inference
 *
 * This function provides better TypeScript integration by leveraging
 * Zod's type inference capabilities.
 */
export const generateOptions = <T extends FormDefinition>(definition: T) => {
  const schema = generateSchema(definition);
  type InferredType = z.infer<typeof schema>;

  const defaultValues = generateDefaultValues(definition) as
    DefaultValues<InferredType> | undefined;
  const resolver = zodResolver(schema);

  return {
    defaultValues,
    resolver,
    // Type helper for better IntelliSense
    _types: {} as InferredType,
  } as const;
};
