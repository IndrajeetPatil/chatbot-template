import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { openChat } from "./chat-fixture";

// Lighthouse asserts accessibility on the default render only, so check WCAG AA
// contrast in both color modes. Unlike the visual baselines, contrast is
// renderer-independent, so these run on every platform.
for (const colorScheme of ["light", "dark"] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme });

    test("meets WCAG AA color contrast", async ({ page }) => {
      await openChat(page);
      const { violations } = await new AxeBuilder({ page })
        .withRules(["color-contrast"])
        .analyze();
      expect(violations).toEqual([]);
    });
  });
}
