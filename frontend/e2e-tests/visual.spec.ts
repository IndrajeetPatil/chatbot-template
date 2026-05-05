import { expect, test } from "@playwright/test";

const CHAT_API_PATH = "**/api/v1/chat";

test.describe("Visual regression", () => {
  test("initial page", async ({ page }) => {
    await page.goto("/chat");
    await expect(
      page.getByText("Hi, I am a chat bot. How can I help you today?"),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("initial-page.png");
  });

  test("chat input error state", async ({ page }) => {
    await page.goto("/chat");
    await expect(
      page.getByText("Hi, I am a chat bot. How can I help you today?"),
    ).toBeVisible();
    await page.locator("form").getByRole("button", { name: "Send" }).click();
    await expect(
      page.getByText("Enter a message before sending."),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("input-error-state.png");
  });

  test("after user message and response", async ({ page }) => {
    const response = "Hello! I am here to help you today.";
    await page.route(CHAT_API_PATH, async (route) => {
      await route.fulfill({
        body: response,
        contentType: "text/plain; charset=utf-8",
        status: 200,
      });
    });
    await page.goto("/chat");
    await expect(
      page.getByText("Hi, I am a chat bot. How can I help you today?"),
    ).toBeVisible();
    await page.getByLabel("Message").fill("Hello there!");
    await page.locator("form").getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(response)).toBeVisible();
    await expect(page).toHaveScreenshot("after-conversation.png");
  });

  test("chat input disabled state", async ({ page }) => {
    await page.route(CHAT_API_PATH, () => {
      // Never fulfilled — keeps the UI in loading/disabled state for screenshot
    });
    await page.goto("/chat");
    await expect(
      page.getByText("Hi, I am a chat bot. How can I help you today?"),
    ).toBeVisible();
    await page.getByLabel("Message").fill("Test message");
    await page.locator("form").getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
    await expect(page).toHaveScreenshot("input-disabled-state.png");
  });
});
