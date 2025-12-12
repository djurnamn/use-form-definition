import { DatePicker } from 'antd';
import { forwardRef } from 'react';
import dayjs, { Dayjs } from 'dayjs';

export interface AntDatePickerProps {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Ant Design DatePicker wrapped for use-form-definition
 *
 * Includes a hidden input for form submission since DatePicker
 * doesn't render a native input element.
 *
 * The Field wrapper (Form.Item) handles label and error display.
 */
export const AntDatePicker = forwardRef<HTMLInputElement, AntDatePickerProps>(
  ({ name, value, onChange, placeholder, disabled }, ref) => {
    // Convert string value to Dayjs for Ant Design DatePicker
    const dateValue = value ? dayjs(value) : null;

    const handleChange = (date: Dayjs | null) => {
      // Convert back to ISO string for form storage
      onChange(date ? date.format('YYYY-MM-DD') : '');
    };

    return (
      <>
        {/* Hidden input for form submission */}
        <input type="hidden" name={name} value={value || ''} ref={ref} />
        <DatePicker
          value={dateValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      </>
    );
  }
);

AntDatePicker.displayName = 'AntDatePicker';
