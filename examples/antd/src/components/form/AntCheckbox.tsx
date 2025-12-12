import { Checkbox, CheckboxProps, CheckboxRef } from 'antd';
import { forwardRef } from 'react';

export interface AntCheckboxProps extends Omit<CheckboxProps, 'checked'> {
  inlineLabel?: string;
  value?: boolean;
}

/**
 * Ant Design Checkbox wrapped for use-form-definition
 *
 * Uses inlineLabel for the checkbox label text.
 * This component handles its own label (inline with checkbox),
 * so it uses ignoreFieldWrapper: true in the config.
 */
export const AntCheckbox = forwardRef<CheckboxRef, AntCheckboxProps>(
  ({ inlineLabel, value, onChange, name, ...props }, ref) => {
    return (
      <Checkbox
        {...props}
        name={name}
        checked={!!value}
        onChange={onChange}
        ref={ref}
      >
        {inlineLabel}
      </Checkbox>
    );
  }
);

AntCheckbox.displayName = 'AntCheckbox';
