import json
from http import HTTPStatus
from random import choice
from typing import TYPE_CHECKING

from locust import HttpUser, between, task

if TYPE_CHECKING:
    from collections.abc import Callable


class ChatAPIUser(HttpUser):
    # Wait between 1 to 5 seconds between tasks
    wait_time: Callable[..., float] = between(1, 5)

    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, **kwargs)
        self.models = ["gpt-6-astra", "gpt-5.6-sol"]
        self.reasoning_efforts = ["low", "medium", "high"]
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
        model: str = choice(self.models)
        reasoning_effort: str = choice(self.reasoning_efforts)
        prompt: str = choice(self.test_prompts)
        payload: dict[str, object] = {
            "messages": [
                {
                    "role": "user",
                    "parts": [{"type": "text", "text": prompt}],
                },
            ],
            "model": model,
            "reasoning_effort": reasoning_effort,
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
