import json
from contextlib import AbstractContextManager
from typing import TYPE_CHECKING, Any, cast, override

import httpx2
import openai
import pytest
from fastapi import status
from loguru import logger
from openai.types.chat import ChatCompletionChunk
from openai.types.chat.chat_completion_chunk import Choice, ChoiceDelta
from openai.types.completion_usage import CompletionUsage

from app.azure_client import get_azure_openai_client, stream_azure_openai_response
from app.entities import AssistantModel, ReasoningEffort

if TYPE_CHECKING:
    from collections.abc import Generator, Iterable, Iterator
    from types import TracebackType

    from loguru import Message

    from app.stream_metrics import MetricValue


class MockStream(AbstractContextManager["MockStream"]):
    def __init__(self, chunks: Iterable[ChatCompletionChunk]) -> None:
        self.chunks = chunks
        self.closed = False

    def __iter__(self) -> Iterator[ChatCompletionChunk]:
        return iter(self.chunks)

    @override
    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.closed = True


class MockAzureClient:
    def __init__(self) -> None:
        self.chat = self.MockChat()

    class MockChat:
        def __init__(self) -> None:
            self.completions = self.MockCompletions()

        class MockCompletions:
            def __init__(self) -> None:
                self.create_calls: list[dict[str, Any]] = []
                self.return_value: Iterable[ChatCompletionChunk] = []
                self.stream: MockStream | None = None
                self.side_effect: Exception | None = None

            def create(self, **kwargs: object) -> MockStream:
                self.create_calls.append(kwargs)
                if self.side_effect is not None:
                    raise self.side_effect
                self.stream = MockStream(self.return_value)
                return self.stream


def create_chunk(content: str | None) -> ChatCompletionChunk:
    return ChatCompletionChunk(
        id="test-chunk",
        created=0,
        model="gpt-6-astra",
        object="chat.completion.chunk",
        choices=[Choice(index=0, delta=ChoiceDelta(content=content))],
    )


@pytest.fixture
def prompt_messages() -> list[dict[str, str]]:
    return [
        {
            "role": "user",
            "content": "Test prompt",
        },
    ]


@pytest.fixture
def mock_azure_client(monkeypatch: pytest.MonkeyPatch) -> MockAzureClient:
    mock_client: MockAzureClient = MockAzureClient()
    get_azure_openai_client.cache_clear()
    monkeypatch.setattr("app.azure_client.get_azure_openai_client", lambda: mock_client)
    return mock_client


@pytest.mark.parametrize(
    ("model", "expected_model"),
    [
        (AssistantModel.ASTRA, "gpt-6-astra"),
        (AssistantModel.SOL, "gpt-5.6-sol"),
    ],
)
@pytest.mark.parametrize("reasoning_effort", list(ReasoningEffort))
def test_stream_successful_response(
    mock_azure_client: MockAzureClient,
    prompt_messages: list[dict[str, str]],
    model: AssistantModel,
    reasoning_effort: ReasoningEffort,
    expected_model: str,
) -> None:
    mock_azure_client.chat.completions.return_value = [
        create_chunk("Hello"),
        create_chunk(None),
        create_chunk(" world"),
    ]

    response: list[str] = list(
        stream_azure_openai_response(
            messages=prompt_messages,
            model=model,
            reasoning_effort=reasoning_effort,
        ),
    )

    assert response == ["Hello", " world"]
    assert mock_azure_client.chat.completions.create_calls == [
        {
            "model": expected_model,
            "reasoning_effort": reasoning_effort.value,
            "messages": prompt_messages,
            "stream": True,
            "stream_options": {"include_usage": True},
        },
    ]


@pytest.mark.parametrize(
    ("exc_class", "message"),
    [
        (Exception, "API Error"),
        (ValueError, "Bad value"),
        (RuntimeError, "Runtime failure"),
    ],
)
def test_api_exception(
    mock_azure_client: MockAzureClient,
    prompt_messages: list[dict[str, str]],
    exc_class: type[Exception],
    message: str,
) -> None:
    mock_azure_client.chat.completions.side_effect = exc_class(message)

    with pytest.raises(exc_class, match=message):
        list(
            stream_azure_openai_response(
                messages=prompt_messages,
                model=AssistantModel.ASTRA,
                reasoning_effort=ReasoningEffort.MEDIUM,
            ),
        )


def _make_request() -> httpx2.Request:
    return httpx2.Request("POST", "https://example.openai.azure.com/")


def _make_response(status_code: int) -> httpx2.Response:
    return httpx2.Response(
        status_code=status_code,
        request=_make_request(),
    )


