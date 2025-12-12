import { forwardRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

export interface ShadcnTextareaProps
  extends React.ComponentProps<typeof Textarea> {}

/**
 * Wrapper around shadcn/ui Textarea for use-form-definition.
 *
 * This is a "naked" component - it only renders the textarea element.
 * The Field wrapper component handles labels and error display.
 */
export const ShadcnTextarea = forwardRef<
  HTMLTextAreaElement,
  ShadcnTextareaProps
>(({ ...props }, ref) => {
  return <Textarea ref={ref} {...props} />;
});

ShadcnTextarea.displayName = 'ShadcnTextarea';
