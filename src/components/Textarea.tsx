import { forwardRef, TextareaHTMLAttributes } from "react";
import { FieldError } from "react-hook-form";
import { useFieldId } from "../core/utilities";

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  id?: string;
  error?: FieldError;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ name, value, onChange, error, id, ...props }, ref) => {
    const fieldId = useFieldId(name, id);

    return (
      <textarea
        ref={ref}
        id={fieldId}
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

Textarea.displayName = "Textarea";

export default Textarea;