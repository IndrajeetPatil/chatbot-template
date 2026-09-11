import { expect, test } from "@playwright/test";
import { StatusCodes } from "http-status-codes";
import { getModelDisplay, getReasoningEffortDisplay } from "@/client/helpers";
import { AssistantModel, ReasoningEffort } from "@/client/types/assistant";

interface ChatBody {
  model: string;
  reasoning_effort: string;
  messages: Array<{
    role: string;
    parts: Array<{ type: string; text: string }>;
  }>;
}

const CHAT_API_PATH = "**/api/v1/chat";

for (const model of Object.values(AssistantModel)) {
  for (const effort of Object.values(ReasoningEffort)) {
    test(`${model} with ${effort} reasoning effort`, async ({ page }) => {
      const expectedResponse = "Test received! How can I assist you today?";
      await page.route(CHAT_API_PATH, async (route) => {
        const body = route.request().postDataJSON() as ChatBody;
        expect(body.model).toBe(model);
        expect(body.reasoning_effort).toBe(effort);
        expect(body).not.toHaveProperty("temperature");
        expect(body.messages[body.messages.length - 1].parts).toEqual([
          { type: "text", text: "test message" },
        ]);
        await route.fulfill({
          body: expectedResponse,
          contentType: "text/plain; charset=utf-8",
          status: StatusCodes.OK,
        });
      });

      await page.goto("/chat");
      await page
        .getByRole("button", { name: /Select assistant model/ })
        .click();
      await page
        .getByRole("menuitem", {
          name: getModelDisplay(model),
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: /Select reasoning effort/ })
        .click();
      await page
        .getByRole("menuitem", {
          name: getReasoningEffortDisplay(effort),
          exact: true,
        })
        .click();
      await page
        .getByRole("textbox", { name: "Message", exact: true })
        .fill("test message");
      await page.locator("form").getByRole("button", { name: "Send" }).click();
      await expect(page.getByText(expectedResponse)).toBeVisible();
    });
  }
}

test("follow-up and regeneration send text-only conversation history", async ({
  page,
}) => {
  const requests: ChatBody[] = [];
  await page.route(CHAT_API_PATH, async (route) => {
    const body = route.request().postDataJSON() as ChatBody;
    requests.push(body);
    expect(body.model).toBe(AssistantModel.ASTRA);
    expect(body.reasoning_effort).toBe(ReasoningEffort.LOW);
    for (const message of body.messages) {
      expect(message.parts.every((part) => part.type === "text")).toBe(true);
    }
    await route.fulfill({
      body: `Response ${requests.length}`,
      contentType: "text/plain; charset=utf-8",
      status: StatusCodes.OK,
    });
  });

  await page.goto("/chat");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("First question");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("Response 1", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Follow-up");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("Response 2", { exact: true })).toBeVisible();
  expect(requests[1].messages.slice(1)).toEqual([
    { role: "user", parts: [{ type: "text", text: "First question" }] },
    { role: "assistant", parts: [{ type: "text", text: "Response 1" }] },
    { role: "user", parts: [{ type: "text", text: "Follow-up" }] },
  ]);
  await page.getByRole("button", { name: "Regenerate response" }).click();
  await expect(page.getByText("Response 3", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(3);
  expect(requests[2].messages).toEqual(requests[1].messages);
});
