import { forwardRef, SelectHTMLAttributes, useEffect, useState } from "react";
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
  optionsCallback?: () => Promise<SelectOption[]>;
  placeholder?: string;
  error?: FieldError;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    name, 
    value, 
    onChange, 
    options: initialOptions = [], 
    optionsCallback,
    placeholder = "Select an option",
    error,
    id,
    ...props 
  }, ref) => {
    const fieldId = useFieldId(name, id);
    const [options, setOptions] = useState<SelectOption[]>(initialOptions);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (optionsCallback && !initialOptions.length) {
        let cancelled = false;
        setLoading(true);
        optionsCallback()
          .then((result) => {
            if (!cancelled) setOptions(result);
          })
          .catch((err) => {
            if (!cancelled) console.error(err);
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
        return () => {
          cancelled = true;
        };
      }
    }, [optionsCallback, initialOptions.length]);

    return (
      <select
        ref={ref}
        id={fieldId}
        name={name}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        disabled={loading || props.disabled}
        {...props}
      >
        <option value="">{loading ? "Loading..." : placeholder}</option>
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