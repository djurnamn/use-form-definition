import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  createFormConfig,
  createFormConfiguration,
  defaultFormConfig,
  defaultFormConfiguration,
  normalizeTranslationConfig,
  normalizeTranslationConfiguration,
  Repeater,
} from "../../index";
import type {
  FormConfig,
  FormConfiguration,
  TranslationConfig,
  TranslationConfiguration,
  ProcessedComponentConfig,
  ComponentConfig,
  AdvancedComponentConfig,
  FormDefinitionHookConfig,
} from "../../index";
import { createFormDefinitionHook } from "../../hooks/createFormDefinitionHook";
import { generateSchema } from "../../core/schema/schema-builder";
import type { FormDefinition } from "../../core/types";

/**
 * The names spelled out in 2.10 keep their old spellings as deprecated aliases until the
 * next major. These tests hold the old spellings working.
 */

const useFormDefinition = createFormDefinitionHook({});

describe("deprecated value aliases", () => {
  it("point at the renamed values", () => {
    expect(createFormConfig).toBe(createFormConfiguration);
    expect(defaultFormConfig).toBe(defaultFormConfiguration);
    expect(normalizeTranslationConfig).toBe(normalizeTranslationConfiguration);
  });

  it("keep the old type names assignable both ways", () => {
    const configuration: FormConfiguration = createFormConfiguration();
    const old: FormConfig = configuration;
    const translation: TranslationConfig = true;
    const renamedTranslation: TranslationConfiguration = translation;
    const processed: ProcessedComponentConfig = {
      component: () => null,
      ignoreFieldWrapper: false,
      additionalProps: [],
    };
    const component: ComponentConfig = processed.component;
    const advanced: AdvancedComponentConfig<{ name: string }> = {
      component: () => null,
    };
    const hookConfiguration: FormDefinitionHookConfig = {
      components: { text: component },
    };
    expect([old, renamedTranslation, advanced, hookConfiguration]).toHaveLength(
      4,
    );
  });
});

describe("the deprecated `config` option", () => {
  const definition: FormDefinition = { name: { type: "text" } };

  function OldSpellingForm() {
    const { RenderedForm } = useFormDefinition(definition, {
      config: { components: { Actions: false } },
    });
    return <RenderedForm />;
  }

  function BothSpellingsForm() {
    const { RenderedForm } = useFormDefinition(definition, {
      config: { components: { Actions: false } },
      configuration: { components: {} },
    });
    return <RenderedForm />;
  }

  it("still configures the form", () => {
    render(<OldSpellingForm />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("yields to `configuration` when both are given", () => {
    render(<BothSpellingsForm />);
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy();
  });
});

describe("the deprecated `minRows` and `maxRows` rules", () => {
  it("still bound a repeater, with their own message keys", () => {
    const schema = generateSchema({
      items: {
        type: "repeater",
        fields: { name: { type: "text" } },
        validation: { minRows: 1, maxRows: 2 },
      },
    });
    const tooFew = schema.safeParse({ items: [] });
    const tooMany = schema.safeParse({
      items: [{ name: "a" }, { name: "b" }, { name: "c" }],
    });
    expect(tooFew.success).toBe(false);
    expect(tooMany.success).toBe(false);
    expect(
      !tooFew.success && JSON.parse(tooFew.error.issues[0].message)[0],
    ).toBe("minRows");
    expect(
      !tooMany.success && JSON.parse(tooMany.error.issues[0].message)[0],
    ).toBe("maxRows");
  });

  it("emit the new message keys under the new names", () => {
    const schema = generateSchema({
      items: {
        type: "repeater",
        fields: { name: { type: "text" } },
        validation: { minimumRows: 1 },
      },
    });
    const tooFew = schema.safeParse({ items: [] });
    expect(
      !tooFew.success && JSON.parse(tooFew.error.issues[0].message)[0],
    ).toBe("minimumRows");
  });
});

describe("the deprecated `injectFormConfig` flag", () => {
  function Probe(props: Record<string, unknown>) {
    return (
      <span data-testid="probe">
        {[
          props.__formConfiguration ? "configuration" : "",
          props.__formConfig === props.__formConfiguration ? "same" : "",
        ].join(" ")}
      </span>
    );
  }

  function ProbeForm() {
    const { RenderedForm } = useFormDefinition(
      { probe: { type: "probe" } },
      {
        config: {
          fieldTypes: {
            probe: {
              component: Probe,
              ignoreFieldWrapper: true,
              additionalProps: [],
              injectFormConfig: true,
            },
          },
        },
      },
    );
    return <RenderedForm />;
  }

  it("still injects the form configuration, under both prop names", () => {
    render(<ProbeForm />);
    expect(screen.getByTestId("probe").textContent).toBe("configuration same");
  });
});

describe("the Repeater's deprecated `maxRows` prop", () => {
  it("still caps the rows", () => {
    render(
      <Repeater
        name="items"
        fields={{ name: { type: "text" } }}
        value={[{ name: "a" }]}
        onChange={() => {}}
        maxRows={1}
      />,
    );
    expect(screen.queryByText("+")).toBeNull();
    // The new name caps the same way.
    render(
      <Repeater
        name="others"
        fields={{ name: { type: "text" } }}
        value={[{ name: "a" }]}
        onChange={() => {}}
        maximumRows={2}
      />,
    );
    expect(screen.getAllByText("+")).toHaveLength(1);
  });
});
