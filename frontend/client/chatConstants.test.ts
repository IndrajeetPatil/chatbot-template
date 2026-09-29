import { expect, test, describe } from "vite-plus/test";

import { CHAT_API_URL, INITIAL_MESSAGES } from "./chatConstants";

describe("chatConstants", () => {
  test("sends chat requests through the same-origin proxy path", () => {
    expect(CHAT_API_URL).toBe("/api/v1/chat");
  });

  test("starts the conversation with one assistant greeting", () => {
    expect(INITIAL_MESSAGES).toStrictEqual([
      {
        id: "initial-message",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Hi, I am a chat bot. How can I help you today?",
          },
        ],
      },
    ]);
  });
});
