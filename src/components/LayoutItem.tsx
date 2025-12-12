import { ReactNode } from "react";

export interface LayoutItemProps {
  children: ReactNode;
  className?: string;
  [key: string]: any; // Custom props for user extensions
}

export function LayoutItem({ 
  children, 
  className, 
  half, // Example custom prop - not in the interface but handled by component
  ...customProps 
}: LayoutItemProps) {
  const style: React.CSSProperties = {
    // Handle the 'half' prop as an example of custom layout behavior
    gridColumn: half ? 'span 1' : 'span 2'
  };

  return (
    <div className={className} style={style} {...customProps}>
      {children}
    </div>
  );
}