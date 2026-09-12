#!/usr/bin/env node

/**
 * WCAG AA color-contrast audit for both UI color modes.
 *
 * Lighthouse runs axe in the default render. This script serves the built SPA
 * from dist/ with Vite's own preview server (the same one `pnpm start` uses,
 * with SPA fallback and asset MIME types handled natively), loads it once in
 * light mode and once in dark mode, and runs axe-core's color-contrast rule in
 * each render.
 */

import { statSync } from "node:fs";
import { join } from "node:path";
import { styleText } from "node:util";
import { chromium } from "@playwright/test";
import axe from "axe-core";
import { preview } from "vite";

const DIST = join(process.cwd(), "dist");

async function auditMode(browser, baseUrl, mode) {
  const page = await browser.newPage({ colorScheme: mode });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.addStyleTag({
    content:
      "*,*::before,*::after{transition:none!important;animation:none!important}",
  });
  await page.addScriptTag({ content: axe.source });

  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: ["color-contrast"],
    });
    return result.violations.flatMap((violation) =>
      violation.nodes.map((node) => ({
        target: node.target.join(" "),
        summary: (node.failureSummary ?? "").replace(/\s+/g, " "),
      })),
    );
  });

  await page.close();
  return violations;
}

if (!statSync(join(DIST, "index.html"), { throwIfNoEntry: false })?.isFile()) {
  console.error("dist/index.html not found. Run `make frontend-build` first.");
  process.exit(1);
}

const server = await preview({
  preview: { host: "127.0.0.1", port: 0 },
  logLevel: "silent",
});
const baseUrl = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  args: process.env.CI ? ["--no-sandbox", "--disable-dev-shm-usage"] : [],
});

let failed = false;

try {
  for (const mode of ["light", "dark"]) {
    const violations = await auditMode(browser, baseUrl, mode);

    if (violations.length === 0) {
      if (!process.env.CI) {
        console.log(`  ${styleText("green", "✓")} ${mode.padEnd(5)} /`);
      }
      continue;
    }

    failed = true;
    console.log(`  ${styleText("red", "✗")} ${mode.padEnd(5)} /`);
    for (const violation of violations) {
      console.log(`      ↳ ${violation.target}\n        ${violation.summary}`);
    }
  }
} finally {
  await browser.close();
  await server.close();
}

if (failed) {
  console.error("\nContrast audit failed: WCAG AA violations found.");
  process.exit(1);
}

console.log(
  styleText("green", "\nContrast audit passed in light and dark mode."),
);
