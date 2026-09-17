import { defineConfig } from "@playwright/test";

// Playwright's web server needs a known URL to poll, so it cannot take an
// ephemeral port. Default to the development port and let callers move off it:
// the contrast audit runs inside the required `make qa` gate, which must not
// fail just because a development server already holds 3000.
const PORT = process.env.PLAYWRIGHT_PORT ?? "3000";
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e-tests",
  snapshotPathTemplate:
    "{testDir}/__snapshots__/{projectName}/{testFileName}/{arg}{ext}",
  // Baselines are reviewed and updated explicitly, never created by CI.
  updateSnapshots: "none",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["dot"], ["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { animations: "disabled", maxDiffPixels: 0 },
  },
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
    reducedMotion: "reduce",
    locale: "en-US",
    timezoneId: "UTC",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  // Exercise the production build, including the lazy markdown chunk. This is
  // what `pnpm start` runs, invoked directly so PORT is not passed twice.
  webServer: {
    command: `pnpm exec vite preview --host 0.0.0.0 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
  },
});
