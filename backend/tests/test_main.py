from typing import TYPE_CHECKING, Any

import httpx2
import openai
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from inline_snapshot import snapshot

from app.config import Settings
from app.main import RESPONSE_FORMAT_INSTRUCTIONS, app, limiter

if TYPE_CHECKING:
    from collections.abc import Iterator

    from httpx2 import Response as TestClientResponse

    from app.azure_client import ChatMessage
    from app.entities import AssistantModel, ReasoningEffort

type Payload = dict[str, Any]


@pytest.fixture(autouse=True)
def _reset_rate_limiter() -> None:
    limiter.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def parts_message(*texts: str) -> Payload:
    return {
        "role": "user",
        "parts": [{"type": "text", "text": text} for text in texts],
    }


def content_message(content: str) -> Payload:
    return {"role": "user", "content": content}


HI: Payload = parts_message("Hi")


@pytest.fixture
def forwarded(monkeypatch: pytest.MonkeyPatch) -> list[Payload]:
    """Record what the endpoint forwards to the Azure client, and stub the stream."""
    calls: list[Payload] = []

    def stub(
        *,
        messages: list[ChatMessage],
        model: AssistantModel,
        reasoning_effort: ReasoningEffort,
    ) -> Iterator[str]:
        calls.append(
            {
                "system": messages[0],
                "conversation": messages[1:],
                "model": model.value,
                "reasoning_effort": reasoning_effort.value,
            },
        )
        yield "Hello"
        yield " world"

    monkeypatch.setattr("app.main.stream_azure_openai_response", stub)
    return calls


def rejection_reasons(response: TestClientResponse) -> list[Payload]:
    """The validation failures behind a 422, minus the echoed input payload."""
    return [
        {"type": error["type"], "loc": error["loc"], "msg": error["msg"]}
        for error in response.json()["detail"]
    ]


