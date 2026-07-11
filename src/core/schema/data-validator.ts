import { FormDefinition } from "../types";
import { generateSchema } from "./schema-builder";

/**
 * Generate a FormData validator from a form definition.
 *
 * Lives in its own module (not core/schema.ts) so the `./server` entry can
 * export it without dragging in `generateOptions`' @hookform/resolvers →
 * react-hook-form chain — the server entry must stay React-free.
 */
export const generateDataValidator =
  (definition: FormDefinition) =>
    (formData: FormData) => {
      const schema = generateSchema(definition);
      const dataObject = Object.fromEntries(formData.entries());
      return schema.safeParse(dataObject);
    };
