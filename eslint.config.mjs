// The recommended JavaScript and typescript-eslint rules across the source,
// tests, the component-copying CLI and the configs, plus React's hook rules
// for the components and hooks. Formatting is Prettier's job, so the
// stylistic rules are switched off last. The example apps keep their own setup.
import javascript from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import typescript from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["dist/", "coverage/", "examples/"],
  },
  javascript.configs.recommended,
  typescript.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // A leading underscore marks a deliberate discard: a prop pulled out of
      // a rest spread so it is not forwarded, or a parameter kept for its
      // position.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // `interface Rules extends CommonRules {}` names a public type that may
      // grow members later.
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
    },
  },
  {
    files: ["cli/**/*.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["src/**/*.tsx", "src/hooks/**/*.ts"],
    plugins: { "react-hooks": reactHooks },
    // The two classic hook rules. The plugin's React Compiler rules are left
    // out: nothing here is compiled by the React Compiler, and those rules
    // judge compatibility with it.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  // Known findings in files that are not to be touched in the change that
  // introduced the linter. Each entry names the file and the rule; fix the
  // file and delete its entry.
  {
    files: [
      "src/components/Actions.tsx",
      "src/components/Field.tsx",
      "src/components/LayoutItem.tsx",
      "src/configuration/createFormConfiguration.ts",
      "src/configuration/default-field-types.tsx",
      "src/core/schema/schema-builder.ts",
      "src/core/types-inference.ts",
      "src/core/types.ts",
      "src/core/utilities.ts",
      "src/core/validation-messages.ts",
      "src/hooks/createFormDefinitionHook.tsx",
      "src/hooks/useFormDefinition.tsx",
      "src/test/components/components.test.tsx",
      "src/test/components/minimal.test.tsx",
      "src/test/hooks/custom-layout.test.tsx",
      "src/test/hooks/derive-from.test.tsx",
      "src/test/hooks/form-hooks.test.tsx",
      "src/test/hooks/html5-attributes.test.tsx",
      "src/test/hooks/post-gap-warning.test.tsx",
      "src/test/hooks/sections-api.test.tsx",
      "src/test/hooks/sections-zero-configuration.test.tsx",
      "src/test/hooks/server-action.test.tsx",
      "src/test/registry/shared-registrations.test.ts",
      "src/test/setup.ts",
      "src/test/validation/patterns.test.ts",
    ],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  {
    files: [
      "src/components/Field.tsx",
      "src/test/types/type-inference.test.ts",
    ],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
  {
    files: [
      "src/core/types-inference.ts",
      "src/test/types/type-inference.test.ts",
    ],
    rules: { "@typescript-eslint/no-empty-object-type": "off" },
  },
  {
    files: ["src/validation/patterns.ts"],
    rules: { "no-useless-escape": "off" },
  },
  {
    files: ["src/hooks/useFormDefinition.tsx"],
    rules: { "react-hooks/exhaustive-deps": "off" },
  },
  prettier,
);
