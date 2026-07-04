import { z } from "zod";

export const AssistantModelSchema = z.enum(["gpt-4o", "gpt-4o-mini"]);

export type AssistantModel = z.infer<typeof AssistantModelSchema>;

export const AssistantModel = {
  FULL: "gpt-4o",
  MINI: "gpt-4o-mini",
} as const satisfies Record<string, AssistantModel>;

export const AssistantTemperatureSchema = z.enum([
  "DETERMINISTIC",
  "BALANCED",
  "CREATIVE",
]);

export type AssistantTemperature = z.infer<typeof AssistantTemperatureSchema>;

export const AssistantTemperature = {
  DETERMINISTIC: "DETERMINISTIC",
  BALANCED: "BALANCED",
  CREATIVE: "CREATIVE",
} as const satisfies Record<string, AssistantTemperature>;
