import { forwardRef, SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  error?: { message?: string };
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options = [], error, ...props }, ref) => {
    return (
      <select ref={ref} {...props}>
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);

Select.displayName = "Select";
