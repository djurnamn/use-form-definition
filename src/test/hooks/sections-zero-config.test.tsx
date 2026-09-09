import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormDefinition } from '../../core/types';
import type { FormSections } from '../../core/sections';

/**
 * Zero-config sections: the declared map alone drives grouped rendering through
 * `<RenderedForm />` with no children - the Section slot wraps each group, each active
 * section gets its own LayoutContainer, inactive sections render as mirrors, and fields
 * in no section stay always-visible.
 */

const definition: FormDefinition = {
  name: { type: 'text', validation: { required: true } },
  slug: { type: 'text' },
  summary: { type: 'text' },
  motto: { type: 'text' },
  notes: { type: 'text' },
};

const sections: FormSections<typeof definition> = {
  general: ['name', 'slug'],
  lore: ['summary', 'motto'],
};

const control = (container: HTMLElement, name: string) =>
  container.querySelector(
    `input[name="${name}"]:not([data-ufd-mirror])`
  ) as HTMLInputElement;

const mirrorsOf = (container: HTMLElement, name: string) =>
  container.querySelectorAll(`input[name="${name}"][data-ufd-mirror]`);

describe('zero-config sections', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders every declared section plus unlisted fields without a currentSection', () => {
    const useFormDefinition = createFormDefinitionHook({});
    function Form() {
      const { RenderedForm } = useFormDefinition(definition, { sections });
      return <RenderedForm />;
    }
    const { container } = render(<Form />);

    for (const name of ['name', 'slug', 'summary', 'motto', 'notes']) {
      expect(control(container, name)).not.toBeNull();
    }
    expect(container.querySelectorAll('[data-ufd-mirror]')).toHaveLength(0);
  });

  it('mirrors inactive sections and keeps unlisted fields visible with a currentSection', () => {
    const useFormDefinition = createFormDefinitionHook({});
    function Form() {
      const { RenderedForm } = useFormDefinition(definition, { sections });
      return <RenderedForm currentSection="general" />;
    }
    const { container } = render(<Form />);

    expect(control(container, 'name')).not.toBeNull();
    expect(control(container, 'summary')).toBeNull();
    expect(mirrorsOf(container, 'summary')).toHaveLength(1);
    // `notes` is in no section: always a control.
    expect(control(container, 'notes')).not.toBeNull();
  });

  it('wraps each section in the Section slot with name, label, and active', () => {
    // Keyed by name (the component may render more than once per section) - what is
    // asserted is the per-section props, not the render count.
    const seen = new Map<string, { label: string; active: boolean }>();
    const Section = ({ name, label, active, children }: any) => {
      seen.set(name, { label, active });
      return (
        <fieldset data-testid={`section-${name}`}>
          <legend>{label}</legend>
          {children}
        </fieldset>
      );
    };
    const useFormDefinition = createFormDefinitionHook({
      formComponents: { Section },
    });
    function Form() {
      const { RenderedForm } = useFormDefinition(definition, { sections });
      return <RenderedForm currentSection="lore" />;
    }
    render(<Form />);

    expect([...seen.entries()]).toEqual([
      ['general', { label: 'general', active: false }],
      ['lore', { label: 'lore', active: true }],
    ]);
    expect(screen.getByTestId('section-lore')).toBeTruthy();
  });

  it('resolves the Section label through the sections translation category', () => {
    const translations: Record<string, string> = {
      'form.sections.general': 'Allmänt',
      'form.sections.lore': 'Bakgrund',
    };
    const labels = new Set<string>();
    const Section = ({ label, children }: any) => {
      labels.add(label);
      return <>{children}</>;
    };
    const useFormDefinition = createFormDefinitionHook({
      formComponents: { Section },
      translation: { function: (key: string) => translations[key] ?? key },
    });
    function Form() {
      const { RenderedForm } = useFormDefinition(definition, { sections });
      return <RenderedForm />;
    }
    render(<Form />);

    expect([...labels]).toEqual(['Allmänt', 'Bakgrund']);
  });

  it('gives each active section its own LayoutContainer', () => {
    const LayoutContainer = ({ children }: any) => (
      <div data-testid="grid">{children}</div>
    );
    const useFormDefinition = createFormDefinitionHook({
      formComponents: { LayoutContainer },
    });
    function Form() {
      const { RenderedForm } = useFormDefinition(definition, { sections });
      return <RenderedForm />;
    }
    render(<Form />);

    // Two sections plus the unlisted trailing group.
    expect(screen.getAllByTestId('grid')).toHaveLength(3);
  });

  it('warns on drift between the declared map and JSX section membership', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const useFormDefinition = createFormDefinitionHook({});
    function Drifted() {
      const { RenderedForm, RenderedSection, RenderedField } = useFormDefinition(
        definition,
        { sections }
      );
      return (
        <RenderedForm>
          <RenderedSection name="general">
            <RenderedField name="name" />
            {/* declared in `lore`, rendered in `general` */}
            <RenderedField name="summary" />
          </RenderedSection>
        </RenderedForm>
      );
    }
    render(<Drifted />);

    const warnings = warn.mock.calls.filter(([message]) =>
      String(message).includes('`summary`')
    );
    expect(warnings).toHaveLength(1);
  });
});
