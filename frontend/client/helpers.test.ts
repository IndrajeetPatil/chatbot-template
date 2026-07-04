import { fc, test } from "@fast-check/vitest";

import { getModelDisplay, getTemperatureDisplay } from "./helpers";
import { AssistantModel, AssistantTemperature } from "./types/assistant";

describe("getModelDisplay", () => {
  test.each([
    [AssistantModel.FULL, "GPT-4o"],
    [AssistantModel.MINI, "GPT-4o Mini"],
  ])("returns %s for model %s", (model, expected) => {
    expect(getModelDisplay(model)).toBe(expected);
  });

  test.prop([fc.constantFrom(...Object.values(AssistantModel))])(
    "returns a non-empty label for every supported model",
    (model) => getModelDisplay(model).length > 0,
  );
});

describe("getTemperatureDisplay", () => {
  test.each([
    [AssistantTemperature.DETERMINISTIC, "0.2 - More Deterministic"],
    [AssistantTemperature.BALANCED, "0.7 - Balanced"],
    [AssistantTemperature.CREATIVE, "0.9 - More Creative"],
  ])("returns %s for temperature %s", (temp, expected) => {
    expect(getTemperatureDisplay(temp)).toBe(expected);
  });

  test.prop([fc.constantFrom(...Object.values(AssistantTemperature))])(
    "returns a non-empty label for every supported temperature",
    (temp) => getTemperatureDisplay(temp).length > 0,
  );
});
