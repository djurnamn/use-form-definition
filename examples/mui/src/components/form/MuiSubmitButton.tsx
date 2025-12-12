import { Button, ButtonProps } from '@mui/material';
import { ReactNode } from 'react';

export interface MuiSubmitButtonProps extends Omit<ButtonProps, 'type'> {
  children?: ReactNode;
}

/**
 * MUI-styled submit button for forms
 *
 * Replaces the library's default HTML button with MUI's Button component.
 * Uses contained variant and primary color by default.
 */
export function MuiSubmitButton({
  children = 'Submit',
  ...props
}: MuiSubmitButtonProps) {
  return (
    <Button
      type="submit"
      variant="contained"
      color="primary"
      fullWidth
      {...props}
    >
      {children}
    </Button>
  );
}
