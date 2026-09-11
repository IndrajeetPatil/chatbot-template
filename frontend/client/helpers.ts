import type { UIMessage } from "@ai-sdk/react";
import { AssistantModel, ReasoningEffort } from "./types/assistant.ts";

const MODEL_LABELS: Record<AssistantModel, string> = {
  [AssistantModel.ASTRA]: "GPT-6 Astra",
  [AssistantModel.SOL]: "GPT-5.6 Sol",
};

const REASONING_EFFORT_LABELS: Record<ReasoningEffort, string> = {
  [ReasoningEffort.LOW]: "Low",
  [ReasoningEffort.MEDIUM]: "Medium",
  [ReasoningEffort.HIGH]: "High",
};

const getModelDisplay = (model: AssistantModel) => MODEL_LABELS[model];

const getReasoningEffortDisplay = (reasoningEffort: ReasoningEffort) =>
  REASONING_EFFORT_LABELS[reasoningEffort];

// The text-only backend must not receive SDK metadata such as step-start parts.
const toBackendMessages = (messages: UIMessage[]) =>
  messages.map(({ role, parts }) => ({
    role,
    parts: parts
      .filter((part) => part.type === "text")
      .map(({ text }) => ({
        type: "text" as const,
        text,
      })),
  }));

export { getModelDisplay, getReasoningEffortDisplay, toBackendMessages };
