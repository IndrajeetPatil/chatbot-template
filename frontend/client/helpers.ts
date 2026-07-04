import { AssistantModel, AssistantTemperature } from "./types/assistant.ts";

const MODEL_LABELS: Record<AssistantModel, string> = {
  [AssistantModel.FULL]: "GPT-4o",
  [AssistantModel.MINI]: "GPT-4o Mini",
};

const TEMPERATURE_LABELS: Record<AssistantTemperature, string> = {
  [AssistantTemperature.DETERMINISTIC]: "0.2 - More Deterministic",
  [AssistantTemperature.BALANCED]: "0.7 - Balanced",
  [AssistantTemperature.CREATIVE]: "0.9 - More Creative",
};

const getModelDisplay = (model: AssistantModel) => MODEL_LABELS[model];

const getTemperatureDisplay = (temperature: AssistantTemperature) =>
  TEMPERATURE_LABELS[temperature];

export { getModelDisplay, getTemperatureDisplay };
