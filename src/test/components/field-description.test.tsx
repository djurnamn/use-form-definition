import { describe, it, expect } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import type { FormDefinition } from '../../core/types';

// `description` is the per-field explanatory text: a library prop that reaches
// the Field wrapper (which renders it under the control with a pointable id),
// is filtered from the control's DOM props, and resolves through its own
// translation category (`descriptions`, opt-in like `placeholders`).

const definition: FormDefinition = {
  ownerEmail: {
    type: 'email',
    label: 'Owner email',
    description: 'Published in the public feed.',
  },
};

describe('Field description', () => {
  it('renders in the default Field wrapper with the derived id', () => {
    const useFormDefinition = createFormDefinitionHook({});
    function Demo() {
      const { RenderedForm } = useFormDefinition(definition);
      return <RenderedForm />;
    }
    const { container } = render(<Demo />);

    const element = container.querySelector('#ownerEmail-description');
    expect(element).not.toBeNull();
    expect(element?.textContent).toBe('Published in the public feed.');
  });

  it('is filtered from the control - no description attribute lands on the input', () => {
    const useFormDefinition = createFormDefinitionHook({});
    function Demo() {
      const { RenderedForm } = useFormDefinition(definition);
      return <RenderedForm />;
    }
    const { container } = render(<Demo />);

    const input = container.querySelector('input[name="ownerEmail"]');
    expect(input).not.toBeNull();
    expect(input?.hasAttribute('description')).toBe(false);
  });

  it('points the control aria-describedby at the description element', () => {
    const useFormDefinition = createFormDefinitionHook({});
    function Demo() {
      const { RenderedForm } = useFormDefinition(definition);
      return <RenderedForm />;
    }
    const { container } = render(<Demo />);

    const input = container.querySelector('input[name="ownerEmail"]');
    expect(input?.getAttribute('aria-describedby')).toBe('ownerEmail-description');
  });

  it('joins the error id into aria-describedby when a validation error shows', async () => {
    const useFormDefinition = createFormDefinitionHook({});
    function Demo() {
      const { RenderedForm } = useFormDefinition({
        ownerEmail: {
          ...definition.ownerEmail,
          validation: { required: true },
        },
      } as FormDefinition);
      // No onSubmit - submitting must still run validation and show the error.
      return <RenderedForm />;
    }
    const { container } = render(<Demo />);

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(container.querySelector('#ownerEmail-error')).not.toBeNull();
    });
    const input = container.querySelector('input[name="ownerEmail"]');
    expect(input?.getAttribute('aria-describedby')).toBe(
      'ownerEmail-error ownerEmail-description'
    );
  });

  it('accepts a runtime override on RenderedField, including false to hide', () => {
    const useFormDefinition = createFormDefinitionHook({});
    function Demo({ override }: { override: string | false }) {
      const { RenderedForm, RenderedField } = useFormDefinition(definition);
      return (
        <RenderedForm>
          <RenderedField name="ownerEmail" description={override} />
        </RenderedForm>
      );
    }

    const overridden = render(<Demo override="Runtime text." />);
    const element = overridden.container.querySelector('#ownerEmail-description');
    expect(element?.textContent).toBe('Runtime text.');

    const hidden = render(<Demo override={false} />);
    expect(hidden.container.querySelector('#ownerEmail-description')).toBeNull();
  });

  it('resolves through the descriptions translation category', () => {
    const dictionary: Record<string, string> = {
      'form.descriptions.ownerEmail': 'Publiceras i det publika flödet.',
    };
    const useFormDefinition = createFormDefinitionHook({
      translation: {
        hook: () => (key: string) => dictionary[key] ?? key,
        descriptions: { enabled: true },
      },
    });
    function Demo() {
      const { RenderedForm } = useFormDefinition({
        ownerEmail: { ...definition.ownerEmail, description: 'auto' },
      } as FormDefinition);
      return <RenderedForm />;
    }
    const { container } = render(<Demo />);

    expect(container.textContent).toContain('Publiceras i det publika flödet.');
    expect(container.textContent).not.toContain('form.descriptions.ownerEmail');
  });

  it('stays absent when the definition carries none', () => {
    const useFormDefinition = createFormDefinitionHook({});
    function Demo() {
      const { RenderedForm } = useFormDefinition({
        plain: { type: 'text', label: 'Plain' },
      } as FormDefinition);
      return <RenderedForm />;
    }
    const { container } = render(<Demo />);

    expect(container.querySelector('[id$="-description"]')).toBeNull();
  });
});
