import { ReactNode } from "react";
import { FieldError } from "react-hook-form";

export interface FieldProps {
  name: string;
  label?: string;
  error?: FieldError;
  children: ReactNode;
}

export function Field({ name, label, error, children }: FieldProps) {
  return (
    <div>
      {label && <label htmlFor={name}>{label}</label>}
      {children}
      {error && (
        <span role="alert" style={{ color: "red" }}>
          {error.message}
        </span>
      )}
    </div>
  );
}
