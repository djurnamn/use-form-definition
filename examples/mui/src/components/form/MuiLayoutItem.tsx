import { ReactNode } from 'react';
import Grid from '@mui/material/Grid2';

export interface MuiLayoutItemProps {
  children: ReactNode;
  className?: string;
  /**
   * Number of columns to span on extra-small screens (0-599px)
   * MUI Grid2 uses a 12-column system
   * @default 12 (full width)
   */
  xs?: number;
  /**
   * Number of columns to span on small screens (600-899px)
   */
  sm?: number;
  /**
   * Number of columns to span on medium screens (900-1199px)
   */
  md?: number;
  /**
   * Number of columns to span on large screens (1200-1535px)
   */
  lg?: number;
  /**
   * Number of columns to span on extra-large screens (1536px+)
   */
  xl?: number;
}

/**
 * MUI-based layout item for individual form fields
 *
 * Replaces the library's default div with `half` prop, using MUI's Grid2
 * responsive breakpoint props instead (xs, sm, md, lg, xl).
 *
 * This demonstrates how to customize layout props for your UI library.
 * Instead of the generic `half: true`, use MUI's familiar grid system:
 *
 * @example
 * // Library default pattern
 * layout: { half: true }
 *
 * // MUI pattern - more expressive and responsive
 * layout: { xs: 12, sm: 6 }           // Full on mobile, half on tablet+
 * layout: { xs: 12, sm: 6, md: 4 }    // Responsive thirds on desktop
 * layout: { xs: 12 }                   // Always full width
 */
export function MuiLayoutItem({
  children,
  className,
  xs = 12, // Default to full width
  sm,
  md,
  lg,
  xl,
}: MuiLayoutItemProps) {
  return (
    <Grid
      className={className}
      size={{
        xs,
        ...(sm !== undefined && { sm }),
        ...(md !== undefined && { md }),
        ...(lg !== undefined && { lg }),
        ...(xl !== undefined && { xl }),
      }}
    >
      {children}
    </Grid>
  );
}
