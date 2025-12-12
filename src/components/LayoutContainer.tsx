import { ReactNode } from "react";

export interface LayoutContainerProps {
  children: ReactNode;
  className?: string;
}

export function LayoutContainer({ children, className }: LayoutContainerProps) {
  const style: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}