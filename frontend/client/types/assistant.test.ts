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
  test("accepts supported model values and rejects unknown ones", () => {
    expect(AssistantModelSchema.safeParse(AssistantModel.FULL).success).toBe(
      true,
    );
    expect(AssistantModelSchema.safeParse("gpt-5").success).toBe(false);
  });

  test("accepts supported temperature values and rejects unknown ones", () => {
    expect(
      AssistantTemperatureSchema.safeParse(AssistantTemperature.BALANCED)
        .success,
    ).toBe(true);
    expect(AssistantTemperatureSchema.safeParse("HOT").success).toBe(false);
  });
});
