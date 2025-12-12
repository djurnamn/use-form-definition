import { Input } from 'antd';
import { TextAreaProps, TextAreaRef } from 'antd/es/input/TextArea';
import { forwardRef } from 'react';

const { TextArea } = Input;

/**
 * Ant Design TextArea wrapped for use-form-definition
 *
 * This is a "naked" textarea component - the Field wrapper (Form.Item)
 * handles label and error display.
 */
export const AntTextArea = forwardRef<TextAreaRef, TextAreaProps>(
  ({ rows = 4, ...props }, ref) => {
    return <TextArea {...props} ref={ref} rows={rows} />;
  }
);

AntTextArea.displayName = 'AntTextArea';
