/**
 * Wire encodings for section value mirrors.
 *
 * A field in an inactive section renders no control; it renders a *mirror* - hidden
 * inputs carrying its current value - so the DOM's `FormData` stays complete, per field,
 * natively encoded. The contract that keeps the server oblivious to sections: **a mirror
 * posts entries that parse to the same value the mounted control's post would have** -
 * so `generateDataValidator` needs no section awareness at all.
 *
 * Encodings derive from the value's runtime type, which the kind's registered default
 * value anchors (a `checkbox` seeds `false`, a `multiselect` seeds `[]`, and
 * `registerFieldType` custom kinds declare theirs the same way):
 *
 * - `boolean`: the companion-pair encoding - `""` for false, `"", "on"` for true.
 *   Presence rather than absence, so an echoed `values` round trip re-seeds `false`
 *   instead of falling back to the definition default.
 * - arrays and plain objects: JSON - the repeater's and multiselect's wire convention,
 *   which their schemas already decode.
 * - strings and numbers: `String(value)`, exactly what the control posts.
 * - `undefined` / `null`: `""`, what an emptied control posts (`blankToUndefined`
 *   restores absence for coerced kinds server-side).
 * - `File` / `FileList` / `Blob`: no mirror. A file cannot ride a hidden input; this is
 *   every carry mechanism's boundary, stated rather than solved.
 *
 * React-free, so the `./server` entry could consume it if it ever needs to; the React
 * side renders the returned strings as hidden inputs marked `data-ufd-mirror`.
 */

/**
 * A custom wire encoding for a registered field kind, set through `registerFieldType`'s
 * `mirror` option. Return the entry value (or several, posted in order under the field's
 * name), or `null` for "this value cannot mirror - post nothing".
 */
export type MirrorEncoder = (value: unknown) => string | string[] | null;

const customMirrors: Record<string, MirrorEncoder> = {};

/**
 * Record a custom mirror encoding for a field kind. Called by `registerFieldType`; not
 * usually called directly.
 */
export const registerFieldTypeMirror = (
  fieldType: string,
  mirror: MirrorEncoder
): void => {
  customMirrors[fieldType] = mirror;
};

const isFileLike = (value: unknown): boolean =>
  (typeof File !== "undefined" && value instanceof File) ||
  (typeof FileList !== "undefined" && value instanceof FileList) ||
  (typeof Blob !== "undefined" && value instanceof Blob);

/**
 * The wire entries a mirror posts for this kind and value, or `null` for "no mirror".
 */
export const mirrorWireValues = (
  fieldType: string,
  value: unknown
): string[] | null => {
  const custom = customMirrors[fieldType];
  if (custom) {
    const encoded = custom(value);
    if (encoded === null) return null;
    return Array.isArray(encoded) ? encoded : [encoded];
  }

  if (isFileLike(value)) return null;
  if (typeof value === "boolean") return value ? ["", "on"] : [""];
  if (value === undefined || value === null) return [""];
  if (typeof value === "object") return [JSON.stringify(value)];
  return [String(value)];
};
