import { forwardRef, InputHTMLAttributes } from "react";
import { FieldError } from "react-hook-form";
import { useFieldId } from "../core/utilities";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'checked' | 'value'> {
  name: string;
  value?: boolean;
  onChange: (value: boolean) => void;
  inlineLabel?: string;
  error?: FieldError;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ name, value, onChange, inlineLabel, error, id, ...props }, ref) => {
    const fieldId = useFieldId(name, id);

    const inputElement = (
      <input
        ref={ref}
        id={fieldId}
        type="checkbox"
        name={name}
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
    );

    // If inlineLabel is provided, wrap in label element
    if (inlineLabel) {
      return (
        <label>
          {inputElement}
          <span>{inlineLabel}</span>
        </label>
      );
    }

    return inputElement;
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;