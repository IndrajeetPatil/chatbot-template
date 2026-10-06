import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  CHAT_API_PATH,
  MARKDOWN_REPLY,
  mockChatReply,
  openChat,
  sendMessage,
  sendPendingMessage,
} from "./chat-fixture";

// Every WCAG 2.2 A/AA rule plus axe best practices. Lighthouse runs a subset of
// these rules on the default render only, so audit each UI state, both color
// modes, and both layouts. Unlike the visual baselines, axe results are
// renderer-independent, so these run on every platform.
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

// MUI portals menus and tooltips to the end of <body>, outside every landmark.
// They belong to the control that opens them, and an open menu is modal (MUI
// hides the rest of the page from assistive technology), so count them as
// regions instead of reporting their content as orphaned. axe reads per-check
// options at run time, but its `RunOptions` type omits them.
const AXE_OPTIONS: Parameters<AxeBuilder["options"]>[0] & {
  checks: Record<string, { options: unknown }>;
} = {
  checks: {
    region: { options: { regionMatcher: '[role="menu"], [role="tooltip"]' } },
  },
};

// Report only what identifies a violation, not axe's full result objects.
async function expectNoViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    // `options` replaces every option, so it must precede `withTags`.
    .options(AXE_OPTIONS)
    .withTags(AXE_TAGS)
    .analyze();
  expect(
    violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target.join(" ")),
    })),
  ).toEqual([]);
}

const STATES: Record<string, (page: Page) => Promise<void>> = {
  initial: async () => {
    // The page as first rendered.
  },
  validation: async (page) => {
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByRole("textbox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
  "model menu": async (page) => {
    await page.getByRole("button", { name: /Select assistant model/u }).click();
    await expect(page.getByRole("menu")).toBeVisible();
  },
  "reasoning menu": async (page) => {
    await page
      .getByRole("button", { name: /Select reasoning effort/u })
      .click();
    await expect(page.getByRole("menu")).toBeVisible();
  },
  "markdown conversation": async (page) => {
    await mockChatReply(page, MARKDOWN_REPLY);
    await sendMessage(page, "Show me a short code example.");
    await expect(page.locator(".katex-display")).toBeVisible();
  },
  "pending response": async (page) => {
    await sendPendingMessage(page);
  },
  "failed response": async (page) => {
    await page.route(CHAT_API_PATH, async (route) =>
      route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Service unavailable",
      }),
    );
    await sendMessage(page, "Hello there!");
    await expect(page.getByRole("alert")).toBeVisible();
  },
};

for (const colorScheme of ["light", "dark"] as const) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test.describe(`${colorScheme} ${viewport.name}`, () => {
      test.use({ colorScheme, viewport });

      for (const [state, reach] of Object.entries(STATES)) {
        test(`${state} has no axe violations`, async ({ page }) => {
          await openChat(page);
          await reach(page);
          await expectNoViolations(page);
        });
      }
    });
  }
}
