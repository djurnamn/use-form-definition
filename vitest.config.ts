import { defineConfig, configDefaults } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    // Keep the example apps' tests (e.g. Playwright `*.spec.ts`) out of the unit-test run.
    exclude: [...configDefaults.exclude, "examples/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "dist/",
        "cli/",
        "src/components/", // Reference components for copying
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: resolve(__dirname, "./src") },
      // The peer range takes Zod 3 and Zod 4, so the suite runs against both:
      // `zod` is Zod 4, and ZOD=3 points the bare import at the `zod3` alias.
      ...(process.env.ZOD === "3"
        ? [{ find: /^zod$/, replacement: "zod3" }]
        : []),
    ],
  },
});
