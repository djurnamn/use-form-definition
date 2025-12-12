import { forwardRef, InputHTMLAttributes } from "react";
import { FieldError } from "react-hook-form";
import { useFieldId } from "../core/utilities";

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  error?: FieldError;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ name, value, onChange, error, type = "text", id, ...props }, ref) => {
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

TextInput.displayName = "TextInput";

export default TextInput;