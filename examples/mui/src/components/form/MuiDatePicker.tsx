import { forwardRef } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

export interface MuiDatePickerProps {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  error?: { message?: string };
  disabled?: boolean;
  readOnly?: boolean;
}

/**
 * MUI DatePicker wrapped for use-form-definition
 *
 * Includes a hidden input to ensure the date value is submitted with forms,
 * since DatePicker doesn't render a native form element.
 */
export const MuiDatePicker = forwardRef<HTMLInputElement, MuiDatePickerProps>(
  ({ name, value, onChange, label, error, disabled, readOnly }, ref) => {
    const errorMessage = error?.message;

    // Convert string value to Dayjs for MUI DatePicker
    const dateValue = value ? dayjs(value) : null;

    const handleChange = (newValue: Dayjs | null) => {
      // Convert back to ISO string for form storage
      onChange(newValue ? newValue.format('YYYY-MM-DD') : '');
    };

    return (
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {/* Hidden input for form submission */}
        <input type="hidden" name={name} value={value || ''} ref={ref} />
        <DatePicker
          label={label}
          value={dateValue}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          slotProps={{
            textField: {
              fullWidth: true,
              size: 'small',
              error: !!errorMessage,
              helperText: errorMessage,
            },
          }}
        />
      </LocalizationProvider>
    );
  }
);

MuiDatePicker.displayName = 'MuiDatePicker';
