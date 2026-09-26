import { expect, test, describe } from "vite-plus/test";

import {
  CHAT_API_URL,
  INITIAL_MESSAGE_ID,
  INITIAL_MESSAGES,
} from "./chatConstants";

describe("chatConstants", () => {
  test("identifies the initial message", () => {
    expect(INITIAL_MESSAGE_ID).toBe("initial-message");
  });

  test("sends chat requests through the same-origin proxy path", () => {
    expect(CHAT_API_URL).toBe("/api/v1/chat");
  });

  test("starts the conversation with one assistant greeting", () => {
    expect(INITIAL_MESSAGES).toHaveLength(1);
    expect(INITIAL_MESSAGES[0].role).toBe("assistant");
    expect(INITIAL_MESSAGES[0].id).toBe(INITIAL_MESSAGE_ID);
    expect(INITIAL_MESSAGES[0].parts[0]).toStrictEqual({
      type: "text",
      text: "Hi, I am a chat bot. How can I help you today?",
    });
  });
});
