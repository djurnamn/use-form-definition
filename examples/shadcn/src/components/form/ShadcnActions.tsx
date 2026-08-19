import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export interface ShadcnActionsProps {
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
export const ShadcnActions = ({
  children = 'Submit',
  disabled,
  isSubmitting,
}: ShadcnActionsProps) => {
  return (
    <Button type="submit" disabled={disabled || isSubmitting}>
      {isSubmitting ? 'Submitting...' : children}
    </Button>
  );
};
