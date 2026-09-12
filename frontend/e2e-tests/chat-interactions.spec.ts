import { expect, test } from "@playwright/test";
import { openChat, sendMessage } from "./chat-fixture";

test("supports skip navigation and model selection by keyboard", async ({
  page,
}) => {
  await openChat(page);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to Message" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox")).toBeFocused();
  const model = page.getByRole("button", { name: /Select assistant model/ });
  await model.focus();
  await model.press("Enter");
  await expect(
    page.getByRole("menuitem", { name: "GPT-6 Astra", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(model).toHaveAccessibleName(/Current model: GPT-5.6 Sol/);
  await expect(model).toBeFocused();
});

test("a suggestion starts a conversation and removes the welcome screen", async ({
  page,
}) => {
  await page.route("**/api/v1/chat", (route) =>
    route.fulfill({ contentType: "text/plain", body: "Let’s break it down." }),
  );
  await openChat(page);
  await page.getByRole("button", { name: /Explain a complex idea/ }).click();
  await expect(page.getByText("Let’s break it down.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Where should we begin?" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Explain a complex idea in simple terms.", { exact: true }),
  ).toBeVisible();
});

test("stopping a pending response restores the composer for a follow-up", async ({
  page,
}) => {
  await page.route("**/api/v1/chat", () => {});
  await openChat(page);
  await page.getByRole("textbox").fill("Take your time.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "Stop generating" }).click();
  await expect(page.getByRole("textbox")).toBeEnabled();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.unroute("**/api/v1/chat");
  await page.route("**/api/v1/chat", (route) =>
    route.fulfill({ contentType: "text/plain", body: "Ready again." }),
  );
  await sendMessage(page, "A new question");
  await expect(page.getByText("Ready again.")).toBeVisible();
});

test("preserves multiline text and supports keyboard submission", async ({
  page,
}) => {
  await page.route("**/api/v1/chat", (route) =>
    route.fulfill({ contentType: "text/plain", body: "Two lines received." }),
  );
  await openChat(page);
  const input = page.getByRole("textbox");
  await input.fill("First line");
  await input.press("Enter");
  await input.pressSequentially("Second line");
  await expect(input).toHaveValue("First line\nSecond line");
  await input.press("Control+Enter");
  await expect(page.getByText("Two lines received.")).toBeVisible();
  await expect(
    page.getByText("First line\nSecond line", { exact: true }),
  ).toHaveCSS("white-space", "pre-wrap");
});

test("follows replies, preserves reading position, and jumps to the latest message", async ({
  page,
}) => {
  const reply = Array.from(
    { length: 40 },
    (_, index) => `Paragraph ${index + 1}: A little more detail to read.`,
  ).join("\n\n");
  await page.route("**/api/v1/chat", (route) =>
    route.fulfill({ contentType: "text/plain", body: reply }),
  );
  await openChat(page);
  await sendMessage(page, "Give me a detailed reply.");
  const conversation = page.getByRole("region", { name: "Chat conversation" });
  const atBottom = () =>
    conversation.evaluate(
      (element) =>
        element.scrollHeight - element.scrollTop - element.clientHeight < 2,
    );
  await expect.poll(atBottom).toBe(true);
  await conversation.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(
    page.getByRole("button", { name: "Jump to latest" }),
  ).toBeVisible();
  await sendMessage(page, "Tell me more.");
  await expect
    .poll(() => conversation.evaluate((element) => element.scrollTop))
    .toBe(0);
  await page.getByRole("button", { name: "Jump to latest" }).click();
  await expect.poll(atBottom).toBe(true);
  await expect(
    page.getByRole("button", { name: "Jump to latest" }),
  ).toHaveCount(0);
});

for (const width of [320, 390]) {
  test(`keeps the welcome and composer usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await openChat(page);
    await expect(
      page.getByRole("heading", { name: "Where should we begin?" }),
    ).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Send", exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole("button", { name: /Switch to light mode/ }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
