import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  // Maps point at the published sources instead of embedding them.
  esbuildOptions(options) {
    options.sourcesContent = false;
  },
  clean: true,
  external: ["react", "react-hook-form", "zod"],
});
