from typing import TYPE_CHECKING

import httpx
import openai
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.entities import AssistantModel, AssistantTemperature, OpenAIMessageRole
from app.main import TextPart, UIMessage, app, limiter, settings

if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Iterator

    from httpx import Response


def test_post_chat_stream_success(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[dict[str, object]] = []

    def mock_stream(**kwargs: object) -> Iterator[str]:
        calls.append(kwargs)
        yield "Hello"
        yield " world"

    monkeypatch.setattr("app.main.stream_azure_openai_response", mock_stream)

    client: TestClient = TestClient(app)
    response: Response = client.post(
        "/api/v1/chat",
        json={
            "messages": [
                {
                    "role": "user",
                    "parts": [{"type": "text", "text": "Hi"}],
                },
            ],
            "model": "gpt-4o-mini",
            "temperature": "BALANCED",
        },
    )

    assert response.status_code == 200
    assert response.text == "Hello world"
    assert response.headers["content-type"].startswith("text/plain")
    assert calls == [
        {
            "messages": [{"role": "user", "content": "Hi"}],
            "model": AssistantModel.MINI,
            "temperature": AssistantTemperature.BALANCED,
        },
    ]


def test_post_chat_rejects_empty_messages() -> None:
    client: TestClient = TestClient(app)
    response: Response = client.post(
        "/api/v1/chat",
        json={
            "messages": [{"role": "user", "parts": [{"type": "text", "text": "  "}]}],
        },
    )

    assert response.status_code == 400
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
    model: str,
    temperature: str,
) -> None:
    client: TestClient = TestClient(app)
    response: Response = client.post(
        "/api/v1/chat",
        json={
            "messages": [{"role": "user", "parts": [{"type": "text", "text": "Hi"}]}],
            "model": model,
            "temperature": temperature,
        },
    )

    assert response.status_code == 422


def test_post_chat_rejects_too_many_messages() -> None:
    client: TestClient = TestClient(app)
    response: Response = client.post(
        "/api/v1/chat",
        json={
            "messages": [
                {"role": "user", "parts": [{"type": "text", "text": "Hi"}]},
            ]
            * 51,
        },
    )

    assert response.status_code == 422


def test_post_chat_rejects_message_content_too_long() -> None:
    client: TestClient = TestClient(app)
    response: Response = client.post(
        "/api/v1/chat",
        json={"messages": [{"role": "user", "content": "x" * 32_001}]},
    )

    assert response.status_code == 422


def test_chat_endpoint_rate_limits_after_threshold(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def mock_stream(**_: object) -> Iterator[str]:
        yield "ok"

    monkeypatch.setattr("app.main.stream_azure_openai_response", mock_stream)
    monkeypatch.setattr(settings, "chat_rate_limit", "1/minute")
    limiter._storage.reset()

    client: TestClient = TestClient(app)
    payload: dict[str, object] = {
        "messages": [{"role": "user", "parts": [{"type": "text", "text": "Hi"}]}],
    }

    assert client.post("/api/v1/chat", json=payload).status_code == 200

    response: Response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 429
    assert response.json() == {"detail": "Rate limit exceeded. Please try again later."}


def test_health() -> None:
    client: TestClient = TestClient(app)
    response: Response = client.get("/health")

    assert response.status_code == 200
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
) -> None:
    def mock_stream(**kwargs: object) -> None:
        msg: str = "Upstream failure"
        raise RuntimeError(msg)

    monkeypatch.setattr("app.main.stream_azure_openai_response", mock_stream)

    client: TestClient = TestClient(app, raise_server_exceptions=True)
    with pytest.raises(RuntimeError, match="Upstream failure"):
        client.post(
            "/api/v1/chat",
            json={
                "messages": [
                    {"role": "user", "parts": [{"type": "text", "text": "Hi"}]},
                ],
            },
        )


def _make_openai_request() -> httpx.Request:
    return httpx.Request("POST", "https://example.openai.azure.com/")


def _make_openai_response(status_code: int) -> httpx.Response:
    return httpx.Response(status_code=status_code, request=_make_openai_request())


@pytest.mark.parametrize(
    "exc",
    [
        openai.RateLimitError(
            "rate limit",
            response=_make_openai_response(429),
            body=None,
        ),
        openai.AuthenticationError(
            "auth failed",
            response=_make_openai_response(401),
            body=None,
        ),
        openai.APIConnectionError(
            message="connection failed",
            request=_make_openai_request(),
        ),
        openai.InternalServerError(
            "server error",
            response=_make_openai_response(500),
            body=None,
        ),
    ],
)
def test_stream_chat_reraises_openai_api_errors(
    monkeypatch: pytest.MonkeyPatch,
    exc: openai.APIError,
) -> None:
    captured_exc: openai.APIError = exc

    def mock_stream(**kwargs: object) -> None:
        raise captured_exc

    monkeypatch.setattr("app.main.stream_azure_openai_response", mock_stream)

    client: TestClient = TestClient(app, raise_server_exceptions=True)
    with pytest.raises(type(captured_exc)):
        client.post(
            "/api/v1/chat",
            json={
                "messages": [
                    {"role": "user", "parts": [{"type": "text", "text": "Hi"}]},
                ],
            },
        )
