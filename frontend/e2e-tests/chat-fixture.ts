import { expect, type Page } from "@playwright/test";

export async function openChat(page: Page) {
  await page.goto("/chat");
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeVisible();
  // Wait for the lazy markdown renderer and bundled fonts, not greeting copy.
  await expect(
    page.getByRole("region", { name: "Chat conversation" }).locator("p"),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

export async function sendMessage(page: Page, message: string) {
  const response = page.waitForResponse("**/api/v1/chat");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill(message);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await response;
  await expect(page.getByRole("textbox")).toBeEnabled();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.mouse.move(0, 0);
}
