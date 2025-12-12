import { Select } from 'antd';
import { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface AntSelectProps {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Ant Design Select wrapped for use-form-definition
 *
 * Includes a hidden input for form submission since Ant Design Select
 * doesn't render a native select element.
 *
 * The Field wrapper (Form.Item) handles label and error display.
 */
export const AntSelect = forwardRef<HTMLInputElement, AntSelectProps>(
  ({ name, value, onChange, options, placeholder, disabled }, ref) => {
    return (
      <>
        {/* Hidden input for form submission */}
        <input type="hidden" name={name} value={value || ''} ref={ref} />
        <Select
          value={value || undefined}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          options={options}
          style={{ width: '100%' }}
        />
      </>
    );
  }
);

AntSelect.displayName = 'AntSelect';
