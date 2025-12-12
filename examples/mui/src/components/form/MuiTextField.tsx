import { TextField, TextFieldProps } from '@mui/material';
import { forwardRef } from 'react';

export interface MuiTextFieldProps extends Omit<TextFieldProps, 'error'> {
  error?: { message?: string };
}

export const MuiTextField = forwardRef<HTMLInputElement, MuiTextFieldProps>(
  ({ error, ...props }, ref) => {
    const errorMessage = error?.message;

    return (
      <TextField
        {...props}
        inputRef={ref}
        error={!!errorMessage}
        helperText={errorMessage || props.helperText}
        fullWidth
        size="small"
        variant="outlined"
      />
    );
  }
);

MuiTextField.displayName = 'MuiTextField';
