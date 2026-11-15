import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createFormDefinitionHook } from "../../hooks/createFormDefinitionHook";
import { generateDataValidator } from "../../core/schema/data-validator";
import type { FormDefinition } from "../../core/types";

/**
 * A field-level `name` override has never worked (see the `name` deprecation in the
 * CHANGELOG) and is
 * deprecated ahead of removal. The JSDoc says so; the development warning is what makes
 * the breakage visible at runtime, where it otherwise reads as a server bug.
 */

const useFormDefinition = createFormDefinitionHook({});

type HookReturn = ReturnType<typeof useFormDefinition>;

let latest: HookReturn;

function Probe({ definition }: { definition: FormDefinition }) {
  latest = useFormDefinition(definition, {});
  const { RenderedForm } = latest;
  return <RenderedForm />;
}

const nameWarnings = (warn: { mock: { calls: unknown[][] } }) =>
  warn.mock.calls.filter(([message]) =>
    String(message).includes("`name` different"),
  );

/** Renders the definition, types into its text inputs and reads every boundary. */
const fillAndRead = async (definition: FormDefinition, text = "typed") => {
  const { container } = render(<Probe definition={definition} />);
  const user = userEvent.setup();
  const inputs = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="text"]'),
  );
  for (const input of inputs) await user.type(input, text);

  const formData = new FormData(container.querySelector("form")!);
  return {
    controlNames: inputs.map((input) => input.name),
    clientValid: await latest.form.trigger(),
    model: latest.form.getValues() as Record<string, unknown>,
    posted: Object.fromEntries(formData.entries()),
    server: generateDataValidator(definition)(formData),
  };
};

describe("the deprecated field-level name override", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns in development, naming the offending field", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Probe definition={{ email: { type: "text", name: "contactEmail" } }} />,
    );

    const warnings = nameWarnings(warn);
    expect(warnings).toHaveLength(1);
    expect(String(warnings[0][0])).toContain("`email`");
  });

  it("stays quiet when name matches the key or is omitted", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Probe
        definition={{
          email: { type: "text", name: "email" },
          plain: { type: "text" },
          items: {
            type: "repeater",
            fields: { quantity: { type: "text", name: "quantity" } },
          },
        }}
      />,
    );

    expect(nameWarnings(warn)).toHaveLength(0);
  });

  it("warns for a repeater cell, naming it by its key path", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Probe
        definition={{
          items: {
            type: "repeater",
            fields: { quantity: { type: "text", name: "amount" } },
          },
        }}
      />,
    );

    const warnings = nameWarnings(warn);
    expect(warnings).toHaveLength(1);
    expect(String(warnings[0][0])).toContain("`items.quantity`");
  });

  it("says that an optional field's value is dropped", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Probe definition={{ email: { type: "text", name: "contactEmail" } }} />,
    );

    expect(String(nameWarnings(warn)[0][0])).toContain("dropped");
  });
});

/**
 * What the override does today, at every boundary. These hold the deprecation's claims
 * to the measured behavior until the option is removed, and go with it.
 */
describe("what a differing name does until it is removed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails a required field on both rails with the field filled in", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await fillAndRead({
      email: {
        type: "text",
        name: "contactEmail",
        validation: { required: true },
      },
    });

    // The control and the post speak the name; defaults and the schema speak the key.
    expect(result.controlNames).toEqual(["contactEmail"]);
    expect(result.model).toEqual({ email: "", contactEmail: "typed" });
    expect(result.posted).toEqual({ contactEmail: "typed" });

    expect(result.clientValid).toBe(false);
    expect(result.server.success).toBe(false);
    expect(result.server.error?.issues.map((issue) => issue.path)).toEqual([
      ["email"],
    ]);
  });

  it("passes an optional field on both rails and drops its value", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await fillAndRead({
      email: { type: "text", name: "contactEmail" },
    });

    expect(result.posted).toEqual({ contactEmail: "typed" });
    expect(result.clientValid).toBe(true);
    expect(result.server.success).toBe(true);
    expect(result.server.data).toEqual({});
  });

  it("posts a repeater cell under its name beside the repeater's own entry", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await fillAndRead({
      items: {
        type: "repeater",
        defaultValue: [{ quantity: "" }],
        fields: { quantity: { type: "text", name: "amount" } },
      },
    });

    // The cell's control carries the bare name, not `items[0].quantity`. The row still
    // reaches the server, since the repeater posts its rows as one JSON entry.
    expect(result.controlNames).toEqual(["amount"]);
    expect(result.posted).toEqual({
      amount: "typed",
      items: JSON.stringify([{ quantity: "typed" }]),
    });
    expect(result.clientValid).toBe(true);
    expect(result.server.data).toEqual({ items: [{ quantity: "typed" }] });
  });
});
