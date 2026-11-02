"""Tests for the FastAPI endpoints."""

lazy from typing import TYPE_CHECKING, Any

lazy import pytest
lazy from fastapi import status
lazy from fastapi.testclient import TestClient
lazy from inline_snapshot import snapshot

lazy from app.config import Settings
lazy from app.main import RESPONSE_FORMAT_INSTRUCTIONS, app, limiter

if TYPE_CHECKING:
    lazy from collections.abc import Iterator

    lazy from httpx2 import Response as TestClientResponse
    lazy from starlette.types import ASGIApp, Receive, Scope, Send

    lazy from app.azure_client import ChatMessage
    lazy from app.entities import AssistantModel, ReasoningEffort

type Payload = dict[str, Any]


@pytest.fixture(autouse=True)
def _reset_rate_limiter() -> None:
    limiter.storage.reset()


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
    ("message", "expected"),
    [
        pytest.param(
            parts_message("Hi"),
            snapshot([
                {
                    "conversation": [{"role": "user", "content": "Hi"}],
                    "model": "gpt-5.6-sol",
                    "reasoning_effort": "medium",
                },
            ]),
            id="single-part",
        ),
        pytest.param(
            parts_message("Hello ", "world"),
            snapshot([
                {
                    "conversation": [{"role": "user", "content": "Hello world"}],
                    "model": "gpt-5.6-sol",
                    "reasoning_effort": "medium",
                },
            ]),
            id="joined-parts",
        ),
        pytest.param(
            content_message("Hello from content"),
            snapshot([
                {
                    "conversation": [{"role": "user", "content": "Hello from content"}],
                    "model": "gpt-5.6-sol",
                    "reasoning_effort": "medium",
                },
            ]),
            id="content-field",
        ),
    ],
)
def test_post_chat_streams_and_forwards_the_conversation(
    client: TestClient,
    forwarded: list[Payload],
    message: Payload,
    expected: object,
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
    # The system prompt has its own test below; snapshotting everything else
    # also catches a field the endpoint starts forwarding unnoticed.
    assert [
        {key: value for key, value in call.items() if key != "system"}
        for call in forwarded
    ] == expected


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
        pytest.param(
            {"messages": []},
            snapshot([
                {
                    "type": "too_short",
                    "loc": ["body", "messages"],
                    "msg": "List should have at least 1 item after validation, not 0",
                },
            ]),
            id="no-messages",
        ),
        pytest.param(
            {"messages": [HI] * 51},
            snapshot([
                {
                    "type": "too_long",
                    "loc": ["body", "messages"],
                    "msg": "List should have at most 50 items after validation, not 51",
                },
            ]),
            id="too-many-messages",
        ),
        pytest.param(
            {"messages": [{"role": "user"}]},
            snapshot([
                {
                    "type": "value_error",
                    "loc": ["body", "messages", 0],
                    "msg": "Value error, At least one of 'content' or 'parts' must be provided.",
                },
            ]),
            id="neither-content-nor-parts",
        ),
        pytest.param(
            {"messages": [{"role": "bard", "content": "Hi"}]},
            snapshot([
                {
                    "type": "enum",
                    "loc": ["body", "messages", 0, "role"],
                    "msg": "Input should be 'system', 'user' or 'assistant'",
                },
            ]),
            id="unknown-role",
        ),
        pytest.param(
            {"messages": [content_message("x" * 32_001)]},
            snapshot([
                {
                    "type": "string_too_long",
                    "loc": ["body", "messages", 0, "content"],
                    "msg": "String should have at most 32000 characters",
                },
            ]),
            id="content-too-long",
        ),
        pytest.param(
            {"messages": [parts_message(*["x"] * 51)]},
            snapshot([
                {
                    "type": "too_long",
                    "loc": ["body", "messages", 0, "parts"],
                    "msg": "List should have at most 50 items after validation, not 51",
                },
            ]),
            id="too-many-parts",
        ),
        pytest.param(
            {"messages": [parts_message(*["x" * 10_000] * 4)]},
            snapshot([
                {
                    "type": "value_error",
                    "loc": ["body", "messages", 0],
                    "msg": "Value error, Joined message text must not exceed 32000 characters.",
                },
            ]),
            id="joined-parts-too-long",
        ),
        pytest.param(
            {"messages": [HI], "model": "gpt-7-nova"},
            snapshot([
                {
                    "type": "enum",
                    "loc": ["body", "model"],
                    "msg": "Input should be 'gpt-6-astra' or 'gpt-5.6-sol'",
                },
            ]),
            id="unknown-model",
        ),
        pytest.param(
            {"messages": [HI], "reasoning_effort": "HOT"},
            snapshot([
                {
                    "type": "enum",
                    "loc": ["body", "reasoning_effort"],
                    "msg": "Input should be 'low', 'medium' or 'high'",
                },
            ]),
            id="unknown-reasoning-effort",
        ),
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


@pytest.fixture
def low_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    # `settings` is frozen, so swap the whole module-global instance (which the
    # rate limiter reads at call time) instead of mutating it in place.
    low_limit: Settings = Settings(testing=True, chat_rate_limit="1/minute")
    monkeypatch.setattr("app.main.settings", low_limit)


async def _without_client_address(scope: Scope, receive: Receive, send: Send) -> None:
    """Serve `app` without a client address.

    An ASGI server listening on a Unix socket, for example, omits it.
    """
    await app({**scope, "client": None}, receive, send)


@pytest.mark.parametrize(
    "asgi_app",
    [
        pytest.param(app, id="client-address"),
        pytest.param(_without_client_address, id="no-client-address"),
    ],
)
def test_post_chat_rate_limits_after_threshold(
    low_rate_limit: None,
    forwarded: list[Payload],
    asgi_app: ASGIApp,
) -> None:
    client: TestClient = TestClient(asgi_app)
    payload: Payload = {"messages": [HI]}
    assert client.post("/api/v1/chat", json=payload).status_code == status.HTTP_200_OK

    response: TestClientResponse = client.post("/api/v1/chat", json=payload)

    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert response.json() == {"detail": "Rate limit exceeded. Please try again later."}
    assert len(forwarded) == 1


def test_post_chat_rate_limits_each_client_address_separately(
    low_rate_limit: None,
    forwarded: list[Payload],
) -> None:
    for host in ("203.0.113.7", "203.0.113.8"):
        response: TestClientResponse = TestClient(app, client=(host, 50000)).post(
            "/api/v1/chat",
            json={"messages": [HI]},
        )
        assert response.status_code == status.HTTP_200_OK

    assert len(forwarded) == 2


def test_post_chat_invalid_requests_do_not_consume_rate_limit(
    low_rate_limit: None,
    client: TestClient,
    forwarded: list[Payload],
) -> None:
    invalid: TestClientResponse = client.post("/api/v1/chat", json={"messages": []})
    assert invalid.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    response: TestClientResponse = client.post(
        "/api/v1/chat",
        json={"messages": [HI]},
    )

    assert response.status_code == status.HTTP_200_OK
    assert len(forwarded) == 1


def test_health(client: TestClient) -> None:
    response: TestClientResponse = client.get("/health")

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


def test_post_chat_propagates_streaming_failures(
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
) -> None:
    def stub(**_: object) -> Iterator[str]:
        msg = "unexpected failure"
        raise RuntimeError(msg)

    monkeypatch.setattr("app.main.stream_azure_openai_response", stub)

    with pytest.raises(RuntimeError, match="unexpected failure"):
        client.post("/api/v1/chat", json={"messages": [HI]})
