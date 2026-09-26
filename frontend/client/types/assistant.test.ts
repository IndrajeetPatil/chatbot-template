import { fc } from "@fast-check/vitest";
import { describe, expect, test } from "vite-plus/test";
import { ZodError } from "zod";

import {
  AssistantModel,
  AssistantModelSchema,
  ReasoningEffort,
  ReasoningEffortSchema,
} from "./assistant";

describe("assistant type values", () => {
  test("exposes supported assistant models", () => {
    expect(Object.values(AssistantModel)).toStrictEqual([
      "gpt-6-astra",
      "gpt-5.6-sol",
    ]);
  });

  test("exposes supported assistant reasoning efforts", () => {
    expect(Object.values(ReasoningEffort)).toStrictEqual([
      "low",
      "medium",
      "high",
    ]);
  });
});

describe("assistant schemas", () => {
  const modelValues: string[] = Object.values(AssistantModel);
  const reasoningEffortValues: string[] = Object.values(ReasoningEffort);

  test("accepts every supported model value", () => {
    fc.assert(
      fc.property(fc.constantFrom(...modelValues), (model) => {
        expect(AssistantModelSchema.parse(model)).toBe(model);
      }),
    );
  });

  test("rejects any value outside the supported models", () => {
    fc.assert(
      fc.property(
        fc.string().filter((value) => !modelValues.includes(value)),
        (value) => {
          expect(() => AssistantModelSchema.parse(value)).toThrow(ZodError);
        },
      ),
    );
  });

  test("accepts every supported reasoning effort value", () => {
    fc.assert(
      fc.property(fc.constantFrom(...reasoningEffortValues), (effort) => {
        expect(ReasoningEffortSchema.parse(effort)).toBe(effort);
      }),
    );
  });

  test("rejects any value outside the supported reasoning efforts", () => {
    fc.assert(
      fc.property(
        fc.string().filter((value) => !reasoningEffortValues.includes(value)),
        (value) => {
          expect(() => ReasoningEffortSchema.parse(value)).toThrow(ZodError);
        },
      ),
    );
  });
});
