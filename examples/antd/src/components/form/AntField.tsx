import { Form } from 'antd';
import { ReactNode } from 'react';

export interface AntFieldProps {
  name: string;
  label?: string;
  error?: { message?: string };
  children: ReactNode;
}

/**
 * Ant Design Form.Item wrapper as Field component
 *
 * This component wraps input components with Ant Design's Form.Item,
 * providing label rendering and validation error display.
 *
 * Uses validateStatus and help props for error display.
 */
export function AntField({ label, error, children }: AntFieldProps) {
  const errorMessage = error?.message;

  return (
    <Form.Item
      label={label}
      validateStatus={errorMessage ? 'error' : undefined}
      help={errorMessage}
    >
      {children}
    </Form.Item>
  );
}
