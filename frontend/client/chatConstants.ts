import type { UIMessage } from "@ai-sdk/react";
import { z } from "zod";

const INITIAL_MESSAGE_ID = "initial-message";
const CHAT_API_URL = "/api/v1/chat";

// Mirror the backend's per-message limit (`_MAX_MESSAGE_CHARS` in app/main.py)
// so the client can give instant feedback before a server round-trip.
const MAX_MESSAGE_CHARS = 32_000;

// Same rule the server enforces: non-empty after trimming, within the size cap.
// Client-side validation is for UX; the server still validates for security.
const ChatMessageTextSchema = z.string().trim().min(1).max(MAX_MESSAGE_CHARS);
const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: INITIAL_MESSAGE_ID,
    role: "assistant",
    parts: [
      { type: "text", text: "Hi, I am a chat bot. How can I help you today?" },
    ],
  },
];

export {
  CHAT_API_URL,
  ChatMessageTextSchema,
  INITIAL_MESSAGE_ID,
  INITIAL_MESSAGES,
  MAX_MESSAGE_CHARS,
};
