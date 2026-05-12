import {
  FormControlLabel,
  Checkbox,
  FormHelperText,
  FormControl,
  CheckboxProps,
} from '@mui/material';
import { forwardRef } from 'react';

export interface MuiCheckboxProps extends Omit<CheckboxProps, 'error'> {
  inlineLabel?: string;
  error?: { message?: string };
}

export const MuiCheckbox = forwardRef<HTMLButtonElement, MuiCheckboxProps>(
  ({ inlineLabel, error, name, value, ...props }, ref) => {
    const errorMessage = error?.message;

    // react-hook-form's Controller passes the field state as `value` (a boolean here);
    // MUI's Checkbox wants `checked`, not `value`.
    return (
      <FormControl error={!!errorMessage}>
        <FormControlLabel
          control={
            <Checkbox {...props} name={name} checked={!!value} inputRef={ref} />
          }
          label={inlineLabel || ''}
        />
        {errorMessage && <FormHelperText>{errorMessage}</FormHelperText>}
      </FormControl>
    );
  }
);

MuiCheckbox.displayName = 'MuiCheckbox';