@pytest.mark.parametrize(
    ("message", "expected_conversation"),
    [
        (parts_message("Hi"), snapshot([{"role": "user", "content": "Hi"}])),
        (
            parts_message("Hello ", "world"),
            snapshot([{"role": "user", "content": "Hello world"}]),
        ),
        (
            content_message("Hello from content"),
            snapshot([{"role": "user", "content": "Hello from content"}]),
        ),
    ],
    ids=["single-part", "joined-parts", "content-field"],
)
def test_post_chat_streams_and_forwards_the_conversation(
    client: TestClient,
    forwarded: list[Payload],
    message: Payload,
    expected_conversation: object,
) -> None:
    response: TestClientResponse = client.post(
        "/api/v1/chat",
        json={
            "messages": [message],
            "model": "gpt-5.6-sol",
            "reasoning_effort": "medium",
        },
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.text == "Hello world"
    assert response.headers["content-type"].startswith("text/plain")
    assert forwarded[0]["conversation"] == expected_conversation
    assert forwarded[0]["model"] == "gpt-5.6-sol"
    assert forwarded[0]["reasoning_effort"] == "medium"


def test_post_chat_prepends_the_response_format_system_prompt(
    client: TestClient,
    forwarded: list[Payload],
) -> None:
    client.post("/api/v1/chat", json={"messages": [HI]})

    assert forwarded[0]["system"] == {
        "role": "system",
        "content": RESPONSE_FORMAT_INSTRUCTIONS,
    }


@pytest.mark.parametrize(
    ("payload", "expected"),
    [
        (
            {"messages": []},
            snapshot([
                {
                    "type": "too_short",
                    "loc": ["body", "messages"],
                    "msg": "List should have at least 1 item after validation, not 0",
                },
            ]),
        ),
        (
            {"messages": [HI] * 51},
            snapshot([
                {
                    "type": "too_long",
                    "loc": ["body", "messages"],
                    "msg": "List should have at most 50 items after validation, not 51",
                },
            ]),
        ),
        (
            {"messages": [{"role": "user"}]},
            snapshot([
                {
                    "type": "value_error",
                    "loc": ["body", "messages", 0],
                    "msg": "Value error, At least one of 'content' or 'parts' must be provided.",
                },
            ]),
        ),
        (
            {"messages": [{"role": "bard", "content": "Hi"}]},
            snapshot([
                {
                    "type": "enum",
                    "loc": ["body", "messages", 0, "role"],
                    "msg": "Input should be 'system', 'user' or 'assistant'",
                },
            ]),
        ),
        (
            {"messages": [content_message("x" * 32_001)]},
            snapshot([
                {
                    "type": "string_too_long",
                    "loc": ["body", "messages", 0, "content"],
                    "msg": "String should have at most 32000 characters",
                },
            ]),
        ),
        (
            {"messages": [parts_message(*["x"] * 51)]},
            snapshot([
                {
                    "type": "too_long",
                    "loc": ["body", "messages", 0, "parts"],
                    "msg": "List should have at most 50 items after validation, not 51",
                },
            ]),
        ),
        (
            {"messages": [parts_message(*["x" * 10_000] * 4)]},
            snapshot([
                {
                    "type": "value_error",
                    "loc": ["body", "messages", 0],
                    "msg": "Value error, Joined message text must not exceed 32000 characters.",
                },
            ]),
        ),
        (
            {"messages": [HI], "model": "gpt-7-nova"},
            snapshot([
                {
                    "type": "enum",
                    "loc": ["body", "model"],
                    "msg": "Input should be 'gpt-6-astra' or 'gpt-5.6-sol'",
                },
            ]),
        ),
        (
            {"messages": [HI], "reasoning_effort": "HOT"},
            snapshot([
                {
                    "type": "enum",
                    "loc": ["body", "reasoning_effort"],
                    "msg": "Input should be 'low', 'medium' or 'high'",
                },
            ]),
        ),
    ],
    ids=[
        "no-messages",
        "too-many-messages",
        "neither-content-nor-parts",
        "unknown-role",
        "content-too-long",
        "too-many-parts",
        "joined-parts-too-long",
        "unknown-model",
        "unknown-reasoning-effort",
    ],
)
def test_post_chat_rejects_invalid_request(
    client: TestClient,
    payload: Payload,
    expected: object,
) -> None:
    response: TestClientResponse = client.post("/api/v1/chat", json=payload)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert rejection_reasons(response) == expected


def test_post_chat_rejects_whitespace_only_conversation(client: TestClient) -> None:
    response: TestClientResponse = client.post(
        "/api/v1/chat",
        json={"messages": [parts_message("  ")]},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"detail": "At least one text message is required."}


def test_post_chat_rate_limits_after_threshold(
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
    forwarded: list[Payload],
) -> None:
    # `settings` is frozen, so swap the whole module-global instance (which the
    # rate-limit lambda reads at call time) instead of mutating it in place.
    low_limit: Settings = Settings(testing=True, chat_rate_limit="1/minute")
    monkeypatch.setattr("app.main.settings", low_limit)

    payload: Payload = {"messages": [HI]}
    assert client.post("/api/v1/chat", json=payload).status_code == status.HTTP_200_OK

    response: TestClientResponse = client.post("/api/v1/chat", json=payload)

    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert response.json() == {"detail": "Rate limit exceeded. Please try again later."}
    assert len(forwarded) == 1


def test_health(client: TestClient) -> None:
    response: TestClientResponse = client.get("/health")

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


@pytest.mark.parametrize(
    "failure",
    [
        openai.APIError(
            "upstream failure",
            request=httpx2.Request("POST", "https://example.openai.azure.com/"),
            body=None,
        ),
        RuntimeError("unexpected failure"),
    ],
    ids=["openai-api-error", "unexpected-error"],
)
def test_post_chat_propagates_streaming_failures(
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
    failure: Exception,
) -> None:
    def stub(**_: object) -> Iterator[str]:
        raise failure

    monkeypatch.setattr("app.main.stream_azure_openai_response", stub)

    with pytest.raises(type(failure)):
        client.post("/api/v1/chat", json={"messages": [HI]})
