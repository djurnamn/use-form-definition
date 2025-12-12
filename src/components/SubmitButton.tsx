import { ReactNode } from "react";

export interface SubmitButtonProps {
  children?: ReactNode;
  className?: string;
  [key: string]: any; // Custom props for user extensions
}

export function SubmitButton({ 
  children = 'Submit',
  className,
  ...customProps 
}: SubmitButtonProps) {
  return (
    <button 
      type="submit" 
      className={className}
      {...customProps}
    >
      {children}
    </button>
  );
}