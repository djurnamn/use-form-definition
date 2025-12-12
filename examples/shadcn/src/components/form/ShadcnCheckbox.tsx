import { forwardRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface ShadcnCheckboxProps {
  name: string;
  value?: boolean;
  onChange?: (checked: boolean) => void;
  inlineLabel?: string;
  error?: { message?: string };
  disabled?: boolean;
}

/**
 * Wrapper around shadcn/ui Checkbox for use-form-definition.
 *
 * This is a self-contained component that handles its own label and error display.
 * Use ignoreFieldWrapper: true in the form configuration.
 */
export const ShadcnCheckbox = forwardRef<HTMLButtonElement, ShadcnCheckboxProps>(
  ({ name, value, onChange, inlineLabel, error, disabled }, ref) => {
    const errorMessage = error?.message;

    return (
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          {/* Hidden input for native form submission */}
          <input type="hidden" name={name} value={value ? 'true' : 'false'} />
          <Checkbox
            ref={ref}
            id={name}
            checked={value}
            onCheckedChange={onChange}
            disabled={disabled}
            className={cn(errorMessage && 'border-destructive')}
          />
          {inlineLabel && (
            <Label
              htmlFor={name}
              className={cn(
                'cursor-pointer',
                errorMessage && 'text-destructive'
              )}
            >
              {inlineLabel}
            </Label>
          )}
        </div>
        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
    );
  }
);

ShadcnCheckbox.displayName = 'ShadcnCheckbox';
