import type { UIMessage } from "@ai-sdk/react";

const INITIAL_MESSAGE_ID = "initial-message";
const CHAT_API_URL = "/api/v1/chat";
const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: INITIAL_MESSAGE_ID,
    role: "assistant",
    parts: [
      { type: "text", text: "Hi, I am a chat bot. How can I help you today?" },
    ],
  },
];

export { CHAT_API_URL, INITIAL_MESSAGE_ID, INITIAL_MESSAGES };
