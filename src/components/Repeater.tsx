import React, { forwardRef, useEffect, useState } from "react";
import { FieldError } from "react-hook-form";
import { FormDefinition, FormFieldDefinition, FormConfig, InternalComponentProps, NestedFieldRenderer } from "../core/types";
import { getDefaultValueForField } from "../core/utilities";
import { getNestedError, NestedFieldError, NestedFieldErrorMap } from "../core/nested-errors";

export type { NestedFieldRenderer };

/**
 * Row data type - represents a single row in the repeater
 */
export type RepeaterRowData = Record<string, unknown>;

/**
 * Repeater component props
 *
 * Extends `Partial<InternalComponentProps>` to declare the library-injected props
 * (`__formConfig`, `__renderNestedField`, `__getDefaultValueForField`,
 * `__resolveFieldLabel`) that arrive when this component is registered with
 * `injectFormConfig: true`.
 */
export interface RepeaterProps extends Partial<InternalComponentProps> {
  name: string;
  value?: RepeaterRowData[];
  onChange?: (value: RepeaterRowData[]) => void;
  fields: FormDefinition;
  /**
   * The field's error. A flat `FieldError` carries a whole-list message (`minRows`,
   * say); item-level errors arrive as a nested tree - an array of per-row error maps -
   * and each cell's own error renders at the cell. `true` is the legacy "mark every
   * cell, no message" form.
   */
  error?: FieldError | NestedFieldError | boolean;
  label?: string;
  hideHeader?: boolean;
  disableAddRow?: boolean;
  disableRemoveRow?: boolean;
  maxRows?: number;
  className?: string;

  // Custom render overrides (optional)
  renderField?: (
    fieldKey: string,
    fieldDefinition: FormFieldDefinition,
    value: unknown,
    onChange: (value: unknown) => void,
    error?: FieldError | boolean,
    rowIndex?: number
  ) => React.ReactNode;
  renderAddButton?: () => React.ReactNode;
  renderRemoveButton?: (rowIndex: number) => React.ReactNode;
}

/**
 * Repeater field component
 *
 * This component renders a table of form fields where each row represents an item
 * and each column represents a field. It supports all the same field types and
 * validation as the main form system.
 *
 * When used with useFormDefinition, the component automatically uses the same
 * component configuration to render nested fields. When used standalone, you can
 * provide a custom renderField function.
 */
