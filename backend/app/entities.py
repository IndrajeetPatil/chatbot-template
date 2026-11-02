"""Enumerations shared by the API and the Azure OpenAI client."""

lazy from enum import StrEnum


class AssistantModel(StrEnum):
    """Azure OpenAI deployments the chat can use."""

    ASTRA = "gpt-6-astra"
    SOL = "gpt-5.6-sol"


class ReasoningEffort(StrEnum):
    """Reasoning effort levels the models accept."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class OpenAIMessageRole(StrEnum):
    """Chat message roles in the OpenAI format."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
