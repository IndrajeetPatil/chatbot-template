import { fc, test } from "@fast-check/vitest";

import {
  AssistantModel,
  AssistantModelSchema,
  ReasoningEffort,
  ReasoningEffortSchema,
} from "./assistant";

describe("assistant type values", () => {
  test("exposes supported assistant models", () => {
    expect(Object.values(AssistantModel)).toEqual([
      "gpt-6-astra",
      "gpt-5.6-sol",
    ]);
  });

  test("exposes supported assistant reasoning efforts", () => {
    expect(Object.values(ReasoningEffort)).toEqual(["low", "medium", "high"]);
  });
});

describe("assistant schemas", () => {
  const modelValues: string[] = Object.values(AssistantModel);
  const reasoningEffortValues: string[] = Object.values(ReasoningEffort);

  test.prop([fc.constantFrom(...modelValues)])(
    "accepts every supported model value",
    (model) => AssistantModelSchema.safeParse(model).success,
  );

  test.prop([fc.string().filter((s) => !modelValues.includes(s))])(
    "rejects any value outside the supported models",
    (value) => !AssistantModelSchema.safeParse(value).success,
  );

  test.prop([fc.constantFrom(...reasoningEffortValues)])(
    "accepts every supported reasoning effort value",
    (reasoningEffort) =>
      ReasoningEffortSchema.safeParse(reasoningEffort).success,
  );

  test.prop([fc.string().filter((s) => !reasoningEffortValues.includes(s))])(
    "rejects any value outside the supported reasoning efforts",
    (value) => !ReasoningEffortSchema.safeParse(value).success,
  );
});
