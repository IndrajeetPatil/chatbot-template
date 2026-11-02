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

import { glob, readFile } from "node:fs/promises";
import path from "node:path";
import { styleText } from "node:util";

import { calculate } from "@projectwallace/css-code-quality";

type Dimension = "performance" | "maintainability" | "complexity";
type Category = ReturnType<typeof calculate>[Dimension];

interface Source {
  file: string;
  css: string;
}

const DIMENSIONS: readonly Dimension[] = [
  "performance",
  "maintainability",
  "complexity",
];
const THRESHOLDS: Partial<Record<Dimension, number>> = {
  maintainability: 80,
  complexity: 90,
};
const NOTES: Partial<Record<Dimension, string>> = {
  performance: " [not enforced: @font-face resolved at build time]",
};
const LABEL_WIDTH = Math.max(...DIMENSIONS.map((name) => name.length));
const FAILURE_EXIT_CODE = 1;

function printViolations(category: Category): void {
  for (const violation of category.violations) {
    console.log(
      `      ↳ ${violation.id}: −${violation.score} pts (value: ${violation.value})`,
    );
  }
}

function reportEnforced(
  category: Category,
  threshold: number,
  label: string,
): boolean {
  const passed = category.score >= threshold;
  const marker = passed ? styleText("green", "✓") : styleText("red", "✗");
  console.log(`  ${marker} ${label} (min: ${threshold})`);
  if (!passed) {
    printViolations(category);
  }
  return passed;
}

function reportDimension(dimension: Dimension, category: Category): boolean {
  const threshold = THRESHOLDS[dimension];
  const label = `${dimension.padEnd(LABEL_WIDTH)}  ${category.score}/100`;
  if (threshold === undefined) {
    const note = NOTES[dimension] ?? "";
    console.log(`  ${styleText("blue", "ℹ")} ${label}${note}`);
    return true;
  }
  return reportEnforced(category, threshold, label);
}

function reportSource({ file, css }: Source): boolean {
  const result = calculate(css);
  console.log(`\n${path.relative(process.cwd(), file)} (scores out of 100)`);
  // Map before `every` so each dimension is reported, even after a failure.
  return DIMENSIONS.map((dimension) =>
    reportDimension(dimension, result[dimension]),
  ).every(Boolean);
}

function fail(message: string): void {
  console.error(styleText("red", message));
  process.exitCode = FAILURE_EXIT_CODE;
}

async function main(): Promise<void> {
  const files = await Array.fromAsync(glob("app/**/*.css"));
  const sources = await Promise.all(
    files
      .toSorted((left, right) => left.localeCompare(right))
      .map(async (file) => ({ file, css: await readFile(file, "utf8") })),
  );
  if (sources.length === 0) {
    fail("No CSS files found under app/.");
  } else if (sources.map((source) => reportSource(source)).every(Boolean)) {
    console.log(styleText("green", "\nCSS quality check passed."));
  } else {
    fail(
      `\nCSS quality check failed. Minimum thresholds: maintainability >= ${THRESHOLDS.maintainability}, complexity >= ${THRESHOLDS.complexity}.`,
    );
  }
}

await main();
