import { expect, test } from "vite-plus/test";

import {
  getModelDisplay,
  getReasoningEffortDisplay,
  toBackendMessages,
} from "./helpers";
import { AssistantModel, ReasoningEffort } from "./types/assistant";

test("preserves conversation text while removing SDK step markers", () => {
  expect(
    toBackendMessages([
      { id: "user", role: "user", parts: [{ type: "text", text: "Hello" }] },
      {
        id: "assistant",
        role: "assistant",
        parts: [
          { type: "step-start" },
          { type: "text", text: "First", state: "done" },
          { type: "step-start" },
          { type: "text", text: " second" },
        ],
      },
    ]),
  ).toStrictEqual([
    { role: "user", parts: [{ type: "text", text: "Hello" }] },
    {
      role: "assistant",
      parts: [
        { type: "text", text: "First" },
        { type: "text", text: " second" },
      ],
    },
  ]);
});

test("labels every supported model", () => {
  const labels = Object.values(AssistantModel).map((model) =>
    getModelDisplay(model),
  );
  expect(labels).toStrictEqual(["GPT-6 Astra", "GPT-5.6 Sol"]);
});

test("labels every supported reasoning effort", () => {
  const labels = Object.values(ReasoningEffort).map((effort) =>
    getReasoningEffortDisplay(effort),
  );
  expect(labels).toStrictEqual(["Low", "Medium", "High"]);
});
