import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { deriveHtml5Attributes } from '../../core/html5-attributes';
import { patterns } from '../../validation/patterns';
import { createFormDefinitionHook } from '../../hooks/createFormDefinitionHook';
import TextInput from '../../components/TextInput';
import NumberInput from '../../components/NumberInput';
import { FormDefinition, FormFieldDefinition } from '../../core/types';

describe('deriveHtml5Attributes', () => {
  describe('required', () => {
    it('emits required for an unconditionally required field', () => {
      const field: FormFieldDefinition = { type: 'text', validation: { required: true } };
      expect(deriveHtml5Attributes(field)).toEqual({ required: true });
    });

    it('emits required for the { value: true } rule form', () => {
      const field: FormFieldDefinition = {
        type: 'text',
        validation: { required: { value: true, message: 'Required' } },
      };
      expect(deriveHtml5Attributes(field).required).toBe(true);
    });

    it('does not emit required for a conditional requiredWhen rule', () => {
      const field: FormFieldDefinition = {
        type: 'text',
        validation: { requiredWhen: { field: 'other', value: 'x' } },
      };
      expect(deriveHtml5Attributes(field)).toEqual({});
    });

    it('does not emit required when required is explicitly false', () => {
      const field: FormFieldDefinition = { type: 'text', validation: { required: false } };
      expect(deriveHtml5Attributes(field).required).toBeUndefined();
    });

    it('maps checkbox mustBeTrue to required', () => {
      const field: FormFieldDefinition = { type: 'checkbox', validation: { mustBeTrue: true } };
      expect(deriveHtml5Attributes(field)).toEqual({ required: true });
    });

    it('emits required on a select', () => {
      const field: FormFieldDefinition = { type: 'select', validation: { required: true } };
      expect(deriveHtml5Attributes(field)).toEqual({ required: true });
    });
  });

  describe('pattern', () => {
    it('resolves a named pattern key to its regex source', () => {
      const field: FormFieldDefinition = { type: 'email', validation: { pattern: 'email' } };
      expect(deriveHtml5Attributes(field).pattern).toBe(patterns.email.pattern.source);
    });

    it('uses the source of an inline RegExp', () => {
      const re = /^[a-z]+$/;
      const field: FormFieldDefinition = { type: 'text', validation: { pattern: re } };
      expect(deriveHtml5Attributes(field).pattern).toBe(re.source);
    });

    it('resolves the { value, message } rule form', () => {
      const field: FormFieldDefinition = {
        type: 'text',
        validation: { pattern: { value: 'slug', message: 'Bad slug' } },
      };
      expect(deriveHtml5Attributes(field).pattern).toBe(patterns.slug.pattern.source);
    });

    it('emits nothing for an unknown named pattern key', () => {
      const field: FormFieldDefinition = { type: 'text', validation: { pattern: 'not-a-pattern' as any } };
      expect(deriveHtml5Attributes(field).pattern).toBeUndefined();
    });

    it('does not emit pattern on a textarea', () => {
      const field: FormFieldDefinition = { type: 'textarea', validation: { pattern: 'email' } };
      expect(deriveHtml5Attributes(field).pattern).toBeUndefined();
    });
  });

  describe('minLength / maxLength', () => {
    it('emits both for a text field', () => {
      const field: FormFieldDefinition = {
        type: 'text',
        validation: { minLength: 2, maxLength: 10 },
      };
      const attrs = deriveHtml5Attributes(field);
      expect(attrs.minLength).toBe(2);
      expect(attrs.maxLength).toBe(10);
    });

    it('emits them for a textarea', () => {
      const field: FormFieldDefinition = { type: 'textarea', validation: { maxLength: 500 } };
      expect(deriveHtml5Attributes(field).maxLength).toBe(500);
    });

    it('unwraps the { value, message } rule form', () => {
      const field: FormFieldDefinition = {
        type: 'text',
        validation: { minLength: { value: 3, message: 'Too short' } },
      };
      expect(deriveHtml5Attributes(field).minLength).toBe(3);
    });

    it('does not emit length attrs on a number field', () => {
      const field: FormFieldDefinition = { type: 'number', validation: { minLength: 2 } as any };
      expect(deriveHtml5Attributes(field).minLength).toBeUndefined();
    });
  });

  describe('min / max', () => {
    it('emits numeric bounds for a number field', () => {
      const field: FormFieldDefinition = { type: 'number', validation: { min: 18, max: 100 } };
      const attrs = deriveHtml5Attributes(field);
      expect(attrs.min).toBe(18);
      expect(attrs.max).toBe(100);
    });

    it('passes through string bounds for a date field', () => {
      const field: FormFieldDefinition = {
        type: 'date',
        validation: { min: '2020-01-01' as any, max: '2030-12-31' as any },
      };
      const attrs = deriveHtml5Attributes(field);
      expect(attrs.min).toBe('2020-01-01');
      expect(attrs.max).toBe('2030-12-31');
    });

    it('formats a Date bound to YYYY-MM-DD for a date field', () => {
      const field: FormFieldDefinition = {
        type: 'date',
        validation: { min: new Date('2020-01-15T00:00:00.000Z') as any },
      };
      expect(deriveHtml5Attributes(field).min).toBe('2020-01-15');
    });

    it('formats a Date bound to YYYY-MM-DDThh:mm for datetime-local', () => {
      const field: FormFieldDefinition = {
        type: 'datetime-local',
        validation: { min: new Date('2020-01-15T09:30:00.000Z') as any },
      };
      expect(deriveHtml5Attributes(field).min).toBe('2020-01-15T09:30');
    });

    it('does not emit min/max on a text field', () => {
      const field: FormFieldDefinition = { type: 'text', validation: { min: 1 } as any };
      expect(deriveHtml5Attributes(field).min).toBeUndefined();
    });
  });

  describe('step', () => {
    it('emits a numeric step for a number field', () => {
      const field: FormFieldDefinition = { type: 'number', validation: { step: 5 } };
      expect(deriveHtml5Attributes(field).step).toBe(5);
    });

    it('unwraps the { value, message } rule form', () => {
      const field: FormFieldDefinition = {
        type: 'number',
        validation: { step: { value: 0.01, message: 'Increments of 0.01' } },
      };
      expect(deriveHtml5Attributes(field).step).toBe(0.01);
    });

    it('emits step for a range field', () => {
      const field: FormFieldDefinition = { type: 'range', validation: { step: 10 } };
      expect(deriveHtml5Attributes(field).step).toBe(10);
    });

    it('does not emit step on a text field', () => {
      const field: FormFieldDefinition = { type: 'text', validation: { step: 1 } as any };
      expect(deriveHtml5Attributes(field).step).toBeUndefined();
    });
  });

  // Range-only input types (range / month / week / time) are in RANGE_TYPES, so
  // min / max / step emit for them just as for number and date.
  describe('range-only input types', () => {
    it('emits min / max / step for a range field', () => {
      const field: FormFieldDefinition = {
        type: 'range',
        validation: { min: 0, max: 100, step: 5 },
      };
      expect(deriveHtml5Attributes(field)).toEqual({ min: 0, max: 100, step: 5 });
    });

    it('emits string bounds for a month field', () => {
      const field: FormFieldDefinition = {
        type: 'month',
        validation: { min: '2020-01' as any, max: '2030-12' as any },
      };
      const attrs = deriveHtml5Attributes(field);
      expect(attrs.min).toBe('2020-01');
      expect(attrs.max).toBe('2030-12');
    });

    it('emits string bounds for a week field', () => {
      const field: FormFieldDefinition = {
        type: 'week',
        validation: { min: '2020-W01' as any, max: '2020-W52' as any },
      };
      const attrs = deriveHtml5Attributes(field);
      expect(attrs.min).toBe('2020-W01');
      expect(attrs.max).toBe('2020-W52');
    });

    it('emits string bounds for a time field', () => {
      const field: FormFieldDefinition = {
        type: 'time',
        validation: { min: '09:00' as any, max: '17:00' as any },
      };
      const attrs = deriveHtml5Attributes(field);
      expect(attrs.min).toBe('09:00');
      expect(attrs.max).toBe('17:00');
    });
  });

  it('returns an empty object when there is no validation', () => {
    expect(deriveHtml5Attributes({ type: 'text' })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Integration: the flag threads through the hook onto the rendered inputs.
// ---------------------------------------------------------------------------

const definition: FormDefinition = {
  username: {
    type: 'text',
    validation: { required: true, minLength: 3, maxLength: 20, pattern: 'slug' },
  },
  age: {
    type: 'number',
    validation: { min: 18, max: 100 },
  },
};

const components = { text: TextInput, number: NumberInput };

describe('emitHtml5Attributes (integration)', () => {
  it('emits derived attributes on inputs when enabled', () => {
    const useTestForm = createFormDefinitionHook({ components, emitHtml5Attributes: true });
    const Harness = () => {
      const { RenderedForm } = useTestForm(definition);
      return <RenderedForm showActions={false} />;
    };
    render(<Harness />);

    const username = screen.getByRole('textbox');
    expect(username).toHaveAttribute('required');
    expect(username).toHaveAttribute('minlength', '3');
    expect(username).toHaveAttribute('maxlength', '20');
    expect(username).toHaveAttribute('pattern', patterns.slug.pattern.source);

    const age = screen.getByRole('spinbutton');
    expect(age).toHaveAttribute('min', '18');
    expect(age).toHaveAttribute('max', '100');
  });

  it('emits no HTML5 validation attributes when the flag is off (default)', () => {
    const useTestForm = createFormDefinitionHook({ components });
    const Harness = () => {
      const { RenderedForm } = useTestForm(definition);
      return <RenderedForm showActions={false} />;
    };
    render(<Harness />);

    const username = screen.getByRole('textbox');
    expect(username).not.toHaveAttribute('required');
    expect(username).not.toHaveAttribute('minlength');
    expect(username).not.toHaveAttribute('maxlength');
    expect(username).not.toHaveAttribute('pattern');

    const age = screen.getByRole('spinbutton');
    expect(age).not.toHaveAttribute('min');
    expect(age).not.toHaveAttribute('max');
  });
});
