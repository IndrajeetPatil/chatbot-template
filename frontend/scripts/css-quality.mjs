#!/usr/bin/env node

/**
 * CSS code quality checker using @projectwallace/css-code-quality.
 *
 * Scores each CSS source file across three dimensions and fails if
 * maintainability or complexity drop below the configured thresholds.
 * Performance is reported but not enforced: @font-face declarations for
 * custom fonts can inflate the penalty at analysis time even though the
 * fonts are resolved at build time.
 */

import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { relative } from "node:path";
import { calculate } from "@projectwallace/css-code-quality";

const THRESHOLDS = {
  maintainability: 80,
  complexity: 90,
};

const files = [];
for await (const f of glob("app/**/*.css")) {
  files.push(f);
}

if (files.length === 0) {
  console.log("No CSS files found.");
  process.exit(0);
}

let failed = false;

for (const file of files.sort()) {
  const css = readFileSync(file, "utf8");
  const result = calculate(css);
  const { performance, maintainability, complexity } = result;

  const label = relative(process.cwd(), file);
  console.log(`\n── ${label} ── (scores out of 100, higher is better)`);

  for (const [dim, data, note] of [
    [
      "performance   ",
      performance,
      " [not enforced: @font-face resolved at build time]",
    ],
    ["maintainability", maintainability, ""],
    ["complexity    ", complexity, ""],
  ]) {
    const threshold = THRESHOLDS[dim.trim()];
    const below = threshold !== undefined && data.score < threshold;
    const marker = below ? "✗" : "✓";
    const thresh = threshold !== undefined ? ` (min: ${threshold})` : "";
    console.log(`  ${marker} ${dim}  ${data.score}/100${thresh}${note}`);
    for (const v of data.violations) {
      console.log(`      ↳ ${v.id}: −${v.score} pts (value: ${v.value})`);
    }
    if (below) {
      failed = true;
    }
  }
}

if (failed) {
  console.error(
    `\nCSS quality check failed. Minimum thresholds: maintainability >= ${THRESHOLDS.maintainability}, complexity >= ${THRESHOLDS.complexity}.`,
  );
  process.exit(1);
} else {
  console.log("\nCSS quality check passed.");
}
