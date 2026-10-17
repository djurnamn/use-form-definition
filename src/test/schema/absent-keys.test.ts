import { describe, it, expect } from "vitest";
import { generateDataValidator } from "../../core/schema/data-validator";
import { generateSchema } from "../../core/schema/schema-builder";
import { FormFieldDefinition } from "../../core/types";

// A key can be missing from what is validated: an unchecked checkbox is absent from a
// post, and a control that never rendered posts nothing. Zod 3 and Zod 4 treat a missing
// key differently, so every kind is checked on both rails with its key absent. The suite
// runs once per Zod version (`pnpm test`).
const kinds: Record<string, FormFieldDefinition> = {
  text: { type: "text" },
  email: { type: "email" },
  number: { type: "number" },
  date: { type: "date" },
  select: { type: "select", options: [{ value: "a", label: "A" }] },
  multiselect: { type: "multiselect", options: [{ value: "a", label: "A" }] },
  checkbox: { type: "checkbox" },
  repeater: { type: "repeater", fields: { name: { type: "text" } } },
  custom: { type: "unregistered-kind" },
};

const rails = {
  server: (field: FormFieldDefinition) =>
    generateDataValidator({ field })(new FormData()),
  client: (field: FormFieldDefinition) =>
    generateSchema({ field }).safeParse({}),
};

const firstMessageKey = (result: ReturnType<typeof rails.client>) =>
  result.success ? undefined : JSON.parse(result.error.issues[0].message)[0];

describe.each(Object.entries(rails))(
  "an absent key on the %s rail",
  (_, parse) => {
    it.each(Object.entries(kinds))("passes an optional %s", (kind, field) => {
      const result = parse(field);

      expect(result.success).toBe(true);
      expect(result.success && result.data.field).toBe(
        kind === "checkbox" ? false : undefined,
      );
    });

    it.each(Object.entries(kinds))(
      "fails a required %s with the library's message key",
      (kind, field) => {
        const result = parse({ ...field, validation: { required: true } });

        expect(result.success).toBe(false);
        expect(firstMessageKey(result)).toBe(
          kind === "select" ? "invalidSelection" : "required",
        );
      },
    );
  },
);
