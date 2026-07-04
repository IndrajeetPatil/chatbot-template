#!/usr/bin/env node
/**
 * WCAG AA color-contrast audit for both UI color modes.
 *
 * Lighthouse runs axe in the default render. This script serves the built SPA
 * from dist/, loads it once in light mode and once in dark mode, and runs
 * axe-core's color-contrast rule in each render.
 */

import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import axe from "axe-core";
import { chromium } from "@playwright/test";

const DIST = join(process.cwd(), "dist");

const MIME_TYPES = {
  ".css": "text/css",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function existingFile(filePath) {
  return statSync(filePath, { throwIfNoEntry: false })?.isFile() ? filePath : null;
}

function routePath(pathname) {
  if (pathname === "/") {
    return "/index.html";
  }
  return decodeURIComponent(pathname);
}

function resolveFilePath(pathname) {
  const filePath = join(DIST, normalize(routePath(pathname)));
  const resolvedFile = existingFile(filePath);

  if (resolvedFile) {
    return resolvedFile;
  }
  return join(DIST, "index.html");
}

function serveDist() {
  const server = createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    const filePath = resolveFilePath(pathname);

    if (!filePath) {
      res.writeHead(404).end("not found");
      return;
    }

    res.writeHead(200, {
      "content-type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream",
    });
    res.end(readFileSync(filePath));
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function auditMode(browser, baseUrl, mode) {
  const page = await browser.newPage({ colorScheme: mode });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: "*,*::before,*::after{transition:none!important;animation:none!important}",
  });
  await page.addScriptTag({ content: axe.source });

  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: ["color-contrast"] });
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

const server = await serveDist();
const baseUrl = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({
  args: process.env.CI ? ["--no-sandbox", "--disable-dev-shm-usage"] : [],
});

let failed = false;

try {
  for (const mode of ["light", "dark"]) {
    const violations = await auditMode(browser, baseUrl, mode);

    if (violations.length === 0) {
      console.log(`  ✓ ${mode.padEnd(5)} /`);
      continue;
    }

    failed = true;
    console.log(`  ✗ ${mode.padEnd(5)} /`);
    for (const violation of violations) {
      console.log(`      ↳ ${violation.target}\n        ${violation.summary}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failed) {
  console.error("\nContrast audit failed: WCAG AA violations found.");
  process.exit(1);
}

console.log("\nContrast audit passed in light and dark mode.");
