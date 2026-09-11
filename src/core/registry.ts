/**
 * Registration stores shared by every copy of the library in a process.
 *
 * The package ships two entry points (`use-form-definition` and
 * `use-form-definition/server`) built as separate bundles, and a bundler or a
 * duplicated `node_modules` can load either more than once. A registration
 * kept in a module-level map is then visible only to the copy that made it:
 * a kind registered through the client entry is unknown to the server data
 * validator, and the two disagree.
 *
 * Keeping the custom registrations on `globalThis` under a `Symbol.for` key
 * gives every copy the same store, whichever entry point registered. Built-in
 * kinds stay module-local; only what a consumer registers is shared.
 */
const KEY_PREFIX = "use-form-definition:";

export const sharedStore = <T extends object>(name: string, create: () => T): T => {
  const key = Symbol.for(`${KEY_PREFIX}${name}`);
  const host = globalThis as unknown as Record<symbol, T | undefined>;
  return host[key] ?? (host[key] = create());
};
