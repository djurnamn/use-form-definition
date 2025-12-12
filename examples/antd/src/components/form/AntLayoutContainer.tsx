import { Row } from 'antd';
import { ReactNode } from 'react';

export interface AntLayoutContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Ant Design Row-based layout container for form fields
 *
 * Replaces the library's default div-based grid with Ant Design's Row component.
 * Uses gutter [16, 16] for consistent horizontal and vertical spacing.
 */
export function AntLayoutContainer({ children, className }: AntLayoutContainerProps) {
  return (
    <Row gutter={[16, 16]} className={className}>
      {children}
    </Row>
  );
}
