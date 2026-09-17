import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import type { PluginOption } from "vite";
import { defineConfig } from "vitest/config";

const CHAT_API_PROXY_TARGET =
  process.env.CHAT_API_PROXY_TARGET ?? "http://localhost:8000";
const CHAT_API_PROXY = {
  "/api": {
    target: CHAT_API_PROXY_TARGET,
    changeOrigin: true,
  },
};

// The React Compiler auto-memoizes components and hooks, so manual useMemo/
// useCallback/React.memo is unnecessary. It runs as a build-time Babel pass
// (Vite 8 drives React Refresh through Oxc, so the compiler is wired in
// separately via @rolldown/plugin-babel). We skip it under Vitest: memoization
// is a performance optimization with no bearing on behavior, and running tests
// against the un-compiled source keeps coverage measuring the code we wrote
// rather than the compiler's injected memo-cache guards.
const isTest = process.env.VITEST === "true";
const reactCompiler: PluginOption[] = isTest
  ? []
  : [babel({ presets: [reactCompilerPreset()] })];

export default defineConfig({
  plugins: [react(), ...reactCompiler],
  publicDir: "app/favicon",
  // `host: true` binds every interface so the devcontainer port forward works.
  // Neither server sets `strictPort`: `make qa` must not fail just because a
  // development server already holds 3000.
  server: {
    host: true,
    port: 3000,
    proxy: CHAT_API_PROXY,
  },
  preview: {
    host: true,
    port: 3000,
    proxy: CHAT_API_PROXY,
  },
  // The `@/*` -> `./*` mapping lives in tsconfig.json; Vite reads it from
  // there so the two cannot drift.
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    reporters: process.env.CI ? ["dot", "github-actions"] : ["default"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        statements: 90,
        branches: 75,
        functions: 90,
        lines: 90,
      },
    },
    server: {
      deps: {
        inline: ["@mui/material"],
      },
    },
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e-tests/**"],
    globals: true,
    pool: "threads",
    // Real MUI components are CPU-heavy; avoid oversubscribing CI and laptops.
    maxWorkers: 2,
    setupFiles: ["./vitest.setup.ts"],
  },
});
