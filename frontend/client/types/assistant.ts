import { z } from "zod";

export const AssistantModelSchema = z.enum({
  ASTRA: "gpt-6-astra",
  SOL: "gpt-5.6-sol",
});

export type AssistantModel = z.infer<typeof AssistantModelSchema>;

export const AssistantModel = AssistantModelSchema.enum;

export const ReasoningEffortSchema = z.enum({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>;

export const ReasoningEffort = ReasoningEffortSchema.enum;