def test_openai_api_exceptions_are_reraised(
    mock_azure_client: MockAzureClient,
    prompt_messages: list[dict[str, str]],
    openai_api_error: openai.APIError,
) -> None:
    mock_azure_client.chat.completions.side_effect = openai_api_error

    with pytest.raises(type(openai_api_error)):
        list(
            stream_azure_openai_response(
                messages=prompt_messages,
                model=AssistantModel.ASTRA,
                reasoning_effort=ReasoningEffort.MEDIUM,
            ),
        )


def test_get_azure_openai_client_wires_settings_correctly(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_azure_openai_client.cache_clear()

    class MockSettings:
        azure_openai_endpoint: str = "https://test.openai.azure.com/"
        azure_openai_api_key: str = "test-key-123"
        azure_openai_api_version: str = "2024-02-01"

    monkeypatch.setattr("app.azure_client.get_settings", MockSettings)

    captured: dict[str, object] = {}

    class MockAzureOpenAI:
        def __init__(self, **kwargs: object) -> None:
            captured.update(kwargs)

    monkeypatch.setattr("app.azure_client.AzureOpenAI", MockAzureOpenAI)

    client: object = get_azure_openai_client()
    get_azure_openai_client.cache_clear()

    assert isinstance(client, MockAzureOpenAI)
    assert captured["azure_endpoint"] == "https://test.openai.azure.com/"
    assert captured["api_key"] == "test-key-123"
    assert captured["api_version"] == "2024-02-01"
    assert captured["max_retries"] == 5


def test_openai_api_error_mid_stream_is_reraised(
    mock_azure_client: MockAzureClient,
) -> None:
    mid_stream_exc: openai.InternalServerError = openai.InternalServerError(
        "mid-stream failure",
        response=_make_response(status.HTTP_500_INTERNAL_SERVER_ERROR),
        body=None,
    )

    def failing_stream() -> Iterator[ChatCompletionChunk]:
        yield create_chunk("partial")
        raise mid_stream_exc

    mock_azure_client.chat.completions.return_value = failing_stream()

    with pytest.raises(openai.InternalServerError, match="mid-stream failure"):
        list(
            stream_azure_openai_response(
                messages=[
                    {
                        "role": "user",
                        "content": "Test",
                    },
                ],
                model=AssistantModel.ASTRA,
                reasoning_effort=ReasoningEffort.MEDIUM,
            ),
        )


def test_stream_skips_chunks_with_empty_choices(
    mock_azure_client: MockAzureClient,
) -> None:
    empty_chunk: ChatCompletionChunk = create_chunk(None)
    empty_chunk.choices = []
    mock_azure_client.chat.completions.return_value = [
        empty_chunk,
        create_chunk("Hello"),
        empty_chunk,
    ]

    result: list[str] = list(
        stream_azure_openai_response(
            messages=[
                {
                    "role": "user",
                    "content": "Test",
                },
            ],
            model=AssistantModel.ASTRA,
            reasoning_effort=ReasoningEffort.MEDIUM,
        ),
    )

    assert result == ["Hello"]


@pytest.fixture
def metric_messages(monkeypatch: pytest.MonkeyPatch) -> Iterator[list[Message]]:
    ticks: Iterator[float] = iter([10.0, 10.25, 10.5])
    monkeypatch.setattr("app.stream_metrics.time.perf_counter", lambda: next(ticks))
    messages: list[Message] = []
    sink: int = logger.add(messages.append, format="{message}")
    try:
        yield messages
    finally:
        logger.remove(sink)


def final_metric(messages: list[Message]) -> dict[str, MetricValue]:
    events: list[Message] = [
        message for message in messages if "stream_metrics" in message.record["extra"]
    ]
    assert len(events) == 1
    event = cast(
        "dict[str, MetricValue]",
        json.loads(str(events[0]).removeprefix("Azure OpenAI stream metrics: ")),
    )
    assert event == events[0].record["extra"]["stream_metrics"]
    return event


def usage_chunk(tokens: int = 12) -> ChatCompletionChunk:
    chunk: ChatCompletionChunk = create_chunk(None)
    chunk.choices = []
    chunk.usage = CompletionUsage(
        prompt_tokens=tokens,
        completion_tokens=tokens,
        total_tokens=tokens * 2,
    )
    return chunk


def consume_response() -> list[str]:
    return list(
        stream_azure_openai_response(
            messages=[{"role": "user", "content": "Private prompt"}],
            model=AssistantModel.ASTRA,
            reasoning_effort=ReasoningEffort.HIGH,
        ),
    )


@pytest.mark.parametrize(
    ("chunks", "expected_text", "tokens", "ttft_ms", "duration_ms"),
    [
        ([], [], None, None, 250.0),
        ([create_chunk(None), create_chunk("")], [], None, None, 250.0),
        ([usage_chunk()], [], 12, None, 250.0),
        ([create_chunk("Private response")], ["Private response"], None, 250.0, 500.0),
        (
            [create_chunk(None), create_chunk("Hi"), create_chunk("!"), usage_chunk()],
            ["Hi", "!"],
            12,
            250.0,
            500.0,
        ),
        (
            [create_chunk("Hi"), usage_chunk(0), create_chunk(None)],
            ["Hi"],
            0,
            250.0,
            500.0,
        ),
    ],
)
def test_stream_metrics(
    mock_azure_client: MockAzureClient,
    metric_messages: list[Message],
    chunks: list[ChatCompletionChunk],
    expected_text: list[str],
    tokens: int | None,
    ttft_ms: float | None,
    duration_ms: float,
) -> None:
    mock_azure_client.chat.completions.return_value = chunks
    assert consume_response() == expected_text
    assert final_metric(metric_messages) == {
        "event": "azure_openai_stream",
        "status": "completed",
        "model": "gpt-6-astra",
        "reasoning_effort": "high",
        "duration_ms": duration_ms,
        "ttft_ms": ttft_ms,
        "output_chars": len("".join(expected_text)),
        "usage_received": tokens is not None,
        "prompt_tokens": tokens,
        "completion_tokens": tokens,
        "total_tokens": None if tokens is None else tokens * 2,
    }
    assert mock_azure_client.chat.completions.stream is not None
    assert mock_azure_client.chat.completions.stream.closed


def test_creation_failure_records_metrics(
    mock_azure_client: MockAzureClient,
    metric_messages: list[Message],
    openai_api_error: openai.APIError,
) -> None:
    mock_azure_client.chat.completions.side_effect = openai_api_error
    with pytest.raises(type(openai_api_error)) as error:
        consume_response()
    assert error.value is openai_api_error
    event: dict[str, MetricValue] = final_metric(metric_messages)
    assert event["status"] == "error"
    assert event["ttft_ms"] is None
    assert event["duration_ms"] == pytest.approx(250.0)
    assert event["output_chars"] == 0
    assert event["usage_received"] is False
    assert event["total_tokens"] is None
    assert mock_azure_client.chat.completions.stream is None


@pytest.mark.parametrize("partial", [False, True])
@pytest.mark.parametrize("with_usage", [False, True])
def test_midstream_failure_records_metrics(
    mock_azure_client: MockAzureClient,
    metric_messages: list[Message],
    *,
    partial: bool,
    with_usage: bool,
) -> None:
    failure: ValueError = ValueError("provider failure")

    def failing_stream() -> Iterator[ChatCompletionChunk]:
        if partial:
            yield create_chunk("Partial")
        if with_usage:
            yield usage_chunk()
        raise failure

    mock_azure_client.chat.completions.return_value = failing_stream()
    with pytest.raises(ValueError, match="provider failure") as error:
        consume_response()
    assert error.value is failure
    event: dict[str, MetricValue] = final_metric(metric_messages)
    assert event["status"] == "error"
    assert event["ttft_ms"] == (250.0 if partial else None)
    assert event["duration_ms"] == pytest.approx(500.0 if partial else 250.0)
    assert event["output_chars"] == (7 if partial else 0)
    assert event["usage_received"] is with_usage
    assert event["total_tokens"] == (24 if with_usage else None)
    assert mock_azure_client.chat.completions.stream is not None
    assert mock_azure_client.chat.completions.stream.closed


def test_explicit_generator_close_records_interruption(
    mock_azure_client: MockAzureClient,
    metric_messages: list[Message],
) -> None:
    mock_azure_client.chat.completions.return_value = [
        create_chunk("Hi"),
        usage_chunk(),
    ]
    response: Generator[str] = stream_azure_openai_response(
        messages=[{"role": "user", "content": "Private prompt"}],
        model=AssistantModel.SOL,
        reasoning_effort=ReasoningEffort.LOW,
    )
    assert next(response) == "Hi"
    response.close()
    event: dict[str, MetricValue] = final_metric(metric_messages)
    assert event["status"] == "interrupted"
    assert event["ttft_ms"] == pytest.approx(250.0)
    assert event["duration_ms"] == pytest.approx(500.0)
    assert event["output_chars"] == 2
    assert event["usage_received"] is False
    assert event["total_tokens"] is None
    assert event["model"] == "gpt-5.6-sol"
    assert event["reasoning_effort"] == "low"
    assert mock_azure_client.chat.completions.stream is not None
    assert mock_azure_client.chat.completions.stream.closed
