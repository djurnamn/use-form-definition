import { describe, it, expect } from "vitest";
import { generateDataValidator } from "../../core/schema/data-validator";
import { generateSchema } from "../../core/schema/schema-builder";
import { FormFieldDefinition } from "../../core/types";

// A string rule that refines the schema combines with `required: true` on both Zod
// versions. On Zod 3 a refined schema has no `.min`, and the required rule used to call
// it, so building the schema threw. The suite runs once per Zod version (`pnpm test`).
const rails = {
  server: (field: FormFieldDefinition, value?: string) => {
    const formData = new FormData();
    if (value !== undefined) formData.set("field", value);
    return generateDataValidator({ field })(formData);
  },
  client: (field: FormFieldDefinition, value?: string) =>
    generateSchema({ field }).safeParse(
      value === undefined ? {} : { field: value },
    ),
};

const messageKeys = (result: ReturnType<typeof rails.client>) =>
  result.success
    ? []
    : result.error.issues.map((issue) => JSON.parse(issue.message)[0]);

const rules: Array<[string, Record<string, unknown>, string, string]> = [
  ["contains", { contains: "a" }, "cat", "dog"],
  ["startsWith", { startsWith: "a" }, "ant", "bat"],
  ["endsWith", { endsWith: "t" }, "ant", "bee"],
  ["noWhitespace", { noWhitespace: true }, "ant", "an ant"],
  ["uppercase", { uppercase: true }, "ANT", "ant"],
  ["lowercase", { lowercase: true }, "ant", "ANT"],
];

describe.each(Object.entries(rails))(
  "a refining string rule with required on the %s rail",
  (_, parse) => {
    describe.each(rules)("%s", (_rule, validation, passing, failing) => {
      const field: FormFieldDefinition = {
        type: "text",
        validation: { ...validation, required: true },
      };

      it("accepts a value the rule accepts", () => {
        expect(parse(field, passing).success).toBe(true);
      });

      it("rejects a value the rule rejects, without raising required", () => {
        const result = parse(field, failing);

        expect(result.success).toBe(false);
        expect(messageKeys(result)).not.toContain("required");
      });

      it("raises required for a blank value", () => {
        expect(messageKeys(parse(field, ""))).toContain("required");
      });

      it("raises required for a missing key", () => {
        expect(messageKeys(parse(field))).toContain("required");
      });
    });

    it("combines a pattern with required on a field that also has requiredWhen", () => {
      const field: FormFieldDefinition = {
        type: "text",
        validation: {
          pattern: "slug",
          required: true,
          requiredWhen: { field: "other", value: "yes" },
        },
      };

      expect(parse(field, "a-slug").success).toBe(true);
      expect(messageKeys(parse(field, ""))).toContain("required");
    });
  },
);
