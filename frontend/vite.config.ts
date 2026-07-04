import { fileURLToPath, URL } from "node:url";

import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import type { PluginOption } from "vite";
import { defineConfig } from "vitest/config";

// react-markdown is intentionally absent: it is dynamically imported by
// AssistantMessage, so leaving it out of the manual chunks lets the bundler
// emit it as an async chunk that stays off the initial critical path (no
// eager modulepreload in index.html).
const VENDOR_CHUNKS: [string, string][] = [
  ["react", "/react/"],
  ["react", "/react-dom/"],
  ["mui", "/@emotion/"],
  ["mui", "/@mui/icons-material/"],
  ["mui", "/@mui/material/"],
];
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
  server: {
    proxy: CHAT_API_PROXY,
  },
  preview: {
    proxy: CHAT_API_PROXY,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        manualChunks(id: string) {
          if (!id.includes("node_modules")) {
            return;
          }
          return VENDOR_CHUNKS.find(([, pattern]) => id.includes(pattern))?.[0];
        },
      },
    },
  },
  test: {
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
    setupFiles: ["./vitest.setup.ts"],
  },
});
