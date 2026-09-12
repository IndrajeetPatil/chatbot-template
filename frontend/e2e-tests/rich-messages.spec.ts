import { expect, test } from "@playwright/test";
import axe from "axe-core";
import { openChat, sendMessage } from "./chat-fixture";
import { MARKDOWN_REPLY } from "./markdown-fixture";

declare global {
  interface Window {
    axe: typeof axe;
  }
}

const KEYWORD_COLORS = {
  light: "rgb(207, 48, 64)",
  dark: "rgb(255, 123, 114)",
};

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme });
    test("renders colored syntax and math, including after a theme change", async ({
      page,
    }) => {
      await page.route("**/api/v1/chat", (route) =>
        route.fulfill({ contentType: "text/plain", body: MARKDOWN_REPLY }),
      );
      await openChat(page);
      await sendMessage(page, "Show code and an equation.");
      const keyword = page.locator(".hljs-keyword").first();
      await expect(keyword).toHaveCSS("color", KEYWORD_COLORS[colorScheme]);
      await expect(page.locator(".katex math")).toHaveCount(2);
      await expect(page.locator(".katex-display .katex-html")).toBeVisible();
      await expect(page.locator(".katex-error")).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() =>
          Array.from(document.fonts).some(
            (font) => font.family === "KaTeX_Main" && font.status === "loaded",
          ),
        ),
      ).toBe(true);
      await page.addScriptTag({ content: axe.source });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(".markdown", {
          runOnly: ["color-contrast"],
        });
        return result.violations;
      });
      expect(violations).toEqual([]);
      const otherMode = colorScheme === "light" ? "dark" : "light";
      await page
        .getByRole("button", { name: `Switch to ${otherMode} mode` })
        .click();
      await expect(keyword).toHaveCSS("color", KEYWORD_COLORS[otherMode]);
    });
  });
}

for (const width of [320, 390]) {
  test(`wide code and equations scroll within the reply at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const equation = Array.from({ length: 30 }, (_, n) => `x_{${n}}`).join(
      " + ",
    );
    const reply = `\`\`\`python\nprint("${"wide code ".repeat(20)}")\n\`\`\`\n\n$$\n${equation}\n$$`;
    await page.route("**/api/v1/chat", (route) =>
      route.fulfill({ contentType: "text/plain", body: reply }),
    );
    await openChat(page);
    await sendMessage(page, "Show wide content.");
    await expect(page.locator(".katex-display")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    for (const selector of [".markdown pre", ".katex-display"]) {
      const block = page.locator(selector);
      await expect(block).toHaveCSS("overflow-x", "auto");
      expect(
        await block.evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        ),
      ).toBe(true);
      await block.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      expect(
        await block.evaluate((element) => element.scrollLeft),
      ).toBeGreaterThan(0);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  });
}
