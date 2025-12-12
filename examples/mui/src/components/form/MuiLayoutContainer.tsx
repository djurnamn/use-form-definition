import { ReactNode } from 'react';
import Grid from '@mui/material/Grid2';

export interface MuiLayoutContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * MUI-based layout container for form fields
 *
 * Replaces the library's default div-based grid with MUI's Grid2 component.
 * Uses a 12-column grid system consistent with MUI conventions.
 * The spacing={2} prop handles all vertical and horizontal gaps between fields.
 */
export function MuiLayoutContainer({ children, className }: MuiLayoutContainerProps) {
  return (
    <Grid container spacing={2} className={className}>
      {children}
    </Grid>
  );
}
