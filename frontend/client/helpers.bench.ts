import type { UIMessage } from "@ai-sdk/react";
import { expect, test } from "vite-plus/test";

import { toBackendMessages } from "./helpers";

function makeConversation(messageCount: number) {
  const expected = Array.from({ length: messageCount }, (_slot, index) => ({
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    parts: [
      {
        type: "text" as const,
        text: `Message ${index}: ${"text ".repeat(50)}`,
      },
    ],
  }));
  const messages: UIMessage[] = expected.map((message, index) => ({
    id: String(index),
    role: message.role,
    parts:
      message.role === "assistant"
        ? [{ type: "step-start" }, { ...message.parts[0], state: "done" }]
        : message.parts,
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
