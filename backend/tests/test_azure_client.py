"""Integration tests for the Azure OpenAI client wrapper.

Every test here drives the real `openai` SDK over a mock HTTP transport (see
`tests.azure_double`), so the assertions are about the actual outbound request
and the SDK's real response handling rather than about a stub's bookkeeping.
"""

from typing import TYPE_CHECKING

import httpx2
import openai
import pytest
from fastapi import status
from inline_snapshot import snapshot

from app.azure_client import get_azure_openai_client, stream_azure_openai_response
from app.entities import AssistantModel, ReasoningEffort
from tests.azure_double import (
    CONNECT_ERROR,
    DONE,
    content_chunk,
    error_event,
    error_status,
    keepalive_chunk,
    raw_stream,
    sse_bytes,
    stream_of,
    unreachable,
    usage_chunk,
)

if TYPE_CHECKING:
    from collections.abc import Generator, Iterator

    from openai import AzureOpenAI

    from tests.azure_double import AzureCall
    from tests.conftest import AzureFactory, FakeClock, MetricsReader

PROMPT: list[dict[str, str]] = [{"role": "user", "content": "Test prompt"}]
_MID_STREAM_FAILURE: str = "mid-stream failure"
_STREAM_DROP: str = "connection dropped mid-stream"


def open_stream(
    *,
    model: AssistantModel = AssistantModel.ASTRA,
    reasoning_effort: ReasoningEffort = ReasoningEffort.MEDIUM,
) -> Generator[str]:
    return stream_azure_openai_response(
        messages=PROMPT,
        model=model,
        reasoning_effort=reasoning_effort,
    )


def stream_text(
    *,
    model: AssistantModel = AssistantModel.ASTRA,
    reasoning_effort: ReasoningEffort = ReasoningEffort.MEDIUM,
) -> list[str]:
    return list(open_stream(model=model, reasoning_effort=reasoning_effort))


@pytest.mark.parametrize(
    ("model", "expected"),
    [
        (
            AssistantModel.ASTRA,
            snapshot([
                {
                    "url": "https://example.openai.azure.com/openai/deployments/gpt-6-astra/chat/completions?api-version=2024-02-01",
                    "body": {
                        "messages": [{"role": "user", "content": "Test prompt"}],
                        "model": "gpt-6-astra",
                        "reasoning_effort": "medium",
                        "stream": True,
                        "stream_options": {"include_usage": True},
                    },
                },
            ]),
        ),
        (
            AssistantModel.SOL,
            snapshot([
                {
                    "url": "https://example.openai.azure.com/openai/deployments/gpt-5.6-sol/chat/completions?api-version=2024-02-01",
                    "body": {
                        "messages": [{"role": "user", "content": "Test prompt"}],
                        "model": "gpt-5.6-sol",
                        "reasoning_effort": "medium",
                        "stream": True,
                        "stream_options": {"include_usage": True},
                    },
                },
            ]),
        ),
    ],
)
def test_posts_to_the_model_deployment(
    fake_azure: AzureFactory,
    model: AssistantModel,
    expected: object,
) -> None:
    calls: list[AzureCall] = fake_azure(stream_of(content_chunk("Hi")))

    stream_text(model=model)

    assert [{"url": call.url, "body": call.body} for call in calls] == expected


@pytest.mark.parametrize("reasoning_effort", list(ReasoningEffort))
def test_forwards_the_requested_reasoning_effort(
    fake_azure: AzureFactory,
    reasoning_effort: ReasoningEffort,
) -> None:
    calls: list[AzureCall] = fake_azure(stream_of(content_chunk("Hi")))

    stream_text(reasoning_effort=reasoning_effort)

    assert calls[0].body["reasoning_effort"] == reasoning_effort.value


def test_yields_text_deltas_and_drops_everything_else(
    fake_azure: AzureFactory,
) -> None:
    fake_azure(
        stream_of(
            content_chunk("Hello"),
            content_chunk(None),
            keepalive_chunk(),
            content_chunk(""),
            content_chunk(" world"),
            usage_chunk(),
        ),
    )

    assert stream_text() == snapshot(["Hello", " world"])


def test_releases_the_upstream_response_when_the_consumer_disconnects(
    fake_azure: AzureFactory,
) -> None:
    # The stream is deliberately abandoned mid-way: on a fully consumed body
    # httpx closes the response itself, so only an early disconnect can show
    # that the client releases the connection rather than leaking it.
    calls: list[AzureCall] = fake_azure(
        stream_of(content_chunk("Hi"), content_chunk(" there")),
    )
    stream: Generator[str] = open_stream()
    assert next(stream) == "Hi"

    stream.close()

    assert calls[0].response.is_closed


