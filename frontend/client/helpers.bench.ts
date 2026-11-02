import type { UIMessage } from "@ai-sdk/react";
import { expect, test } from "vite-plus/test";

import { toBackendMessages } from "./helpers";

function makeConversation(messageCount: number) {
  const conversation = Array.from({ length: messageCount }, (_slot, index) => ({
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    text: `Message ${index}: ${"text ".repeat(50)}`,
  }));
  const expected = conversation.map(({ role, text }) => ({
    role,
    parts: [{ type: "text" as const, text }],
  }));
  const messages: UIMessage[] = conversation.map(({ role, text }, index) => ({
    id: String(index),
    role,
    parts:
      role === "assistant"
        ? [{ type: "step-start" }, { type: "text", text, state: "done" }]
        : [{ type: "text", text }],
  }));
  return { expected, messages };
}

test.for([10, 100, 1000])(
  "prepare a request with %i messages",
  async (messageCount, { bench }) => {
    const { expected, messages } = makeConversation(messageCount);

    // Cache the import to avoid measuring Vite's module-export getter.
    const convert = toBackendMessages;
    let result: ReturnType<typeof convert> = [];

    await bench("strip SDK metadata", () => {
      result = convert(messages);
    }).run();

    // Consume the result outside the timed loop and verify the request contract.
    expect(result).toStrictEqual(expected);
  },
);
