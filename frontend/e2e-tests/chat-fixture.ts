import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export const CHAT_API_PATH = "**/api/v1/chat";

export const MARKDOWN_REPLY = [
  "Here is **bold text**, a [link](https://example.com), and `inline code`.",
  '```javascript\n// A friendly greeting\nconst greet = (name) => "Hello, " + name;\nconsole.log(greet("world"));\n```',
  "Inline math: $E = mc^2$.",
  "$$\n\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}\n$$",
].join("\n\n");

export async function openChat(page: Page): Promise<void> {
  await page.goto("/chat");
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeVisible();
  // Wait for the lazy markdown renderer and bundled fonts, not greeting copy.
  await expect(
    page.getByRole("region", { name: "Chat conversation" }).locator("p"),
  ).toBeVisible();
  await page.evaluate(async () => document.fonts.ready);
}

// Answer every chat request with the same plain-text reply.
export async function mockChatReply(page: Page, body: string): Promise<void> {
  await page.route(CHAT_API_PATH, async (route) =>
    route.fulfill({ contentType: "text/plain; charset=utf-8", body }),
  );
}

export async function sendMessage(page: Page, message: string): Promise<void> {
  const response = page.waitForResponse(CHAT_API_PATH);
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill(message);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await response;
  await expect(page.getByRole("textbox")).toBeEnabled();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.mouse.move(0, 0);
}

// Send a message whose reply never arrives, leaving the response pending.
export async function sendPendingMessage(page: Page): Promise<void> {
  await page.route(CHAT_API_PATH, () => {
    // Never fulfill the request; the browser context closes it at teardown.
  });
  await page.getByRole("textbox").fill("Take your time.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
}
