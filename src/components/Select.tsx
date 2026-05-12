import { forwardRef, SelectHTMLAttributes } from "react";
import { FieldError } from "react-hook-form";
import { useFieldId } from "../core/utilities";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  name: string;
  value?: string | number;
  onChange: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  error?: FieldError;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    name,
    value,
    onChange,
    options = [],
    placeholder = "Select an option",
    error,
    id,
    ...props
  }, ref) => {
    const fieldId = useFieldId(name, id);

    return (
      <select
        ref={ref}
        id={fieldId}
        name={name}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      >
        <option value="">{placeholder}</option>
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

export default Select;
