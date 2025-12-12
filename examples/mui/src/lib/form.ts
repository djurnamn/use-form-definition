import { createFormDefinitionHook } from 'use-form-definition';
import {
  MuiTextField,
  MuiSelect,
  MuiCheckbox,
  MuiDatePicker,
  MuiAutocomplete,
  MuiLayoutContainer,
  MuiLayoutItem,
  MuiSubmitButton,
} from '@/components/form';

export const useFormDefinition = createFormDefinitionHook({
  components: {
    // MUI components handle their own labels and error states,
    // so we use ignoreFieldWrapper: true for all field types
    text: {
      component: MuiTextField,
      ignoreFieldWrapper: true,
      additionalProps: ['label'],
    },
    email: {
      component: MuiTextField,
      ignoreFieldWrapper: true,
      additionalProps: ['label'],
    },
    password: {
      component: MuiTextField,
      ignoreFieldWrapper: true,
      additionalProps: ['label'],
    },
    number: {
      component: MuiTextField,
      ignoreFieldWrapper: true,
      additionalProps: ['label'],
    },
    select: {
      component: MuiSelect,
      ignoreFieldWrapper: true,
      additionalProps: ['options', 'placeholder', 'label'],
    },
    textarea: {
      component: MuiTextField,
      ignoreFieldWrapper: true,
      additionalProps: ['multiline', 'rows', 'label'],
    },
    checkbox: {
      component: MuiCheckbox,
      ignoreFieldWrapper: true,
      additionalProps: ['inlineLabel'],
    },
    date: {
      component: MuiDatePicker,
      ignoreFieldWrapper: true,
      additionalProps: ['label'],
    },
    autocomplete: {
      component: MuiAutocomplete,
      ignoreFieldWrapper: true,
      additionalProps: ['options', 'placeholder', 'label'],
    },
  },
  formComponents: {
    // Use MUI Grid2 for layout instead of library defaults
    // This enables MUI's responsive breakpoint props (xs, sm, md, lg, xl)
    LayoutContainer: MuiLayoutContainer,
    LayoutItem: MuiLayoutItem,
    // Use MUI Button for submit instead of plain HTML button
    SubmitButton: MuiSubmitButton,
  },
});
