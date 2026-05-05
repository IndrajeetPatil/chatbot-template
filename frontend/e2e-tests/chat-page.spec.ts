import { expect, test } from "@playwright/test";
import { getModelDisplay, getTemperatureDisplay } from "@/client/helpers";
import { AssistantModel, AssistantTemperature } from "@/client/types/assistant";

interface ChatBody {
  model: string;
  temperature: string;
  messages: Array<{
    role: string;
    parts: Array<{ type: string; text: string }>;
  }>;
}

const CHAT_API_PATH = "**/api/v1/chat";

test.describe("Chat Page Model and Temperature Combinations", () => {
  test("should return correct response for selected model and temperature", async ({
    page,
  }) => {
    const expectedResponse = "Test received! How can I assist you today?";
    await page.route(CHAT_API_PATH, async (route) => {
      const request = route.request();
      const body = request.postDataJSON() as ChatBody;

      expect(body.model).toBe(AssistantModel.MINI);
      expect(body.temperature).toBe(AssistantTemperature.DETERMINISTIC);
      expect(body.messages[body.messages.length - 1].parts).toEqual([
        { type: "text", text: "test message" },
      ]);

      await route.fulfill({
        body: expectedResponse,
        contentType: "text/plain; charset=utf-8",
        status: 200,
      });
    });

    await page.goto("/chat");

    // Verify the initial assistant message is present
    await expect(
      page.getByText("Hi, I am a chat bot. How can I help you today?"),
    ).toBeVisible();

    // Set the model and temperature (using selectors or any UI interaction method you have)
    // These are placeholder selectors; adjust according to your actual component structure
    await page.getByRole("button").first().click();
    await page
      .getByRole("menuitem", {
        name: getModelDisplay(AssistantModel.MINI),
        exact: true,
      })
      .click();
    await page.getByRole("button").nth(1).click();
    await page
      .getByRole("menuitem", {
        name: getTemperatureDisplay(AssistantTemperature.DETERMINISTIC),
        exact: true,
      })
      .click();
    await page.getByLabel("Message").click();
    // Send a user message
    await page.getByLabel("Message").click();
    await page.getByLabel("Message").fill("test message");
    await page.locator("form").getByRole("button", { name: "Send" }).click();

    await expect(page.getByText(expectedResponse)).toBeVisible();
  });
});
