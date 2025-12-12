import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export interface ShadcnSubmitButtonProps {
  children?: ReactNode;
  disabled?: boolean;
  isSubmitting?: boolean;
}

/**
 * Submit button component for shadcn/ui styled forms.
 *
 * Shows loading state when form is submitting.
 * Default text is "Submit" if no children provided.
 */
export const ShadcnSubmitButton = ({
  children = 'Submit',
  disabled,
  isSubmitting,
}: ShadcnSubmitButtonProps) => {
  return (
    <Button type="submit" disabled={disabled || isSubmitting}>
      {isSubmitting ? 'Submitting...' : children}
    </Button>
  );
};
