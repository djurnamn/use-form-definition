import type { FieldError } from "react-hook-form";

/**
 * The error value a structured field receives.
 *
 * A flat field's error is a single react-hook-form `FieldError`. A structured field -
 * the built-in repeater, or a custom kind registered with a `generator` returning an
 * array or object schema - gets the *nested* error tree instead: the resolver roots
 * each item issue under the field's top-level key, so an invalid repeater cell lands
 * at `error[rowIndex][columnKey]` with the same translated `message` a flat field
 * would carry. Item errors are therefore addressable without reading
 * `formState.errors` behind the library's back; `getNestedError` walks the tree.
 *
 * Every `message` in the tree is already display-ready: `RenderedField` translates
 * the whole tree before passing it down, exactly as it always has for flat errors.
 */
export interface NestedFieldErrorMap {
  [key: string]: NestedFieldError | undefined;
}
export interface NestedFieldErrorList extends Array<NestedFieldError | undefined> {}
export type NestedFieldError = FieldError | NestedFieldErrorMap | NestedFieldErrorList;

/**
 * The `FieldError` at a path inside a structured field's error tree, or `undefined` -
 * when there is no error there, or when the node at the path is an intermediate
 * branch (a whole row, say) rather than a leaf error.
 *
 * The path is relative to the field: `getNestedError(error, [0, 'level'])` (or the
 * string form `'0.level'`) answers "what is wrong with row 0's level cell".
 *
 * @example
 * ```tsx
 * function MyStructuredField({ error }: { error?: NestedFieldError }) {
 *   const cellError = getNestedError(error, [rowIndex, 'level']);
 *   return <span role="alert">{cellError?.message}</span>;
 * }
 * ```
 */
export const getNestedError = (
  error: NestedFieldError | boolean | undefined,
  path: string | ReadonlyArray<string | number>
): FieldError | undefined => {
  if (!error || typeof error !== "object") return undefined;

  const segments = typeof path === "string" ? path.split(".") : path;
  let node: unknown = error;
  for (const segment of segments) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string | number, unknown>)[segment as string | number];
  }

  if (!node || typeof node !== "object") return undefined;
  const candidate = node as Partial<FieldError>;
  // A leaf error carries a `type` and usually a `message`; a branch node (a row's
  // map of cell errors) carries neither as a string.
  return typeof candidate.message === "string" || typeof candidate.type === "string"
    ? (candidate as FieldError)
    : undefined;
};
