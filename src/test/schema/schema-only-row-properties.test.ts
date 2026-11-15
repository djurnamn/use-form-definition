import { describe, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
import { generateDataValidator } from "../../core/schema/data-validator";
import { generateSchema } from "../../core/schema/schema-builder";
import {
  registerFieldType,
  createSchemaOnlyPropertySchema,
} from "../../core/schema/field-generators";
import { FormDefinition } from "../../core/types";

/**
 * Schema-only row properties: the part of a repeater row that `fields` does not cover.
 *
 * A row schema is a plain object over the declared cells, and a plain object strips what
 * it does not declare - so a row carrying state beyond its cells parsed *successfully*
 * while losing everything undeclared, on both rails. These declare that state without
 * rendering it.
 */

// A kind whose value is a record - the shape no built-in value type can express. Registered
// module-level, as a kind borrowed by `validatesAs` must be.
registerFieldType("selectionMap", {
  generator: () =>
    z.preprocess(
      (value) =>
        typeof value === "string" && value !== "" ? JSON.parse(value) : value,
      z
        .record(z.string(), z.union([z.string(), z.array(z.string())]))
        .optional(),
    ),
  defaultValue: {},
});

const definition: FormDefinition = {
  items: {
    type: "repeater",
    fields: {
      name: { type: "text", validation: { required: true } },
      quantity: { type: "text" },
    },
    schemaOnlyRowProperties: {
      note: { valueType: "string" },
      isArchived: { valueType: "boolean", defaultsTo: false },
      selections: { validatesAs: "selectionMap" },
    },
  },
};

const undeclaredDefinition: FormDefinition = {
  items: {
    type: "repeater",
    fields: { name: { type: "text" }, quantity: { type: "text" } },
  },
};

const fullRow = {
  name: "notebook",
  quantity: "3",
  note: "gift",
  isArchived: true,
  selections: { color: "blue" },
};

describe("schema-only row properties", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("the client resolver rail (values object)", () => {
    it("parses a full row losslessly", () => {
      const parsed = generateSchema(definition).safeParse({
        items: [fullRow],
      });

      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.items[0]).toEqual(fullRow);
    });

    it("still strips a property nothing declares", () => {
      const parsed = generateSchema(definition).safeParse({
        items: [{ ...fullRow, somethingUndeclared: "gone" }],
      });

      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.items[0]).not.toHaveProperty(
        "somethingUndeclared",
      );
    });

    it("is the behavior a repeater without the declaration still has", () => {
      const parsed = generateSchema(undeclaredDefinition).safeParse({
        items: [fullRow],
      });

      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.items[0]).toEqual({
        name: "notebook",
        quantity: "3",
      });
    });

    it("fills an omitted property from `defaultsTo`, and leaves the others absent", () => {
      const parsed = generateSchema(definition).safeParse({
        items: [{ name: "pencil", quantity: "1" }],
      });

      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.items[0]).toEqual({
        name: "pencil",
        quantity: "1",
        isArchived: false,
      });
    });

    it("fills `defaultsTo` for a borrowed kind too, without running its wire decoding", () => {
      const withDefault: FormDefinition = {
        items: {
          type: "repeater",
          fields: { name: { type: "text" } },
          schemaOnlyRowProperties: {
            selections: { validatesAs: "selectionMap", defaultsTo: {} },
          },
        },
      };

      const parsed = generateSchema(withDefault).safeParse({
        items: [{ name: "pencil" }],
      });

      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.items[0].selections).toEqual({});
    });
  });

  describe("the FormData rail (JSON wire row)", () => {
    const validate = generateDataValidator(definition);

    it("parses a full row losslessly, through the repeater JSON encoding", () => {
      const formData = new FormData();
      formData.set("items", JSON.stringify([fullRow]));

      const parsed = validate(formData);

      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.items[0]).toEqual(fullRow);
    });

    it("agrees with the resolver rail on the same row", () => {
      const formData = new FormData();
      formData.set("items", JSON.stringify([fullRow]));

      const posted = validate(formData);
      const resolved = generateSchema(definition).safeParse({
        items: [fullRow],
      });

      expect(posted.success && resolved.success).toBe(true);
      expect(posted.success && resolved.success && posted.data.items).toEqual(
        resolved.data.items,
      );
    });
  });

  describe("validation and errors", () => {
    const requiredDefinition: FormDefinition = {
      items: {
        type: "repeater",
        fields: { name: { type: "text" } },
        schemaOnlyRowProperties: {
          note: { valueType: "string", validation: { required: true } },
        },
      },
    };

    it("applies a property’s validation rules", () => {
      const parsed = generateSchema(requiredDefinition).safeParse({
        items: [{ name: "notebook" }],
      });

      expect(parsed.success).toBe(false);
    });

    it("nests a property issue under [field, rowIndex, propertyKey], as a cell issue does", () => {
      const parsed = generateSchema(requiredDefinition).safeParse({
        items: [{ name: "notebook" }, { name: "pencil", note: "gift" }],
      });

      expect(parsed.success).toBe(false);
      expect(parsed.success === false && parsed.error.issues[0].path).toEqual([
        "items",
        0,
        "note",
      ]);
    });
  });

  describe("diagnostics", () => {
    it("throws when a property declares no validation at all", () => {
      expect(() => createSchemaOnlyPropertySchema("note", {})).toThrow(
        /nothing here says how the value validates/,
      );
    });

    it("names `type` when that is what the author reached for", () => {
      expect(() =>
        createSchemaOnlyPropertySchema("isArchived", {
          type: "checkbox",
        } as never),
      ).toThrow(/`type` names a control/);
    });

    it("throws when `validatesAs` names an unregistered kind", () => {
      expect(() =>
        createSchemaOnlyPropertySchema("selections", {
          validatesAs: "nothingRegistered",
        }),
      ).toThrow(/no field kind "nothingRegistered" is registered/);
    });

    it("warns rather than silently ignoring rendering vocabulary", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      createSchemaOnlyPropertySchema("note", {
        valueType: "string",
        label: "Note",
      } as never);

      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(/`label`.*ignored/),
      );
    });

    it("points a `defaultValue` at `defaultsTo`", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      createSchemaOnlyPropertySchema("isArchived", {
        valueType: "boolean",
        defaultValue: false,
      } as never);

      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(/Use `defaultsTo`/),
      );
    });

    it("throws when a property collides with a rendered cell", () => {
      const collidingDefinition: FormDefinition = {
        items: {
          type: "repeater",
          fields: { name: { type: "text" } },
          schemaOnlyRowProperties: { name: { valueType: "string" } },
        },
      };

      expect(() => generateSchema(collidingDefinition)).toThrow(
        /"name" is already a rendered cell/,
      );
    });
  });
});

describe("registerFieldType validatesAs", () => {
  it("borrows a registered kind’s validator", () => {
    registerFieldType("agreement", { validatesAs: "checkbox" });

    const parsed = generateSchema({
      agreement: { type: "agreement", validation: { required: true } },
    }).safeParse({ agreement: false });

    expect(parsed.success).toBe(false);
  });

  it("still honors the deprecated `schema` spelling", () => {
    registerFieldType("legacyAgreement", { schema: "checkbox" });

    const parsed = generateSchema({
      legacyAgreement: { type: "legacyAgreement" },
    }).safeParse({ legacyAgreement: true });

    expect(parsed.success).toBe(true);
  });

  it("names `validatesAs` when a registration declares nothing", () => {
    expect(() => registerFieldType("undeclared", {})).toThrow(/`validatesAs`/);
  });

  it("throws when the borrowed kind is not registered", () => {
    expect(() =>
      registerFieldType("borrower", { validatesAs: "nothingRegistered" }),
    ).toThrow(/no field kind "nothingRegistered" is registered/);
  });
});
