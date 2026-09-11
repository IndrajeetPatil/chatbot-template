from enum import StrEnum


class AssistantModel(StrEnum):
    ASTRA = "gpt-6-astra"
    SOL = "gpt-5.6-sol"


class ReasoningEffort(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class OpenAIMessageRole(StrEnum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
