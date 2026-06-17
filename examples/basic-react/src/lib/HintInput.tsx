import type { InputHTMLAttributes } from 'react';
import type { FieldError } from 'react-hook-form';

/**
 * A text input that renders an optional hint beneath the field.
 *
 * `helpText` is a custom runtime prop, not one of the library's standard field
 * props. Registering this component with `additionalProps: ['helpText']` (see
 * lib/form.ts) lets the value flow through `<RenderedField helpText="..." />` at
 * runtime; typing the hook with `{ helpText?: string }` (see ContactPage) makes
 * it compile-checked, so a typo or wrong value type is a build error.
 */
export interface HintInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  error?: FieldError;
  /** Custom forwarded extra: a hint shown under the input. */
  helpText?: string;
}

export function HintInput({
  name,
  value,
  onChange,
  error,
  helpText,
  type = 'text',
  ...props
}: HintInputProps) {
  return (
    <>
      <input
        id={name}
        name={name}
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={!!error}
        aria-describedby={helpText ? `${name}-hint` : undefined}
        {...props}
      />
      {helpText && (
        <small id={`${name}-hint`} style={{ display: 'block', opacity: 0.7 }}>
          {helpText}
        </small>
      )}
    </>
  );
}
