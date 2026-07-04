import { fc, test } from "@fast-check/vitest";

import {
  AssistantModel,
  AssistantModelSchema,
  AssistantTemperature,
  AssistantTemperatureSchema,
} from "./assistant";

describe("assistant type values", () => {
  test("exposes supported assistant models", () => {
    expect(Object.values(AssistantModel)).toEqual(["gpt-4o", "gpt-4o-mini"]);
  });

  test("exposes supported assistant temperatures", () => {
    expect(Object.values(AssistantTemperature)).toEqual([
      "DETERMINISTIC",
      "BALANCED",
      "CREATIVE",
    ]);
  });
});

describe("assistant schemas", () => {
  const modelValues: string[] = Object.values(AssistantModel);
  const temperatureValues: string[] = Object.values(AssistantTemperature);

  test.prop([fc.constantFrom(...modelValues)])(
    "accepts every supported model value",
    (model) => AssistantModelSchema.safeParse(model).success,
  );

  test.prop([fc.string().filter((s) => !modelValues.includes(s))])(
    "rejects any value outside the supported models",
    (value) => !AssistantModelSchema.safeParse(value).success,
  );

  test.prop([fc.constantFrom(...temperatureValues)])(
    "accepts every supported temperature value",
    (temperature) => AssistantTemperatureSchema.safeParse(temperature).success,
  );

  test.prop([fc.string().filter((s) => !temperatureValues.includes(s))])(
    "rejects any value outside the supported temperatures",
    (value) => !AssistantTemperatureSchema.safeParse(value).success,
  );
});
