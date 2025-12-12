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
  ({ inlineLabel, error, name, ...props }, ref) => {
    const errorMessage = error?.message;

    return (
      <FormControl error={!!errorMessage}>
        <FormControlLabel
          control={
            <Checkbox {...props} name={name} inputRef={ref} />
          }
          label={inlineLabel || ''}
        />
        {errorMessage && <FormHelperText>{errorMessage}</FormHelperText>}
      </FormControl>
    );
  }
);

MuiCheckbox.displayName = 'MuiCheckbox';