export const Repeater = forwardRef<HTMLDivElement, RepeaterProps>(
  (
    {
      name,
      value = [],
      onChange,
      fields,
      error,
      label,
      hideHeader = false,
      disableAddRow = false,
      disableRemoveRow = false,
      maxRows,
      className,
      renderField: customRenderField,
      renderAddButton,
      renderRemoveButton,
      // Injected props
      __formConfig,
      __renderNestedField,
      __getDefaultValueForField,
      __resolveFieldLabel,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState<RepeaterRowData[]>(value);

    // Sync with external value changes
    useEffect(() => {
      setInternalValue(value);
    }, [value]);

    // Handle value changes
    const handleChange = (newValue: RepeaterRowData[]) => {
      setInternalValue(newValue);
      onChange?.(newValue);
    };

    // Get default value for a field - use injected utility or fall back to imported one
    const getDefaultValue = __getDefaultValueForField ?? getDefaultValueForField;

    // Add a new row
    const handleAddRow = () => {
      if (disableAddRow) return;
      if (maxRows && internalValue.length >= maxRows) return;

      // Create empty row with default values from field definitions
      const newRow = Object.keys(fields).reduce<RepeaterRowData>(
        (row, fieldKey) => {
          const field = fields[fieldKey];
          row[fieldKey] = getDefaultValue(field);
          return row;
        },
        {}
      );

      handleChange([...internalValue, newRow]);
    };

    // Remove a row
    const handleRemoveRow = (index: number) => {
      if (disableRemoveRow) return;

      const newValue = internalValue.filter((_, i) => i !== index);
      handleChange(newValue);
    };

    // Handle field value change within a row
    const handleFieldChange = (
      rowIndex: number,
      fieldKey: string,
      fieldValue: unknown
    ) => {
      const newValue = [...internalValue];
      newValue[rowIndex] = {
        ...newValue[rowIndex],
        [fieldKey]: fieldValue,
      };
      handleChange(newValue);
    };

    // Default field renderer using injected config
    const defaultRenderField = (
      fieldKey: string,
      fieldDefinition: FormFieldDefinition,
      fieldValue: unknown,
      onFieldChange: (value: unknown) => void,
      fieldError?: FieldError | boolean,
      rowIndex?: number
    ): React.ReactNode => {
      // If we have the injected renderer, use it
      if (__renderNestedField) {
        const namePrefix = `${name}[${rowIndex}].${fieldKey}`;
        return __renderNestedField(
          fieldKey,
          fieldDefinition,
          fieldValue,
          onFieldChange,
          fieldError as FieldError | undefined,
          namePrefix
        );
      }

      // Fallback: render a basic input (for standalone usage without form hook)
      console.warn(
        `Repeater: No field renderer available for "${fieldKey}". ` +
          `For automatic field rendering, use the Repeater with useFormDefinition.`
      );

      const inputType =
        fieldDefinition.type === "number" ? "number" : "text";

      return (
        <input
          key={`${name}[${rowIndex}].${fieldKey}`}
          type={inputType}
          name={`${name}[${rowIndex}].${fieldKey}`}
          value={String(fieldValue ?? "")}
          onChange={(e) => {
            const val =
              inputType === "number"
                ? e.target.value
                  ? Number(e.target.value)
                  : ""
                : e.target.value;
            onFieldChange(val);
          }}
          style={{ width: "100%" }}
        />
      );
    };

    // Use custom renderer or default
    const fieldRenderer = customRenderField || defaultRenderField;

    // Default add button - minimal styling, consumers should style via CSS
    const defaultAddButton = () => (
      <button
        type="button"
        onClick={handleAddRow}
        disabled={disableAddRow || (maxRows !== undefined && internalValue.length >= maxRows)}
      >
        +
      </button>
    );

    // Default remove button - minimal styling, consumers should style via CSS
    const defaultRemoveButton = (rowIndex: number) => (
      <button
        type="button"
        onClick={() => handleRemoveRow(rowIndex)}
        disabled={disableRemoveRow}
      >
        ×
      </button>
    );

    const fieldKeys = Object.keys(fields);

    return (
      <div ref={ref} className={className}>
        {label && <label>{label}</label>}

        <table>
          {!hideHeader && (
            <thead>
              <tr>
                {fieldKeys.map((fieldKey) => (
                  <th key={fieldKey}>
                    {/* Prefer the injected resolver so translation-key labels render translated;
                        fall back to the raw label (or the field key) for standalone use. */}
                    {__resolveFieldLabel?.(fieldKey, fields[fieldKey]) ??
                      (fields[fieldKey].label || fieldKey)}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
          )}

          <tbody>
            {internalValue.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {fieldKeys.map((fieldKey) => {
                  const fieldDefinition = fields[fieldKey];
                  const fieldValue = row[fieldKey];

                  // This cell's own error, out of the nested tree (see the `error` prop).
                  const cellError =
                    typeof error === "object" ? getNestedError(error, [rowIndex, fieldKey]) : undefined;
                  const fieldError = error === true ? true : cellError;

                  return (
                    <td key={fieldKey}>
                      {fieldRenderer(
                        fieldKey,
                        fieldDefinition,
                        fieldValue,
                        (newValue) =>
                          handleFieldChange(rowIndex, fieldKey, newValue),
                        fieldError,
                        rowIndex
                      )}
                      {/* The id matches the aria-describedby the built-in controls point
                          at for this cell's name, so the message is announced with it. */}
                      {cellError?.message && (
                        <span
                          id={`${name}[${rowIndex}].${fieldKey}-error`}
                          role="alert"
                          style={{ color: "red" }}
                        >
                          {cellError.message}
                        </span>
                      )}
                    </td>
                  );
                })}

                <td>
                  {!disableRemoveRow &&
                    (renderRemoveButton
                      ? renderRemoveButton(rowIndex)
                      : defaultRemoveButton(rowIndex))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!disableAddRow &&
          (!maxRows || internalValue.length < maxRows) &&
          (renderAddButton ? renderAddButton() : defaultAddButton())}

        {/* The whole-list message: a flat error carries it directly (minRows, maxRows,
            required); an item-error tree may carry one under `root`. Item errors render
            at their cells above, never here. */}
        {(() => {
          if (!error || typeof error !== "object") return null;
          const ownMessage =
            (error as FieldError).message ??
            ((error as NestedFieldErrorMap).root as FieldError | undefined)?.message;
          return ownMessage ? (
            <span role="alert" style={{ color: "red" }}>
              {ownMessage}
            </span>
          ) : null;
        })()}

        {/* Hidden input with JSON stringified value for form submission */}
        <input type="hidden" name={name} value={JSON.stringify(internalValue)} />
      </div>
    );
  }
);

Repeater.displayName = "Repeater";

export default Repeater;
