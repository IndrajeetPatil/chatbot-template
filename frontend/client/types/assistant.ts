import { z } from "zod";

export const AssistantModelSchema = z.enum(["gpt-6-astra", "gpt-5.6-sol"]);

export type AssistantModel = z.infer<typeof AssistantModelSchema>;

export const AssistantModel = {
  ASTRA: "gpt-6-astra",
  SOL: "gpt-5.6-sol",
} as const satisfies Record<string, AssistantModel>;

export const ReasoningEffortSchema = z.enum(["low", "medium", "high"]);

export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>;

export const ReasoningEffort = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const satisfies Record<string, ReasoningEffort>;
