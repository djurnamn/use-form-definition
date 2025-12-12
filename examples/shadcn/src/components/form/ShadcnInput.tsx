import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';

export interface ShadcnInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  type?: string;
}

/**
 * Wrapper around shadcn/ui Input for use-form-definition.
 *
 * This is a "naked" component - it only renders the input element.
 * The Field wrapper component handles labels and error display.
 */
export const ShadcnInput = forwardRef<HTMLInputElement, ShadcnInputProps>(
  ({ type = 'text', ...props }, ref) => {
    return <Input ref={ref} type={type} {...props} />;
  }
);

ShadcnInput.displayName = 'ShadcnInput';
