import { forwardRef, InputHTMLAttributes } from "react";
import { useTranslations } from "next-intl";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Inline label - translation key that will be translated via useTranslations */
  inlineLabel?: string;
  error?: { message?: string };
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ inlineLabel, error, ...props }, ref) => {
    const t = useTranslations();

    return (
      <div>
        <label>
          <input ref={ref} type="checkbox" {...props} />
          {inlineLabel && <span>{t(inlineLabel)}</span>}
        </label>
        {error?.message && (
          <span role="alert" style={{ color: "red", display: "block" }}>
            {error.message}
          </span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
