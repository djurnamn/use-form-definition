import { forwardRef, InputHTMLAttributes } from "react";
import { FieldError } from "react-hook-form";
import { useFieldId } from "../core/utilities";

export interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  type?: 'date' | 'datetime-local' | 'time' | 'month' | 'week';
  id?: string;
  error?: FieldError;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ name, value, onChange, type = "date", error, id, ...props }, ref) => {
    const fieldId = useFieldId(name, id);

    return (
      <input
        ref={ref}
        id={fieldId}
        type={type}
        name={name}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
    );
  }
);

DateInput.displayName = "DateInput";

export default DateInput;