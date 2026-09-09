import { FormDefinition } from "./types";

/**
 * A form's partition into named sections: section name to the definition keys it
 * contains. Insertion order is the declared order - the same convention the definition
 * object itself uses for zero-config render order - so "first section with errors" is
 * well defined and `sectionsWithErrors` reports in it.
 *
 * Purely presentational: the definition knows nothing about sections, the generated
 * schema is unchanged, and a field listed in no section simply renders as always-visible
 * content. Navigation (which section is current, tabs, wizard steps, gating) stays app
 * state; the library only consumes membership.
 */
export type FormSections<T extends FormDefinition = FormDefinition> = Record<
  string,
  ReadonlyArray<Extract<keyof T, string>>
>;

/**
 * The section that declares a field, or `undefined` for a field in no section.
 * First match wins for a field listed twice (declaring one twice is a mistake the
 * dev-mode drift check surfaces; the runtime stays deterministic about it).
 */
export const sectionOf = (
  sections: FormSections,
  fieldKey: string
): string | undefined => {
  for (const [name, fields] of Object.entries(sections)) {
    if (fields.includes(fieldKey)) return name;
  }
  return undefined;
};

/**
 * The sections carrying at least one of these errors, in declared order - for tab
 * badges, and for "jump to the first failing section" navigation. Exported from the
 * `./server` entry too, so an action can put the failing sections in its result
 * envelope for the no-JS round trip, where client-side badges never render.
 */
export const sectionsWithErrors = (
  sections: FormSections,
  errors?: Record<string, unknown>
): string[] => {
  if (!errors) return [];
  return Object.entries(sections)
    .filter(([, fields]) => fields.some((field) => field in errors))
    .map(([name]) => name);
};
