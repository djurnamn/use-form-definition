import { ReactNode } from 'react';

export interface ShadcnLayoutContainerProps {
  children: ReactNode;
}

/**
 * Layout container for auto-rendered forms.
 *
 * Uses CSS grid with responsive 2-column layout on larger screens.
 */
export const ShadcnLayoutContainer = ({
  children,
}: ShadcnLayoutContainerProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  );
};
