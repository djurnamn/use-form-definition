import { ReactNode, FormHTMLAttributes } from "react";
import { FieldValues } from "react-hook-form";
import { FormAction } from "../core/types";

/**
 * Basic Form component - a styled form wrapper
 *
 * This component is provided as a customizable starting point. For full
 * auto-rendering capabilities, use RenderedForm from useFormDefinition().
 *
 * @example Auto-render all fields
 * ```tsx
 * const { RenderedForm } = useFormDefinition(definition);
 *
 * return <RenderedForm onSubmit={handleSubmit} />;
 * ```
 *
 * @example Custom field rendering with Form component
 * ```tsx
 * const { form, RenderedField, Form, Actions } = useFormDefinition(definition);
 *
 * return (
 *   <Form onSubmit={form.handleSubmit(onSubmit)}>
 *     <div className="grid grid-cols-2 gap-4">
 *       <RenderedField name="firstName" />
 *       <RenderedField name="lastName" />
 *       <Actions>Save</Actions>
 *     </div>
 *   </Form>
 * );
 * ```
 */
export interface FormProps<T extends FieldValues> extends Omit<FormHTMLAttributes<HTMLFormElement>, 'action'> {
  action?: FormAction<T> | string;
  children?: ReactNode;
  className?: string;
}

export function Form<T extends FieldValues>({
  action,
  children,
  className,
  ...props
}: FormProps<T>) {
  return (
    <form
      className={className}
      action={typeof action === 'string' ? action : undefined}
      {...props}
    >
      {children}
    </form>
  );
}