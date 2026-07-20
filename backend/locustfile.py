import json
from http import HTTPStatus
from random import choice
from typing import TYPE_CHECKING

from locust import HttpUser, between, task

if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Callable


class ChatAPIUser(HttpUser):
    # Wait between 1 to 5 seconds between tasks
    wait_time: Callable[..., float] = between(1, 5)

    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, **kwargs)
        self.models = ["gpt-4o", "gpt-4o-mini"]
        self.temperatures = ["DETERMINISTIC", "BALANCED", "CREATIVE"]
        self.headers = {"Content-Type": "application/json"}

        self.test_prompts = [
            "Tell me about artificial intelligence",
            "What is machine learning?",
            "Explain neural networks",
            "How does deep learning work?",
            "What is natural language processing?",
        ]

    @task(1)
    def chat_request(self) -> None:
        model: str = choice(self.models)  # ruff:ignore[suspicious-non-cryptographic-random-usage]
        temperature: str = choice(self.temperatures)  # ruff:ignore[suspicious-non-cryptographic-random-usage]
        prompt: str = choice(self.test_prompts)  # ruff:ignore[suspicious-non-cryptographic-random-usage]
        payload: dict[str, object] = {
            "messages": [
                {
                    "role": "user",
                    "parts": [{"type": "text", "text": prompt}],
                },
            ],
            "model": model,
            "temperature": temperature,
        }

        with self.client.post(
            "api/v1/chat",
            data=json.dumps(payload),
            headers=self.headers,
            catch_response=True,
        ) as response:
            if response.status_code == HTTPStatus.OK:
                response.success()
            else:
                response.failure(
                    f"Request failed with status code: {response.status_code}",
                )
