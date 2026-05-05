import {
  CHAT_API_URL,
  INITIAL_MESSAGE_ID,
  INITIAL_MESSAGES,
} from "./chatConstants";

describe("chatConstants", () => {
  test("INITIAL_MESSAGE_ID is initial-message", () => {
    expect(INITIAL_MESSAGE_ID).toBe("initial-message");
  });

  test("CHAT_API_URL uses the same-origin proxy path", () => {
    expect(CHAT_API_URL).toBe("/api/v1/chat");
  });

  test("INITIAL_MESSAGES contains one assistant message with matching id", () => {
    expect(INITIAL_MESSAGES).toHaveLength(1);
    expect(INITIAL_MESSAGES[0].role).toBe("assistant");
    expect(INITIAL_MESSAGES[0].id).toBe(INITIAL_MESSAGE_ID);
    expect(INITIAL_MESSAGES[0].parts[0]).toEqual({
      type: "text",
      text: "Hi, I am a chat bot. How can I help you today?",
    });
  });
});
