import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import { sectionsWithErrors, sectionOf } from '../../server';
import type { FormDefinition, FormActionResult } from '../../core/types';
import type { FormSections } from '../../core/sections';

/**
 * The sections API: membership questions the library answers so the app can own
 * navigation - per-section validation for a wizard's Continue gate, error-to-section
 * mapping for badges. Policy (when to advance, refusing the transition) stays in the
 * app's handler throughout.
 */

const useFormDefinition = createFormDefinitionHook({});

const definition: FormDefinition = {
  name: { type: 'text', validation: { required: true } },
  slug: { type: 'text' },
  summary: { type: 'text', validation: { required: true } },
  motto: { type: 'text' },
};

const sections: FormSections<typeof definition> = {
  general: ['name', 'slug'],
  lore: ['summary', 'motto'],
};

type Action = (prev: FormActionResult | null, fd: FormData) => Promise<FormActionResult>;

const steps = ['general', 'lore'] as const;

/** The workshop's wizard shape: Continue validates the current step and refuses to advance. */
function WizardForm({ serverAction }: { serverAction: Action }) {
  const { RenderedForm, sections: api } = useFormDefinition(definition, {
    sections,
    serverAction,
  });
  const [step, setStep] = useState(0);

  const next = async () => {
    if (await api.validate(steps[step])) setStep(step + 1);
  };

  return (
    <>
      <div data-testid="step">{steps[step]}</div>
      <RenderedForm currentSection={steps[step]} showActions={step === steps.length - 1} />
      {step < steps.length - 1 && (
        <button type="button" onClick={next}>
          Continue
        </button>
      )}
    </>
  );
}

const control = (container: HTMLElement, name: string) =>
  container.querySelector(
    `input[name="${name}"]:not([data-ufd-mirror])`
  ) as HTMLInputElement;

describe('the sections API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('answers membership from the declared map', () => {
    let captured: any;
    function Probe() {
      const { RenderedForm, sections: api } = useFormDefinition(definition, { sections });
      captured = api;
      return <RenderedForm />;
    }
    render(<Probe />);

    expect(captured.fields('lore')).toEqual(['summary', 'motto']);
    expect(captured.of('slug')).toBe('general');
    expect(captured.of('unknown')).toBeUndefined();
    expect(captured.withErrors({ summary: 'Required', name: 'Required' })).toEqual([
      'general',
      'lore',
    ]);
  });

  it('answers membership from rendering when no map was declared', async () => {
    let captured: any;
    function Probe() {
      const { RenderedForm, RenderedSection, RenderedField, sections: api } =
        useFormDefinition(definition, {});
      captured = api;
      return (
        <RenderedForm currentSection="general">
          <RenderedSection name="general">
            <RenderedField name="name" />
            <RenderedField name="slug" />
          </RenderedSection>
          <RenderedSection name="lore">
            <RenderedField name="summary" />
            <RenderedField name="motto" />
          </RenderedSection>
        </RenderedForm>
      );
    }
    render(<Probe />);

    // Complete after first paint: mirrors render too, so the inactive section is known.
    expect(captured.of('summary')).toBe('lore');
    expect(captured.withErrors({ motto: 'bad' })).toEqual(['lore']);
  });

  it('validates only the named section', async () => {
    let captured: any;
    function Probe() {
      const { RenderedForm, sections: api } = useFormDefinition(definition, { sections });
      captured = api;
      return <RenderedForm currentSection="general" />;
    }
    const user = userEvent.setup();
    const { container } = render(<Probe />);

    // `summary` (required, in `lore`) is empty - but `general`, once filled, validates.
    await user.type(control(container, 'name'), 'Astrid');
    await expect(captured.validate('general')).resolves.toBe(true);
    await expect(captured.validate('lore')).resolves.toBe(false);
  });

  it('gates a wizard: Continue refuses to advance until the step validates', async () => {
    const user = userEvent.setup();
    const serverAction: Action = vi.fn(async () => ({ success: true }));
    const { container } = render(<WizardForm serverAction={serverAction} />);

    // `name` (required, step one) is empty: Continue must hold the line.
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByTestId('step').textContent).toBe('general');

    await user.type(control(container, 'name'), 'Astrid');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByTestId('step').textContent).toBe('lore'));

    // Step one's values ride along as mirrors on the final step.
    expect(
      (container.querySelector('input[name="name"][data-ufd-mirror]') as HTMLInputElement)
        .value
    ).toBe('Astrid');
  });

  it('exposes sectionsWithErrors and sectionOf on the server entry', () => {
    expect(sectionsWithErrors(sections, { motto: 'bad' })).toEqual(['lore']);
    expect(sectionsWithErrors(sections, undefined)).toEqual([]);
    expect(sectionOf(sections, 'name')).toBe('general');
  });

  it('raises the off-screen notice when the only failing field is mirrored', async () => {
    const user = userEvent.setup();
    const received: FormData[] = [];
    const serverAction: Action = vi.fn(async (_prev, formData) => {
      received.push(formData);
      return { success: true };
    });
    function Form() {
      const { RenderedForm } = useFormDefinition(definition, { sections, serverAction });
      return <RenderedForm currentSection="general" />;
    }
    const { container } = render(<Form />);

    // Fill everything visible; `summary` (required) exists only as a mirror carrying "".
    await user.type(control(container, 'name'), 'Astrid');
    await user.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(screen.getByText(/not currently shown/i)).toBeTruthy()
    );
    expect(serverAction).not.toHaveBeenCalled();
  });
});
