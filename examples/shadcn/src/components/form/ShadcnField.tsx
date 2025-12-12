import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface ShadcnFieldProps {
  name: string;
  label?: string;
  error?: { message?: string };
  children: ReactNode;
}

/**
 * Field wrapper component for shadcn/ui styled forms.
 *
 * Provides consistent label and error message display for all field types.
 * Used as the Field component in formComponents configuration.
 */
export const ShadcnField = ({
  name,
  label,
  error,
  children,
}: ShadcnFieldProps) => {
  const errorMessage = error?.message;

  return (
    <div className="space-y-2">
      {label && (
        <Label
          htmlFor={name}
          className={cn(errorMessage && 'text-destructive')}
        >
          {label}
        </Label>
      )}
      {children}
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
};
