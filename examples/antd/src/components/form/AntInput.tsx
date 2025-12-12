import { Input, InputProps, InputRef } from 'antd';
import { forwardRef } from 'react';

/**
 * Ant Design Input wrapped for use-form-definition
 *
 * This is a "naked" input component - the Field wrapper (Form.Item)
 * handles label and error display.
 */
export const AntInput = forwardRef<InputRef, InputProps>(
  (props, ref) => {
    return <Input {...props} ref={ref} />;
  }
);

AntInput.displayName = 'AntInput';
