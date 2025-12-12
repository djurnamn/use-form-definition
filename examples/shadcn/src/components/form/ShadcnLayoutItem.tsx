import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ShadcnLayoutItemProps {
  children: ReactNode;
  half?: boolean;
}

/**
 * Layout item for controlling field width in auto-rendered forms.
 *
 * By default, fields span the full width (2 columns).
 * Use half: true in the field definition's layout prop to make it half width.
 */
export const ShadcnLayoutItem = ({ children, half }: ShadcnLayoutItemProps) => {
  return (
    <div className={cn(half ? 'sm:col-span-1' : 'sm:col-span-2')}>
      {children}
    </div>
  );
};
