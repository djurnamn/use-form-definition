import { Button, ButtonProps } from 'antd';
import { ReactNode } from 'react';

export interface AntSubmitButtonProps extends Omit<ButtonProps, 'htmlType'> {
  children?: ReactNode;
}

/**
 * Ant Design Button styled as form submit button
 *
 * Replaces the library's default HTML button with Ant Design's Button component.
 * Uses primary type and block layout by default.
 */
export function AntSubmitButton({
  children = 'Submit',
  ...props
}: AntSubmitButtonProps) {
  return (
    <Button
      htmlType="submit"
      type="primary"
      block
      {...props}
    >
      {children}
    </Button>
  );
}
