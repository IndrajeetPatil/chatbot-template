import tsParser from "@typescript-eslint/parser";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import reactDom from "eslint-plugin-react-dom";
import globals from "globals";

/**
 * Security-focused ESLint config.
 * Biome handles general style/quality rules; this config targets only patterns
 * that carry a security risk (XSS, code injection, unsafe DOM manipulation).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "e2e-tests/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      "no-unsanitized": noUnsanitized,
      "react-dom": reactDom,
    },
    rules: {
      // Prevent XSS via React DOM escape hatches and dangerous URL patterns
      "react-dom/no-dangerously-set-innerhtml": "error",
      "react-dom/no-dangerously-set-innerhtml-with-children": "error",
      "react-dom/no-script-url": "error",
      "react-dom/no-unsafe-iframe-sandbox": "error",
      "react-dom/no-unsafe-target-blank": "error",

      // Catch dangerouslySetInnerHTML keys hidden inside spread props
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ObjectExpression > Property[key.name='dangerouslySetInnerHTML']",
          message: "Do not create React dangerouslySetInnerHTML props.",
        },
        {
          selector:
            "ObjectExpression > Property[key.value='dangerouslySetInnerHTML']",
          message: "Do not use React dangerouslySetInnerHTML.",
        },
      ],

      // Prevent XSS via direct DOM manipulation (innerHTML, insertAdjacentHTML, …)
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",

      // Prevent arbitrary code execution
      "no-eval": "error",
      "no-new-func": "error",
      "no-implied-eval": "error",
    },
  },
];
