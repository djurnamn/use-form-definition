import { forwardRef, InputHTMLAttributes } from "react";
import { FieldError } from "react-hook-form";
import { useFieldId } from "../core/utilities";

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  name: string;
  value?: number | string;
  onChange: (value: string) => void; // Keep as string to match form library expectations
  error?: FieldError;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ name, value, onChange, error, id, ...props }, ref) => {
    const fieldId = useFieldId(name, id);
    
    return (
      <input
        ref={ref}
        id={fieldId}
        type="number"
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

NumberInput.displayName = "NumberInput";

export default NumberInput;