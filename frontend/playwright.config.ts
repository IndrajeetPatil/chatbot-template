import { defineConfig } from "@playwright/test";

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
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
    reducedMotion: "reduce",
    locale: "en-US",
    timezoneId: "UTC",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  // Exercise the production build, including the lazy markdown chunk.
  webServer: {
    command: "pnpm start --strictPort",
    url: "http://localhost:3000",
    reuseExistingServer: false,
  },
});
