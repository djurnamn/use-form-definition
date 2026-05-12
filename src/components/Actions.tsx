import { ReactNode } from "react";

export interface ActionsProps {
  children?: ReactNode;
  className?: string;
  [key: string]: any; // Custom props for user extensions
}

export function Actions({
  children = 'Submit',
  className,
  ...customProps
}: ActionsProps) {
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
