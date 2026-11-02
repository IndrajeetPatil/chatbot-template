"""Locust load test for the chat endpoint."""

lazy from random import choice
lazy from typing import TYPE_CHECKING

lazy from locust import HttpUser, between, task

lazy from app.entities import AssistantModel, ReasoningEffort

if TYPE_CHECKING:
    lazy from collections.abc import Callable

PROMPTS: list[str] = [
    "Tell me about artificial intelligence",
    "What is machine learning?",
    "Explain neural networks",
    "How does deep learning work?",
    "What is natural language processing?",
]


class ChatAPIUser(HttpUser):
    """A simulated user sending a random prompt every few seconds."""

    wait_time: Callable[..., float] = between(1, 5)

    # Locust reports any 4xx/5xx status or connection error as a failure.
    @task
    def chat_request(self) -> None:
        """Send one chat request with a random prompt, model and effort."""
        self.client.post(
            "api/v1/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "parts": [{"type": "text", "text": choice(PROMPTS)}],
                    },
                ],
                "model": choice(list(AssistantModel)),
                "reasoning_effort": choice(list(ReasoningEffort)),
            },
        )
