import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createPluginRegistry } from "../../core/plugin-system";
import { generateSchemaAsync } from "../../core/schema/schema-builder";
import { createFormConfiguration } from "../../configuration/createFormConfiguration";
import { FormDefinition } from "../../core/types";

describe("A plugin registry in the form configuration", () => {
  it("is kept by createFormConfiguration", () => {
    const registry = createPluginRegistry();

    const configuration = createFormConfiguration({ pluginRegistry: registry });

    expect(configuration.pluginRegistry).toBe(registry);
  });

  it("runs its plugins when passed on to generateSchemaAsync", async () => {
    const registry = createPluginRegistry();
    registry.register(
      "no-admin",
      () => ({ schema: z.string().refine((value) => value !== "admin") }),
      { name: "no-admin", version: "1.0.0" },
      ["text"],
    );
    const definition: FormDefinition = { username: { type: "text" } };

    const configuration = createFormConfiguration({ pluginRegistry: registry });
    const schema = await generateSchemaAsync(
      definition,
      undefined,
      configuration.pluginRegistry,
    );

    expect(schema.safeParse({ username: "björn" }).success).toBe(true);
    expect(schema.safeParse({ username: "admin" }).success).toBe(false);
  });
});
