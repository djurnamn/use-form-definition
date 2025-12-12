import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import TextInput from '../../components/TextInput';
import Repeater from '../../components/Repeater';
import Field from '../../components/Field';

describe('Minimal Component Test', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });

  it('should render TextInput', () => {
    render(<TextInput name="test" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render FormWrapper', () => {
    const FormWrapper = ({ children }: { children: React.ReactNode }) => {
      const methods = useForm({
        defaultValues: { name: '', email: '' }
      });
      
      return (
        <form>
          {children}
        </form>
      );
    };

    render(
      <FormWrapper>
        <TextInput name="test" onChange={() => {}} />
      </FormWrapper>
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render FormWrapper with cloneElement', () => {
    const FormWrapper = ({ children }: { children: React.ReactNode }) => {
      const methods = useForm({
        defaultValues: { name: '', email: '' }
      });
      
      return (
        <form>
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                onChange: (child.props as any).onChange || (() => {}),
                ...(child.props as any)
              } as any);
            }
            return child;
          })}
        </form>
      );
    };

    render(
      <FormWrapper>
        <TextInput name="test" onChange={() => {}} />
      </FormWrapper>
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render Repeater with correct props', () => {
    const fields = {
      name: {
        type: 'text' as const,
        validation: { required: true }
      }
    };

    render(
      <Repeater
        name="items"
        fields={fields}
        value={[]}
        onChange={() => {}}
      />
    );

    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('should handle custom id prop', () => {
    render(
      <Field label="Custom ID Test" name="test" id="custom-unique-id">
        <TextInput 
          name="test"
          id="custom-unique-id"
          onChange={() => {}}
        />
      </Field>
    );

    const input = screen.getByLabelText('Custom ID Test');
    expect(input).toHaveAttribute('id', 'custom-unique-id');
  });

  it('should fallback to name when no id provided', () => {
    render(
      <Field label="Name Fallback Test" name="fallback">
        <TextInput 
          name="fallback"
          onChange={() => {}}
        />
      </Field>
    );

    const input = screen.getByLabelText('Name Fallback Test');
    expect(input).toHaveAttribute('id', 'fallback');
  });
});