import { Col } from 'antd';
import { ReactNode } from 'react';

export interface AntLayoutItemProps {
  children: ReactNode;
  className?: string;
  /**
   * Number of columns to span on extra-small screens (< 576px)
   * Ant Design grid uses a 24-column system
   * @default 24 (full width)
   */
  xs?: number;
  /**
   * Number of columns to span on small screens (>= 576px)
   */
  sm?: number;
  /**
   * Number of columns to span on medium screens (>= 768px)
   */
  md?: number;
  /**
   * Number of columns to span on large screens (>= 992px)
   */
  lg?: number;
  /**
   * Number of columns to span on extra-large screens (>= 1200px)
   */
  xl?: number;
  /**
   * Number of columns to span on extra-extra-large screens (>= 1600px)
   */
  xxl?: number;
}

/**
 * Ant Design Col-based layout item for individual form fields
 *
 * Replaces the library's default div with `half` prop, using Ant Design's
 * responsive breakpoint props instead (xs, sm, md, lg, xl, xxl).
 *
 * Note: Ant Design uses a 24-column grid system (vs MUI's 12-column).
 *
 * @example
 * // Library default pattern
 * layout: { half: true }
 *
 * // Ant Design pattern - more expressive and responsive
 * layout: { xs: 24, sm: 12 }           // Full on mobile, half on tablet+
 * layout: { xs: 24, sm: 12, md: 8 }    // Responsive thirds on desktop
 * layout: { xs: 24 }                   // Always full width
 */
export function AntLayoutItem({
  children,
  className,
  xs = 24, // Default to full width
  sm,
  md,
  lg,
  xl,
  xxl,
}: AntLayoutItemProps) {
  return (
    <Col
      className={className}
      xs={xs}
      sm={sm}
      md={md}
      lg={lg}
      xl={xl}
      xxl={xxl}
    >
      {children}
    </Col>
  );
}