@pytest.mark.parametrize(
    ("status_code", "expected_error"),
    [
        (status.HTTP_401_UNAUTHORIZED, openai.AuthenticationError),
        (status.HTTP_429_TOO_MANY_REQUESTS, openai.RateLimitError),
        (status.HTTP_400_BAD_REQUEST, openai.BadRequestError),
        (status.HTTP_500_INTERNAL_SERVER_ERROR, openai.InternalServerError),
    ],
)
def test_maps_upstream_status_to_sdk_error(
    fake_azure: AzureFactory,
    status_code: int,
    expected_error: type[openai.APIStatusError],
) -> None:
    fake_azure(error_status(status_code))

    with pytest.raises(expected_error):
        stream_text()


def test_raises_connection_error_when_the_endpoint_is_unreachable(
    fake_azure: AzureFactory,
) -> None:
    fake_azure(unreachable())

    with pytest.raises(openai.APIConnectionError) as caught:
        stream_text()

    # The SDK normalises the message, so the transport failure only survives
    # as the chained cause — that link is what makes the log actionable.
    assert str(caught.value.__cause__) == CONNECT_ERROR


def test_reraises_in_band_error_event_after_partial_content(
    fake_azure: AzureFactory,
) -> None:
    def body() -> Iterator[bytes]:
        yield sse_bytes(content_chunk("partial"))
        yield error_event(_MID_STREAM_FAILURE)

    fake_azure(raw_stream(body))
    received: list[str] = []

    with pytest.raises(openai.APIError, match=_MID_STREAM_FAILURE):
        received.extend(open_stream())

    assert received == snapshot(["partial"])


def test_reraises_connection_drop_after_partial_content(
    fake_azure: AzureFactory,
) -> None:
    def body() -> Iterator[bytes]:
        yield sse_bytes(content_chunk("partial"))
        raise httpx2.ReadError(_STREAM_DROP)

    fake_azure(raw_stream(body))
    received: list[str] = []

    with pytest.raises(openai.APIConnectionError):
        received.extend(open_stream())

    assert received == snapshot(["partial"])


def test_logs_metrics_for_a_completed_stream(
    fake_azure: AzureFactory,
    clock: FakeClock,
    stream_metrics: MetricsReader,
) -> None:
    def body() -> Iterator[bytes]:
        clock.advance(250)
        yield sse_bytes(content_chunk("Hi"), content_chunk("!"))
        clock.advance(250)
        yield sse_bytes(usage_chunk())
        yield DONE

    fake_azure(raw_stream(body))

    assert stream_text() == snapshot(["Hi", "!"])
    assert stream_metrics() == snapshot({
        "event": "azure_openai_stream",
        "status": "completed",
        "model": "gpt-6-astra",
        "reasoning_effort": "medium",
        "duration_ms": 500.0,
        "ttft_ms": 250.0,
        "output_chars": 3,
        "usage_received": True,
        "prompt_tokens": 12,
        "completion_tokens": 12,
        "total_tokens": 24,
    })


def test_logs_error_metrics_when_stream_creation_fails(
    fake_azure: AzureFactory,
    clock: FakeClock,
    stream_metrics: MetricsReader,
) -> None:
    # A request that never yields a stream must still emit one event: this is
    # what pins stream creation inside the metrics context rather than before it.
    def respond(request: httpx2.Request) -> httpx2.Response:
        clock.advance(250)
        return error_status(status.HTTP_500_INTERNAL_SERVER_ERROR)(request)

    fake_azure(respond)

    with pytest.raises(openai.InternalServerError):
        stream_text()

    assert stream_metrics() == snapshot({
        "event": "azure_openai_stream",
        "status": "error",
        "model": "gpt-6-astra",
        "reasoning_effort": "medium",
        "duration_ms": 250.0,
        "ttft_ms": None,
        "output_chars": 0,
        "usage_received": False,
        "prompt_tokens": None,
        "completion_tokens": None,
        "total_tokens": None,
    })


def test_client_is_built_from_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    get_azure_openai_client.cache_clear()

    class StubSettings:
        azure_openai_endpoint: str = "https://test.openai.azure.com/"
        azure_openai_api_key: str = "test-key-123"
        azure_openai_api_version: str = "2024-02-01"

    monkeypatch.setattr("app.azure_client.get_settings", StubSettings)

    client: AzureOpenAI = get_azure_openai_client()
    get_azure_openai_client.cache_clear()

    try:
        wiring: dict[str, object] = {
            "base_url": str(client.base_url),
            "default_query": client.default_query,
            "api_key": client.api_key,
            "max_retries": client.max_retries,
        }
    finally:
        client.close()

    assert wiring == snapshot({
        "base_url": "https://test.openai.azure.com/openai/",
        "default_query": {"api-version": "2024-02-01"},
        "api_key": "test-key-123",
        "max_retries": 5,
    })
