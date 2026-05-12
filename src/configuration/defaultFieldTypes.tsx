import TextInput, { TextInputProps } from "../components/TextInput";
import Select from "../components/Select";
import Textarea from "../components/Textarea";
import Checkbox from "../components/Checkbox";
import DateInput, { DateInputProps } from "../components/DateInput";
import NumberInput from "../components/NumberInput";
import Repeater from "../components/Repeater";

import { ComponentType } from "react";
import { ProcessedComponentConfig } from "../core/types";

/**
 * Default field type mappings for built-in HTML5 form elements.
 *
 * Entries can be either a bare `ComponentType` (for the common case) or a
 * `ProcessedComponentConfig` object (when a field type needs `additionalProps`,
 * `ignoreFieldWrapper`, or `injectFormConfig`). `createFormConfig` normalises
 * both shapes to `ProcessedComponentConfig` via `toProcessedComponentConfig`.
 *
 * Users override these by passing their own `components: { ... }` to the hook;
 * the override is merged into the default map.
 */
export const getDefaultFieldTypes = (): Record<string, ComponentType<any> | ProcessedComponentConfig> => ({
  // Basic text inputs
  text: TextInput,
  email: (props: TextInputProps) => <TextInput {...props} type="email" />,
  password: (props: TextInputProps) => <TextInput {...props} type="password" />,
  url: (props: TextInputProps) => <TextInput {...props} type="url" />,
  tel: (props: TextInputProps) => <TextInput {...props} type="tel" />,
  search: (props: TextInputProps) => <TextInput {...props} type="search" />,

  // Number inputs
  number: NumberInput,
  range: (props: TextInputProps) => <TextInput {...props} type="range" />,

  // Date/time inputs
  date: DateInput,
  "datetime-local": (props: DateInputProps) => <DateInput {...props} type="datetime-local" />,
  time: (props: DateInputProps) => <DateInput {...props} type="time" />,
  month: (props: DateInputProps) => <DateInput {...props} type="month" />,
  week: (props: DateInputProps) => <DateInput {...props} type="week" />,

  // Text area
  textarea: Textarea,

  // Selections
  select: {
    component: Select,
    ignoreFieldWrapper: false,
    additionalProps: ['options', 'placeholder']
  },
  checkbox: {
    component: Checkbox,
    ignoreFieldWrapper: false,
    additionalProps: ['inlineLabel'],
  },
  radio: (props: TextInputProps) => <TextInput {...props} type="radio" />,

  // Array/complex fields
  repeater: {
    component: Repeater,
    ignoreFieldWrapper: true,
    additionalProps: ['fields', 'hideHeader', 'disableAddRow', 'disableRemoveRow', 'maxRows', 'label'],
    injectFormConfig: true,
  },

  // File inputs
  file: (props: TextInputProps) => <TextInput {...props} type="file" />,

  // Other HTML5 inputs
  color: (props: TextInputProps) => <TextInput {...props} type="color" />,
  hidden: (props: TextInputProps) => <TextInput {...props} type="hidden" />,
});