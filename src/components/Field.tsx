import { forwardRef, ReactNode, Ref } from "react";
import { FieldError } from "react-hook-form";
import { generateFieldId } from "../core/utilities";

export interface FieldProps<T = any> {
  label?: string;
  name?: string;
  id?: string;
  error?: FieldError;
  className?: string;
  children: ReactNode;
}

const Field = <T,>(
  {
    label,
    name,
    id,
    error,
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
    </div>
  );
};

export default forwardRef(Field) as <T>(
  props: FieldProps<T> & { ref?: Ref<T> }
) => ReturnType<typeof Field>;