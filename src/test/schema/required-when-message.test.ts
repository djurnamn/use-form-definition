import { describe, it, expect } from "vitest";
import { z } from "zod";
import { generateSchema } from "../../core/schema/schema-builder";
import { registerFieldType } from "../../core/schema/field-generators";
import type { FormDefinition } from "../../core/types";

/**
 * `requiredWhen` raises a `[key, options]` message like every other rule, and judges any
 * date kind, built-in or custom, by its Date value.
 */
describe("requiredWhen", () => {
  const definition: FormDefinition = {
    method: {
      type: "select",
      options: [
        { value: "pickup", label: "Pickup" },
        { value: "delivery", label: "Delivery" },
      ],
    },
    pickupDate: {
      type: "date",
      validation: { requiredWhen: { field: "method", value: "pickup" } },
    },
  };

  it("raises the required message key like every other rule", () => {
    const result = generateSchema(definition).safeParse({
      method: "pickup",
      pickupDate: "",
    });
    expect(result.success).toBe(false);
    expect(
      result.success ? null : JSON.parse(result.error.issues[0]!.message),
    ).toEqual(["required", {}]);
  });

  it("accepts a Date from a custom date-like kind", () => {
    registerFieldType("working-date", {
      generator: () =>
        z
          .string()
          .transform((text) => (text === "" ? null : new Date(text)))
          .optional(),
    });
    const custom: FormDefinition = {
      ...definition,
      pickupDate: {
        type: "working-date",
        validation: { requiredWhen: { field: "method", value: "pickup" } },
      },
    };
    const schema = generateSchema(custom);
    expect(
      schema.safeParse({ method: "pickup", pickupDate: "2026-09-14" }).success,
    ).toBe(true);
    expect(schema.safeParse({ method: "pickup", pickupDate: "" }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ method: "delivery", pickupDate: "" }).success,
    ).toBe(true);
  });
});
