import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectProps,
} from '@mui/material';
import { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface MuiSelectProps extends Omit<SelectProps, 'error'> {
  options: SelectOption[];
  error?: { message?: string };
  label?: string;
  placeholder?: string;
}

export const MuiSelect = forwardRef<HTMLInputElement, MuiSelectProps>(
  ({ options, error, label, placeholder, name, value, ...props }, ref) => {
    const labelId = `${name}-label`;
    const errorMessage = error?.message;
    const hasValue = value !== undefined && value !== '';

    // When using displayEmpty with a placeholder, we need to shrink the label
    // to prevent it from overlapping with the placeholder text
    const shouldShrinkLabel = hasValue || !!placeholder;

    return (
      <FormControl fullWidth size="small" error={!!errorMessage}>
        {label && (
          <InputLabel id={labelId} shrink={shouldShrinkLabel}>
            {label}
          </InputLabel>
        )}
        <Select
          {...props}
          name={name}
          value={value}
          labelId={labelId}
          label={label}
          inputRef={ref}
          displayEmpty={!!placeholder}
          notched={shouldShrinkLabel}
        >
          {placeholder && (
            <MenuItem value="" disabled>
              <em>{placeholder}</em>
            </MenuItem>
          )}
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        {errorMessage && <FormHelperText>{errorMessage}</FormHelperText>}
      </FormControl>
    );
  }
);

MuiSelect.displayName = 'MuiSelect';
