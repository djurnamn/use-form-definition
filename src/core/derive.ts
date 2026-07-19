/**
 * Derive-transform resolution for `deriveFrom` fields.
 *
 * A field definition can declare `deriveFrom: "<sibling key>"` to mirror a transformed
 * copy of a sibling field's value while the target field is unclaimed (see the derivation
 * effect in `useFormDefinition`). The *transform* applied to the source value is not part
 * of the definition - a definition shared with server code can carry a field name where it
 * could never carry a function - so it is resolved at runtime, in order:
 *
 * 1. a per-field `deriveTransform` function on the field definition (client-side only);
 * 2. a kind-level transform registered for the field's `type` via
 *    `registerFieldType(type, { deriveTransform })` (or `registerDeriveTransform`);
 * 3. identity - deriving a plain text field from another verbatim is coherent.
 *
 * Deliberately React-free, like `default-values.ts`: the registry rides along in the
 * server bundle (registrations run wherever shared config modules are imported) but is
 * only ever *consulted* by the client-side derivation effect. Server validation treats
 * `deriveFrom` as inert.
 */

/** Transform applied to the source field's value before mirroring it into the target. */
export type DeriveTransform = (value: unknown) => unknown;

const identity: DeriveTransform = (value) => value;

/**
 * Kind-level derive transforms, keyed by field type. A module-level registry, matching
 * the other extension points (`registerFieldType` / `registerFieldSchemaGenerator` /
 * `registerPattern`): field kinds are static app config, registered once at import time.
 */
const kindDeriveTransforms: Record<string, DeriveTransform> = {};

/**
 * Register the derive transform for a field kind. Usually reached through
 * `registerFieldType(type, { deriveTransform })`; exported standalone so a transform can
 * be attached to a kind whose validation is already registered (including built-ins).
 */
export const registerDeriveTransform = (
  fieldType: string,
  transform: DeriveTransform
): void => {
  kindDeriveTransforms[fieldType] = transform;
};

/**
 * Resolve the transform for a derived field: per-field function, else the kind-level
 * registration, else identity.
 */
export const resolveDeriveTransform = (field: {
  type: string;
  deriveTransform?: unknown;
}): DeriveTransform => {
  if (typeof field.deriveTransform === "function") {
    return field.deriveTransform as DeriveTransform;
  }
  return kindDeriveTransforms[field.type] ?? identity;
};
