import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests for the progressively-enhanced server-action form.
 *
 * Prereqs (the example consumes the local library build):
 *   1. `pnpm build` at the repo root
 *   2. in this directory: `pnpm install --ignore-workspace` (with `use-form-definition` set to
 *      `file:../..` in package.json)
 *   3. `pnpm exec playwright install chromium`
 *
 * Then: `pnpm test:e2e`. If a dev server is already running on :3001 it is reused; otherwise one
 * is started.
 */
export default defineConfig({
  testDir: "./e2e",
  // `next dev` (Turbopack) can take a while to compile the server-action route on first hit.
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "./node_modules/.bin/next dev -p 3001",
    url: "http://localhost:3001/en/server-action",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
