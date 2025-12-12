import { forwardRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SelectOption {
  value: string;
  label: string;
}

export interface ShadcnSelectProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Wrapper around shadcn/ui Select for use-form-definition.
 *
 * Includes a hidden input for native form submission support.
 * This is a "naked" component - the Field wrapper handles labels and errors.
 */
export const ShadcnSelect = forwardRef<HTMLButtonElement, ShadcnSelectProps>(
  (
    { name, value, onChange, options = [], placeholder = 'Select...', disabled },
    ref
  ) => {
    return (
      <>
        {/* Hidden input for native form submission */}
        <input type="hidden" name={name} value={value ?? ''} />
        <Select
          value={value}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger ref={ref}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    );
  }
);

ShadcnSelect.displayName = 'ShadcnSelect';
