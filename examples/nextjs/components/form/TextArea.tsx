import { forwardRef, TextareaHTMLAttributes } from "react";

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: { message?: string };
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ error, ...props }, ref) => {
    return <textarea ref={ref} {...props} />;
  }
);

TextArea.displayName = "TextArea";
