import { ReactNode } from "react";

/**
 * Status of a form-level message. Drives the default component's ARIA role:
 * `error` announces assertively via `role="alert"`; the others are polite `role="status"`.
 */
export type FormMessageStatus = "error" | "success" | "info";

export interface FormMessageProps {
  /** The whole-form message to display (e.g. "reset link invalid or expired"). */
  message: string;
  /** Severity of the message. Defaults to `error`. */
  status?: FormMessageStatus;
  className?: string;
  children?: ReactNode;
}

/**
 * Default form-level message region.
 *
 * Rendered inside the `<form>`, above the fields, by `RenderedForm` whenever the form
 * carries a whole-form message - either a server-action envelope `message` or a
 * client-side `root` error from react-hook-form. It is a sibling to per-field errors:
 * where `Field` renders the error for one input, `FormMessage` renders the message that
 * belongs to the form as a whole (a rate-limit refusal, an expired token, "invalid
 * credentials", and so on).
 *
 * Override it per binding by registering your own component in the form config's
 * `components.FormMessage` slot (via `formComponents` on `createFormDefinitionHook`, or
 * `config.components` at the call site) - the same way `Field` and `Actions` are supplied.
 * A registered component receives `message` and `status`. Set the slot to `false` to opt
 * out of the region entirely.
 *
 * This default is intentionally minimal and unstyled: a single element carrying an
 * accessible role (`alert` for errors, `status` otherwise) plus `data-status` /
 * `data-form-message` hooks for styling.
 */
export function FormMessage({ message, status = "error", className, children }: FormMessageProps) {
  if (!message) return null;

  return (
    <div
      className={className}
      data-form-message=""
      data-status={status}
      role={status === "error" ? "alert" : "status"}
      aria-live={status === "error" ? "assertive" : "polite"}
    >
      {children ?? message}
    </div>
  );
}
