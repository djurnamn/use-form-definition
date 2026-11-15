import { describe, it, expect } from "vitest";
import { generateDataValidator } from "../../core/schema/data-validator";
import { generateSchema } from "../../core/schema/schema-builder";
import { FormFieldDefinition } from "../../core/types";

// A field of type "email" checks the email format without a pattern rule, on the server
// rail as well as the client one: in the browser the native input type=email had hidden
// that the schema accepted any string. The suite runs once per Zod version (`pnpm test`).
const rails = {
  server: (field: FormFieldDefinition, value: string) => {
    const formData = new FormData();
    formData.set("field", value);
    return generateDataValidator({ field })(formData);
  },
  client: (field: FormFieldDefinition, value: string) =>
    generateSchema({ field }).safeParse({ field: value }),
};

const firstMessageKey = (result: ReturnType<typeof rails.client>) =>
  result.success ? undefined : JSON.parse(result.error.issues[0].message)[0];

describe.each(Object.entries(rails))(
  "an email field on the %s rail",
  (_, parse) => {
    it("rejects a value that is not an email address with invalidFormat", () => {
      const result = parse(
        { type: "email", validation: { required: true } },
        "not an email",
      );

      expect(result.success).toBe(false);
      expect(firstMessageKey(result)).toBe("invalidFormat");
    });

    it("rejects a malformed value on an optional field", () => {
      expect(parse({ type: "email" }, "user@").success).toBe(false);
    });

    it("accepts an email address", () => {
      const result = parse(
        { type: "email", validation: { required: true } },
        "user@example.com",
      );

      expect(result.success).toBe(true);
    });

    it("passes a blank optional field", () => {
      expect(parse({ type: "email" }, "").success).toBe(true);
    });

    it("fails a blank required field with required, not invalidFormat", () => {
      const result = parse(
        { type: "email", validation: { required: true } },
        "",
      );

      expect(firstMessageKey(result)).toBe("required");
    });

    it("lets a pattern rule decide the format instead", () => {
      const field: FormFieldDefinition = {
        type: "email",
        validation: { pattern: /^[a-z]+$/ },
      };

      expect(parse(field, "local").success).toBe(true);
      expect(parse(field, "user@example.com").success).toBe(false);
    });

    it("leaves a text field's format alone", () => {
      expect(parse({ type: "text" }, "not an email").success).toBe(true);
    });
  },
);
