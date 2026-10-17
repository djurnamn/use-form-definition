import { FormDefinition } from "../types";
import { generateSchema } from "./schema-builder";

/**
 * Generate a FormData validator from a form definition.
 */
export const generateDataValidator =
  (definition: FormDefinition) => (formData: FormData) => {
    const schema = generateSchema(definition);
    const dataObject = Object.fromEntries(formData.entries());
    return schema.safeParse(dataObject);
  };
