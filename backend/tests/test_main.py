from typing import TYPE_CHECKING

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.entities import AssistantModel, AssistantTemperature, OpenAIMessageRole
from app.main import TextPart, UIMessage, app, limiter

if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Iterator

    import openai
    from httpx2 import Response as TestClientResponse


@pytest.fixture(autouse=True)
def _reset_rate_limiter() -> None:
    limiter._storage.reset()  # ruff:ignore[private-member-access]


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def raising_client() -> TestClient:
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture
def hi_message() -> dict[str, object]:
    return {
        "role": "user",
        "parts": [
            {
                "type": "text",
                "text": "Hi",
            },
        ],
    }


def test_post_chat_stream_success(
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
    hi_message: dict[str, object],
) -> None:
    calls: list[dict[str, object]] = []

    def mock_stream(**kwargs: object) -> Iterator[str]:
        calls.append(kwargs)
        yield "Hello"
        yield " world"

    monkeypatch.setattr("app.main.stream_azure_openai_response", mock_stream)

    response: TestClientResponse = client.post(
        "/api/v1/chat",
        json={
            "messages": [hi_message],
            "model": "gpt-4o-mini",
            "temperature": "BALANCED",
        },
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.text == "Hello world"
    assert response.headers["content-type"].startswith("text/plain")
    assert calls == [
        {
            "messages": [{"role": "user", "content": "Hi"}],
            "model": AssistantModel.MINI,
            "temperature": AssistantTemperature.BALANCED,
        },
    ]


def test_post_chat_rejects_empty_messages(client: TestClient) -> None:
    response: TestClientResponse = client.post(
        "/api/v1/chat",
        json={
            "messages": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "type": "text",
                            "text": "  ",
                        },
                    ],
                },
            ],
        },
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"detail": "At least one text message is required."}


@pytest.mark.parametrize(
    ("model", "temperature"),
    [
        ("invalid_model", "BALANCED"),
        ("gpt-4o", "HOT"),
        ("invalid_model", "HOT"),
    ],
)
def test_post_chat_rejects_invalid_model_or_temperature(
    client: TestClient,
    hi_message: dict[str, object],
    model: str,
    temperature: str,
) -> None:
    response: TestClientResponse = client.post(
        "/api/v1/chat",
        json={
            "messages": [hi_message],
            "model": model,
            "temperature": temperature,
        },
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_post_chat_rejects_too_many_messages(
    client: TestClient,
    hi_message: dict[str, object],
) -> None:
    response: TestClientResponse = client.post(
        "/api/v1/chat",
        json={"messages": [hi_message] * 51},
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_post_chat_rejects_message_content_too_long(client: TestClient) -> None:
    response: TestClientResponse = client.post(
        "/api/v1/chat",
        json={
            "messages": [
                {
                    "role": "user",
                    "content": "x" * 32_001,
                },
            ],
        },
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_chat_endpoint_rate_limits_after_threshold(
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
    hi_message: dict[str, object],
) -> None:
    def mock_stream(**_: object) -> Iterator[str]:
        yield "ok"

    monkeypatch.setattr("app.main.stream_azure_openai_response", mock_stream)
    # `settings` is frozen, so swap the whole module-global instance (which the
    # rate-limit lambda reads at call time) instead of mutating it in place.
    low_limit_settings: Settings = Settings(testing=True, chat_rate_limit="1/minute")
    monkeypatch.setattr("app.main.settings", low_limit_settings)

    payload: dict[str, object] = {"messages": [hi_message]}

    assert client.post("/api/v1/chat", json=payload).status_code == status.HTTP_200_OK

    response: TestClientResponse = client.post("/api/v1/chat", json=payload)
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert response.json() == {"detail": "Rate limit exceeded. Please try again later."}


def test_health(client: TestClient) -> None:
    response: TestClientResponse = client.get("/health")

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


def test_ui_message_text_returns_content_field() -> None:
    message: UIMessage = UIMessage(
        role=OpenAIMessageRole.USER,
        content="Hello from content",
    )
    assert message.text == "Hello from content"


def test_ui_message_text_returns_joined_parts() -> None:
    message: UIMessage = UIMessage(
        role=OpenAIMessageRole.USER,
        parts=[
            TextPart(type="text", text="Hello "),
            TextPart(type="text", text="world"),
        ],
    )
    assert message.text == "Hello world"


def test_ui_message_rejects_empty_content_and_parts() -> None:
    with pytest.raises(
        ValidationError,
        match="At least one of 'content' or 'parts' must be provided",
    ):
        UIMessage(role=OpenAIMessageRole.USER)


def test_stream_chat_reraises_non_openai_exception(
    monkeypatch: pytest.MonkeyPatch,
    raising_client: TestClient,
    hi_message: dict[str, object],
) -> None:
    def mock_stream(**kwargs: object) -> None:
        msg: str = "Upstream failure"
        raise RuntimeError(msg)

    monkeypatch.setattr("app.main.stream_azure_openai_response", mock_stream)

    with pytest.raises(RuntimeError, match="Upstream failure"):
        raising_client.post(
            "/api/v1/chat",
            json={"messages": [hi_message]},
        )


def test_stream_chat_reraises_openai_api_errors(
    monkeypatch: pytest.MonkeyPatch,
    raising_client: TestClient,
    openai_api_error: openai.APIError,
    hi_message: dict[str, object],
) -> None:
    def mock_stream(**kwargs: object) -> None:
        raise openai_api_error

    monkeypatch.setattr("app.main.stream_azure_openai_response", mock_stream)

    with pytest.raises(type(openai_api_error)):
        raising_client.post(
            "/api/v1/chat",
            json={"messages": [hi_message]},
        )
