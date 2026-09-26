import { fc } from "@fast-check/vitest";
import { describe, expect, test } from "vite-plus/test";

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

const supportedModels = fc.constantFrom(...Object.values(AssistantModel));
const supportedEfforts = fc.constantFrom(...Object.values(ReasoningEffort));

describe(getModelDisplay, () => {
  test.each([
    [AssistantModel.ASTRA, "GPT-6 Astra"],
    [AssistantModel.SOL, "GPT-5.6 Sol"],
  ])("returns %s for model %s", (model, expected) => {
    expect(getModelDisplay(model)).toBe(expected);
  });

  test("returns a non-empty label for every supported model", () => {
    fc.assert(
      fc.property(supportedModels, (model) => {
        expect(getModelDisplay(model)).not.toBe("");
      }),
    );
  });
});

describe(getReasoningEffortDisplay, () => {
  test.each([
    [ReasoningEffort.LOW, "Low"],
    [ReasoningEffort.MEDIUM, "Medium"],
    [ReasoningEffort.HIGH, "High"],
  ])("returns %s for reasoning effort %s", (temp, expected) => {
    expect(getReasoningEffortDisplay(temp)).toBe(expected);
  });

  test("returns a non-empty label for every supported reasoning effort", () => {
    fc.assert(
      fc.property(supportedEfforts, (effort) => {
        expect(getReasoningEffortDisplay(effort)).not.toBe("");
      }),
    );
  });
});
