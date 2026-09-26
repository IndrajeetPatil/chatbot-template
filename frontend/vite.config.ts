import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";
import type { PluginOption } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

const isCI = Boolean(process.env.CI);
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

// Generated output never gets formatted or linted.
const GENERATED = [
  "coverage/**",
  "dist/**",
  "playwright-report/**",
  "test-results/**",
  ".fallow/**",
  ".lighthouseci/**",
  ".vitest/**",
  "e2e-tests/__snapshots__/**",
];

const LINT_PLUGINS = [
  "eslint",
  "typescript",
  "unicorn",
  "oxc",
  "import",
  "jsdoc",
  "react",
  "react-perf",
  "jsx-a11y",
  "promise",
  "node",
  "vitest",
] as const;

const TEST_FILES = ["**/*.test.{ts,tsx}", "**/*.bench.ts", "vitest.setup.ts"];

export default defineConfig({
  // `lazyPlugins` keeps `vp check`, `vp lint`, and `vp fmt` from loading Babel.
  plugins: lazyPlugins(() => [react(), ...reactCompiler]),
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
    reporters: isCI ? ["dot", "github-actions"] : ["default"],
    // Components render in real Chromium, so layout, storage, and clipboard
    // behave as they do for users instead of through jsdom stand-ins.
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
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
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e-tests/**"],
    // Undo `vi.spyOn` after each test so spies on browser APIs cannot leak.
    restoreMocks: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  fmt: {
    // Match the Biome style this project used before Vite+.
    printWidth: 80,
    // Favour one entry per line with a trailing comma, so additions and
    // removals touch a single line. Oxfmt has no option that forces every
    // list to expand; these are the settings that push furthest that way.
    trailingComma: "all",
    objectWrap: "preserve",
    singleAttributePerLine: true,
    sortImports: {},
    ignorePatterns: [...GENERATED, "pnpm-lock.yaml"],
  },
  lint: {
    // Every rule in every stable category is an error. Nursery rules are
    // excluded because they are unfinished and may report false positives.
    // Rules below are only switched off when they contradict another enabled
    // rule, are obsolete for this stack, or duplicate a stricter tool.
    plugins: [...LINT_PLUGINS],
    categories: {
      correctness: "error",
      suspicious: "error",
      pedantic: "error",
      perf: "error",
      style: "error",
      restriction: "error",
    },
    env: {
      browser: true,
      builtin: true,
    },
    ignorePatterns: GENERATED,
    options: {
      typeAware: true,
      typeCheck: true,
      reportUnusedDisableDirectives: "error",
    },
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      "eslint-plugin-no-unsanitized",
      "./lint/security.js",
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",

      // Security: block XSS and code injection through escape hatches.
      "react/no-danger": "error",
      "react/no-danger-with-children": "error",
      "react/jsx-no-script-url": "error",
      "react/iframe-missing-sandbox": "error",
      "react/jsx-no-target-blank": "error",
      "security/no-dangerous-html-props": "error",
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
      "no-eval": "error",
      "no-new-func": "error",
      "typescript/no-implied-eval": "error",

      // Cyclomatic complexity matches the Fallow health gate.
      complexity: ["error", { max: 5 }],
      // Zero, one, and "last" are not magic.
      "no-magic-numbers": ["error", { ignore: [-1, 0, 1] }],

      // The React Compiler silently skips any component or hook that breaks
      // the Rules of React. These rules surface those bail-outs at lint time.
      "react/rules-of-hooks": "error",
      "react/exhaustive-deps": "error",
      "react/static-components": "error",
      "react/use-memo": "error",
      "react/void-use-memo": "error",
      "react/preserve-manual-memoization": "error",
      "react/incompatible-library": "error",
      "react/immutability": "error",
      "react/globals": "error",
      "react/refs": "error",
      "react/set-state-in-effect": "error",
      "react/error-boundaries": "error",
      "react/purity": "error",
      "react/set-state-in-render": "error",
      "react/unsupported-syntax": "error",

      // Match the conventions the codebase already follows.
      // Wrapped comments continue mid-sentence in lowercase, and coverage
      // hints such as `v8 ignore next` only match in lowercase.
      "capitalized-comments": [
        "error",
        "always",
        { ignoreConsecutiveComments: true, ignorePattern: "[cv]8|istanbul" },
      ],
      // The vitest plugin's rules apply to every file; this one only makes
      // sense in test files, where the override re-enables it.
      "vitest/require-hook": "off",
      "one-var": ["error", "never"],
      "func-style": ["error", "declaration", { allowArrowFunctions: true }],
      "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
      // Promise-returning functions are `async` (promise-function-async);
      // the type-aware variant accepts those that return a promise directly.
      "require-await": "off",
      "typescript/require-await": "error",
      // `mockResolvedValue(undefined)` needs its argument to type-check.
      "unicorn/no-useless-undefined": ["error", { checkArguments: false }],
      // `void promise` marks a deliberately unawaited promise.
      "no-void": ["error", { allowAsStatement: true }],
      // Type-only imports stay separate (import/consistent-type-specifier-style).
      "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
      "import/no-unassigned-import": [
        "error",
        { allow: ["**/*.css", "@testing-library/jest-dom/vitest"] },
      ],

      // Contradictory pairs: each project module picks the export style that
      // suits it (components default, helpers named), React and the DOM use
      // `null` for "no element", and TypeScript uses `undefined` for "absent".
      "import/no-default-export": "off",
      "import/no-named-export": "off",
      "import/prefer-default-export": "off",
      "import/group-exports": "off",
      "unicorn/no-null": "off",
      "no-undefined": "off",
      // A const object and its union type share a name by design; the type
      // checker still rejects genuine redeclarations.
      "no-redeclare": "off",

      // Obsolete here: the automatic JSX runtime needs no React import, the
      // React Compiler memoizes props, and the ESNext target has native
      // async/await, optional chaining, and object spread.
      "react/react-in-jsx-scope": "off",
      "react-perf/jsx-no-new-object-as-prop": "off",
      "react-perf/jsx-no-new-array-as-prop": "off",
      "react-perf/jsx-no-new-function-as-prop": "off",
      "react-perf/jsx-no-jsx-as-prop": "off",
      "oxc/no-async-await": "off",
      "oxc/no-optional-chaining": "off",
      "oxc/no-rest-spread-properties": "off",

      // Owned by stricter or dedicated tools: Oxfmt sorts imports, ls-lint
      // enforces file names, and the complexity rule plus Fallow's health
      // gate bound function size better than line and statement counts.
      "sort-imports": "off",
      "unicorn/filename-case": "off",
      "max-lines-per-function": "off",
      "max-statements": "off",
      "react/jsx-max-depth": "off",
      // Small private subcomponents stay next to their only consumer.
      "react/no-multi-comp": "off",

      // Rules that forbid core language or React idioms outright: sorted
      // object keys would reorder CSS-in-JS cascades, ternaries are how JSX
      // renders conditionally, the UI has no i18n layer for literals, and
      // inferred return types are already checked by `typeCheck`.
      "sort-keys": "off",
      "no-ternary": "off",
      "react/jsx-no-literals": "off",
      "typescript/explicit-function-return-type": "off",
      // TypeScript owns parameter and return types; JSDoc must not repeat them.
      "jsdoc/require-param-type": "off",
      "jsdoc/require-returns-type": "off",
      // React, MUI, and Playwright types are mutable by design.
      "typescript/prefer-readonly-parameter-types": "off",
    },
    overrides: [
      {
        files: TEST_FILES,
        rules: {
          "vitest/consistent-test-it": ["error", { fn: "test" }],
          "vitest/require-hook": "error",
          // Contradicts vitest/prefer-called-once for single calls.
          "vitest/prefer-called-times": "off",
          // Accept the function titles vitest/prefer-describe-function-title
          // asks for.
          "vitest/valid-title": ["error", { allowArguments: true }],
          // Tests import `vi`, `test`, and `expect` explicitly.
          "vitest/no-importing-vitest-globals": "off",
          // Cleanup hooks and flat files of focused tests are intended.
          "vitest/no-hooks": "off",
          "vitest/require-top-level-describe": "off",
          // The global test timeout applies; async assertions are awaited
          // and checked by `typescript/no-floating-promises` instead.
          "vitest/require-test-timeout": "off",
          "vitest/prefer-expect-assertions": "off",
          // Fixture sizes and expected counts are clearer inline.
          "no-magic-numbers": "off",
        },
      },
      {
        files: ["e2e-tests/**"],
        rules: {
          // Playwright Test, not Vitest: its own `test`/`expect` imports,
          // `.spec.ts` naming, and no `test.each`.
          "vitest/prefer-importing-vitest-globals": "off",
          "vitest/consistent-test-filename": "off",
          "vitest/prefer-each": "off",
          // Viewport sizes, timeouts, and contrast ratios are test fixtures.
          "no-magic-numbers": "off",
          // Playwright steps must run sequentially within a page.
          "no-await-in-loop": "off",
        },
      },
      {
        // Ambient declaration files are scripts by design.
        files: ["**/*.d.ts"],
        rules: {
          "import/unambiguous": "off",
        },
      },
      {
        // Node-run tooling reads the environment and prints results.
        files: ["*.config.ts", "scripts/**", "lint/**"],
        rules: {
          // Private scripts run as ES modules and are never `require`d.
          "node/no-top-level-await": "off",
          "node/no-process-env": "off",
          "import/no-nodejs-modules": "off",
          "no-console": "off",
        },
      },
      {
        // The lint policy is one declarative list; splitting it across
        // modules would hide which rules are on.
        files: ["vite.config.ts"],
        rules: {
          "max-lines": "off",
        },
      },
    ],
  },
});
