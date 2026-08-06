import { forwardRef, ReactNode, Ref } from "react";
import { FieldError } from "react-hook-form";
import { generateFieldId } from "../core/utilities";

export interface FieldProps<T = any> {
  label?: string;
  name?: string;
  id?: string;
  error?: FieldError;
  /** Per-field explanatory text, rendered under the control. The element carries
   * `id={fieldId}-description` so a custom input can point `aria-describedby` at it. */
  description?: string;
  className?: string;
  children: ReactNode;
}

const Field = <T,>(
  {
    label,
    name,
    id,
    error,
    description,
    className,
    children,
  }: FieldProps<T>,
  ref: Ref<T>
) => {
  // Error message is already parsed by useFormDefinition
  const errorMessage = error?.message || null;

  // Generate the same ID that the input component would use
  const fieldId = generateFieldId(name || '', id);

  return (
    <div className={className} data-field-name={name}>
      {label && (
        <label htmlFor={fieldId}>
          {label}
        </label>
      )}

      <div>
        {children}
      </div>

      {errorMessage && (
        <div id={`${name}-error`} role="alert" aria-live="polite">
          {errorMessage}
        </div>
      )}

      {description && (
        <div id={`${fieldId}-description`}>
          {description}
        </div>
      )}
    </div>
  );
};

export default forwardRef(Field) as <T>(
  props: FieldProps<T> & { ref?: Ref<T> }
) => ReturnType<typeof Field>;