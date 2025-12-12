import { forwardRef } from 'react';
import { Autocomplete, TextField } from '@mui/material';

export interface AutocompleteOption {
  value: string;
  label: string;
}

export interface MuiAutocompleteProps {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  label?: string;
  placeholder?: string;
  error?: { message?: string };
  disabled?: boolean;
  readOnly?: boolean;
}

/**
 * MUI Autocomplete wrapped for use-form-definition
 *
 * This component demonstrates the "hidden input pattern" for UI library components
 * that don't render native form elements. The hidden input ensures:
 *
 * 1. The value is included in FormData when the form is submitted
 * 2. Server-side form handling works correctly
 * 3. Progressive enhancement is maintained (form works without JS)
 *
 * Use this pattern for any complex UI component that doesn't output a <select>,
 * <input>, or other native form element.
 */
export const MuiAutocomplete = forwardRef<HTMLInputElement, MuiAutocompleteProps>(
  ({ name, value, onChange, options, label, placeholder, error, disabled, readOnly }, ref) => {
    const errorMessage = error?.message;

    // Find the selected option object from the value
    const selectedOption = options.find((opt) => opt.value === value) || null;

    const handleChange = (_event: unknown, newValue: AutocompleteOption | null) => {
      onChange(newValue?.value || '');
    };

    return (
      <>
        {/* Hidden input for form submission - this is the key pattern! */}
        <input type="hidden" name={name} value={value || ''} ref={ref} />

        <Autocomplete
          value={selectedOption}
          onChange={handleChange}
          options={options}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, val) => option.value === val.value}
          disabled={disabled}
          readOnly={readOnly}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder={placeholder}
              error={!!errorMessage}
              helperText={errorMessage}
              fullWidth
              size="small"
            />
          )}
        />
      </>
    );
  }
);

MuiAutocomplete.displayName = 'MuiAutocomplete';
