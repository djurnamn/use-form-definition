import { createFormDefinitionHook } from 'use-form-definition';
import {
  AntInput,
  AntTextArea,
  AntSelect,
  AntCheckbox,
  AntDatePicker,
  AntField,
  AntLayoutContainer,
  AntLayoutItem,
  AntSubmitButton,
} from '@/components/form';

export const useFormDefinition = createFormDefinitionHook({
  components: {
    // Standard input components - wrapped by AntField (Form.Item)
    text: AntInput,
    email: AntInput,
    password: AntInput,
    number: AntInput,
    textarea: {
      component: AntTextArea,
      additionalProps: ['rows'],
    },
    // Select and DatePicker need additionalProps for options/placeholder
    select: {
      component: AntSelect,
      additionalProps: ['options', 'placeholder'],
    },
    date: {
      component: AntDatePicker,
      additionalProps: ['placeholder'],
    },
    // Checkbox handles its own inline label, so it ignores the Field wrapper
    checkbox: {
      component: AntCheckbox,
      ignoreFieldWrapper: true,
      additionalProps: ['inlineLabel'],
    },
  },
  formComponents: {
    // Use Ant Design Form.Item as the Field wrapper
    Field: AntField,
    // Use Ant Design Row/Col grid for layout (24-column system)
    LayoutContainer: AntLayoutContainer,
    LayoutItem: AntLayoutItem,
    // Use Ant Design Button for submit
    SubmitButton: AntSubmitButton,
  },
});
