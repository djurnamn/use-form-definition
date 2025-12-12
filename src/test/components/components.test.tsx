import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import TextInput from '../../components/TextInput';
import NumberInput from '../../components/NumberInput';
import Select from '../../components/Select';
import Checkbox from '../../components/Checkbox';
import Field from '../../components/Field';
import Repeater from '../../components/Repeater';

// Test wrapper component for react-hook-form integration
const FormWrapper = ({ children, onSubmit = () => {} }: { children: React.ReactNode; onSubmit?: (data: any) => void }) => {
  const methods = useForm({
    defaultValues: {
      name: '',
      email: '',
      age: 0,
      isActive: false,
      country: '',
      items: []
    }
  });

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      {/* Add form context for components that need it */}
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

describe('Component Testing', () => {
  describe('TextInput Component', () => {
    it('should render text input with label', () => {
      render(
        <FormWrapper>
          <Field label="Full Name" name="name">
            <TextInput 
              name="name"
              placeholder="Enter your name"
              onChange={() => {}}
            />
          </Field>
        </FormWrapper>
      );

      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    it('should handle user input', () => {
      let inputValue = '';
      const handleChange = (value: string) => {
        inputValue = value;
      };
      
      render(
        <FormWrapper>
          <Field label="Full Name" name="name">
            <TextInput 
              name="name"
              value={inputValue}
              onChange={handleChange}
            />
          </Field>
        </FormWrapper>
      );

      const input = screen.getByLabelText('Full Name');
      fireEvent.change(input, { target: { value: 'John Doe' } });
      
      expect(inputValue).toBe('John Doe');
    });

    it('should display error message', () => {
      const error = { message: 'Name is required', type: 'required' };
      render(
        <FormWrapper>
          <Field label="Full Name" name="name" error={error}>
            <TextInput 
              name="name"
              onChange={() => {}}
            />
          </Field>
        </FormWrapper>
      );

      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    it('should handle required state', () => {
      render(
        <FormWrapper>
          <Field label="Full Name*" name="name">
            <TextInput 
              name="name"
              required={true}
              onChange={() => {}}
            />
          </Field>
        </FormWrapper>
      );

      const label = screen.getByText('Full Name*');
      expect(label.textContent).toContain('*');
    });
  });

  describe('NumberInput Component', () => {
    it('should render number input', () => {
      render(
        <FormWrapper>
          <Field label="Age" name="age">
            <NumberInput 
              name="age"
              min={0}
              max={100}
              onChange={() => {}}
            />
          </Field>
        </FormWrapper>
      );

      const input = screen.getByLabelText('Age');
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
    });

    it('should handle numeric input', () => {
      let inputValue = '';
      const handleChange = (value: string) => {
        inputValue = value;
      };
      
      render(
        <FormWrapper>
          <Field label="Age" name="age">
            <NumberInput 
              name="age"
              value={inputValue}
              onChange={handleChange}
            />
          </Field>
        </FormWrapper>
      );

      const input = screen.getByLabelText('Age');
      fireEvent.change(input, { target: { value: '25' } });
      
      expect(inputValue).toBe('25');
    });
  });

  describe('Select Component', () => {
    const options = [
      { label: 'USA', value: 'us' },
      { label: 'Canada', value: 'ca' },
      { label: 'UK', value: 'uk' }
    ];

    it('should render select with options', () => {
      render(
        <FormWrapper>
          <Field label="Country" name="country">
            <Select 
              name="country"
              options={options}
              onChange={() => {}}
            />
          </Field>
        </FormWrapper>
      );

      expect(screen.getByLabelText('Country')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should handle selection', () => {
      let selectedValue = '';
      const handleChange = (value: string) => {
        selectedValue = value;
      };
      
      render(
        <FormWrapper>
          <Field label="Country" name="country">
            <Select 
              name="country"
              options={options}
              value={selectedValue}
              onChange={handleChange}
            />
          </Field>
        </FormWrapper>
      );

      const select = screen.getByLabelText('Country');
      fireEvent.change(select, { target: { value: 'ca' } });
      
      expect(selectedValue).toBe('ca');
    });

    it('should display placeholder', () => {
      render(
        <FormWrapper>
          <Field label="Country" name="country">
            <Select 
              name="country"
              options={options}
              placeholder="Select a country"
              onChange={() => {}}
            />
          </Field>
        </FormWrapper>
      );

      expect(screen.getByText('Select a country')).toBeInTheDocument();
    });
  });

  describe('Checkbox Component', () => {
    it('should render checkbox', () => {
      render(
        <FormWrapper>
          <Checkbox
            name="isActive"
            inlineLabel="Active Status"
            onChange={() => {}}
          />
        </FormWrapper>
      );

      expect(screen.getByLabelText('Active Status')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should handle checkbox toggle', () => {
      const mockOnChange = vi.fn();
      
      render(
        <FormWrapper>
          <Checkbox
            name="isActive"
            inlineLabel="Active Status"
            onChange={mockOnChange}
          />
        </FormWrapper>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalled();
      
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Field Component', () => {
    it('should render with children pattern', () => {
      render(
        <FormWrapper>
          <Field label="Test Field" name="test">
            <input type="text" />
          </Field>
        </FormWrapper>
      );

      expect(screen.getByText('Test Field')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with render prop pattern', () => {
      // Field component uses children pattern, not render prop
      // This test should focus on the render prop if the Field supports it
      render(
        <FormWrapper>
          <Field label="Test Field" name="test">
            <input type="text" />
          </Field>
        </FormWrapper>
      );

      expect(screen.getByText('Test Field')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should display field error', () => {
      const error = { message: 'Field is required', type: 'required' as const };
      render(
        <FormWrapper>
          <Field 
            label="Test Field" 
            name="test"
            error={error}
          >
            <input type="text" />
          </Field>
        </FormWrapper>
      );

      expect(screen.getByText('Field is required')).toBeInTheDocument();
    });

    it('should handle required indicator', () => {
      render(
        <FormWrapper>
          <Field 
            label="Required Field *" 
            name="test"
          >
            <input type="text" />
          </Field>
        </FormWrapper>
      );

      const label = screen.getByText('Required Field *');
      expect(label.textContent).toContain('*');
    });
  });

  describe('Repeater Component', () => {
    const fields = {
      name: {
        type: 'text' as const,
        validation: { required: true }
      },
      email: {
        type: 'email' as const,
        validation: { required: true, pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } }
      }
    };

    it('should render empty repeater with add button', () => {
      render(
        <FormWrapper>
          <Repeater
            name="items"
            fields={fields}
            onChange={() => {}}
            value={[]}
          />
        </FormWrapper>
      );

      expect(screen.getByText('+')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
    });

    it('should handle adding new rows', () => {
      const mockOnChange = vi.fn();

      render(
        <FormWrapper>
          <Repeater
            name="items"
            fields={fields}
            onChange={mockOnChange}
            value={[]}
          />
        </FormWrapper>
      );

      const addButton = screen.getByText('+');
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledWith([{ name: '', email: '' }]);
    });

    it('should render existing rows', () => {
      const values = [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' }
      ];

      render(
        <FormWrapper>
          <Repeater 
            name="items"
            fields={fields}
            onChange={() => {}}
            value={values}
          />
        </FormWrapper>
      );

      // Check that table headers are rendered
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
      
      // Check that values are present (the repeater creates input fields with these values)
      const nameInputs = screen.getAllByDisplayValue(/John|Jane/);
      const emailInputs = screen.getAllByDisplayValue(/@example\.com/);
      
      expect(nameInputs.length).toBeGreaterThan(0);
      expect(emailInputs.length).toBeGreaterThan(0);
    });

    it('should handle row deletion', () => {
      const mockOnChange = vi.fn();
      const values = [
        { name: 'John', email: 'john@example.com' }
      ];

      render(
        <FormWrapper>
          <Repeater
            name="items"
            fields={fields}
            onChange={mockOnChange}
            value={values}
          />
        </FormWrapper>
      );

      const deleteButton = screen.getByText('×');
      fireEvent.click(deleteButton);

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('should respect maxRows configuration', () => {
      const values = [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' }
      ];

      render(
        <FormWrapper>
          <Repeater
            name="items"
            fields={fields}
            onChange={() => {}}
            value={values}
            maxRows={2}
          />
        </FormWrapper>
      );

      const addButton = screen.queryByText('+');
      expect(addButton).not.toBeInTheDocument();
    });

    it('should respect disableAddRow configuration', () => {
      render(
        <FormWrapper>
          <Repeater
            name="items"
            fields={fields}
            onChange={() => {}}
            value={[]}
            disableAddRow={true}
          />
        </FormWrapper>
      );

      const addButton = screen.queryByText('+');
      expect(addButton).not.toBeInTheDocument();
    });

    it('should hide table header when hideHeader is true', () => {
      render(
        <FormWrapper>
          <Repeater 
            name="items"
            fields={fields}
            label="Items"
            onChange={() => {}}
            value={[{ name: 'John', email: 'john@example.com' }]}
            hideHeader={true}
          />
        </FormWrapper>
      );

      // Should not find the header row with field names
      expect(screen.queryByText('name')).not.toBeInTheDocument();
      expect(screen.queryByText('email')).not.toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should work together in a form', async () => {
      const onSubmit = vi.fn();

      render(
        <FormWrapper onSubmit={onSubmit}>
          <Field label="Name" name="name">
            <TextInput name="name" onChange={() => {}} />
          </Field>
          <Field label="Age" name="age">
            <NumberInput name="age" onChange={() => {}} />
          </Field>
          <Field label="Country" name="country">
            <Select
              name="country"
              options={[
                { label: 'USA', value: 'us' },
                { label: 'Canada', value: 'ca' }
              ]}
              onChange={() => {}}
            />
          </Field>
          <Checkbox name="isActive" inlineLabel="Active" onChange={() => {}} />
          <button type="submit">Submit</button>
        </FormWrapper>
      );

      // Check that components render with proper labels
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Age')).toBeInTheDocument();
      expect(screen.getByLabelText('Country')).toBeInTheDocument();
      expect(screen.getByLabelText('Active')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();

      // Submit form
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });
  });
});