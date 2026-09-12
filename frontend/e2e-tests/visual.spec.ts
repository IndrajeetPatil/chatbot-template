import { expect, test } from "@playwright/test";
import { openChat, sendMessage } from "./chat-fixture";
import { MARKDOWN_REPLY } from "./markdown-fixture";

// Use the pinned Linux/amd64 renderer through make e2e-test-docker on macOS.
test.skip(
  process.platform !== "linux",
  "Visual baselines use the CI Linux renderer",
);

for (const colorScheme of ["light", "dark"] as const) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test.describe(`${colorScheme} ${viewport.name}`, () => {
      test.use({ colorScheme, viewport });
      const snapshot = (state: string) =>
        `${state}-${colorScheme}-${viewport.name}.png`;

      test.beforeEach(async ({ page }) => {
        await openChat(page);
      });

      test("initial page and validation", async ({ page }) => {
        await expect(page).toHaveScreenshot(snapshot("initial"));
        await page.getByRole("button", { name: "Send", exact: true }).click();
        await expect(page.getByRole("textbox")).toHaveAttribute(
          "aria-invalid",
          "true",
        );
        await expect(page).toHaveScreenshot(snapshot("validation"));
      });

      test("model and reasoning menus", async ({ page }) => {
        await page
          .getByRole("button", { name: /Select assistant model/ })
          .click();
        await expect(page.getByRole("menu")).toBeVisible();
        await expect(page).toHaveScreenshot(snapshot("models"));
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: /Select reasoning effort/ })
          .click();
        await expect(page.getByRole("menu")).toBeVisible();
        await expect(page).toHaveScreenshot(snapshot("reasoning"));
      });

      test("markdown conversation", async ({ page }) => {
        await page.route("**/api/v1/chat", (route) =>
          route.fulfill({
            contentType: "text/plain; charset=utf-8",
            body: MARKDOWN_REPLY,
          }),
        );
        await sendMessage(page, "Show me a short code example.");
        // The lazy markdown renderer must finish before capturing the page.
        await expect(page.getByTestId("code-block")).toBeVisible();
        await expect(page.locator(".katex-display")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(snapshot("conversation"));
      });

      test("pending response", async ({ page }) => {
        await page.route("**/api/v1/chat", () => {
          // Keep the request pending; the browser context closes it at teardown.
        });
        await page.getByRole("textbox").fill("Take your time.");
        await page.getByRole("button", { name: "Send", exact: true }).click();
        await expect(page.getByRole("status")).toBeVisible();
        await expect(page.getByRole("textbox")).toBeDisabled();
        await expect(
          page.getByRole("button", { name: "Regenerate response" }),
        ).toBeDisabled();
        await page.mouse.move(0, 0);
        await expect(page).toHaveScreenshot(snapshot("pending"));
      });

      test("failed response", async ({ page }) => {
        await page.route("**/api/v1/chat", (route) =>
          route.fulfill({
            status: 503,
            contentType: "text/plain",
            body: "Service unavailable",
          }),
        );
        await sendMessage(page, "Hello there!");
        await expect(page.getByRole("alert")).toBeVisible();
        await expect(page).toHaveScreenshot(snapshot("error"));
      });
    });
  }
}
