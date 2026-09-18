"""Unit tests for stream instrumentation.

These exercise `StreamMetrics` and `measure_stream` directly. Timing is driven
by the explicit `clock` fixture and the expected log payloads are inline
snapshots, so nothing here re-derives the values the production code computes.
"""

from typing import TYPE_CHECKING

import pytest
from inline_snapshot import snapshot
from openai.types.chat import ChatCompletionChunk

from app.entities import AssistantModel, ReasoningEffort
from app.stream_metrics import StreamMetrics, measure_stream
from tests.azure_double import content_chunk, keepalive_chunk, usage_chunk

if TYPE_CHECKING:
    from collections.abc import Generator

    from tests.azure_double import Chunk
    from tests.conftest import FakeClock, MetricsReader

_FAILURE: str = "provider failure"


def as_chunk(raw: Chunk) -> ChatCompletionChunk:
    return ChatCompletionChunk.model_validate(raw)


def new_metrics() -> StreamMetrics:
    return StreamMetrics(
        model=AssistantModel.ASTRA,
        reasoning_effort=ReasoningEffort.HIGH,
        started_at=0.0,
    )


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (
            content_chunk("Hi"),
            snapshot({"content": "Hi", "total_tokens": None}),
        ),
        (
            content_chunk(None),
            snapshot({"content": "", "total_tokens": None}),
        ),
        (
            content_chunk(""),
            snapshot({"content": "", "total_tokens": None}),
        ),
        (
            keepalive_chunk(),
            snapshot({"content": "", "total_tokens": None}),
        ),
        (
            usage_chunk(),
            snapshot({"content": "", "total_tokens": 24}),
        ),
    ],
    ids=["delta", "null-delta", "empty-delta", "keepalive", "usage-report"],
)
def test_record_chunk_extracts_content_and_usage(
    raw: Chunk,
    expected: object,
) -> None:
    metrics: StreamMetrics = new_metrics()

    assert {
        "content": metrics.record_chunk(as_chunk(raw)),
        "total_tokens": getattr(metrics.usage, "total_tokens", None),
    } == expected


def test_completed_stream_logs_timings_and_usage(
    clock: FakeClock,
    stream_metrics: MetricsReader,
) -> None:
    with measure_stream(AssistantModel.ASTRA, ReasoningEffort.HIGH) as metrics:
        clock.advance(250)
        metrics.record_content("Private response")
        metrics.record_chunk(as_chunk(usage_chunk()))
        clock.advance(250)

    assert stream_metrics() == snapshot({
        "event": "azure_openai_stream",
        "status": "completed",
        "model": "gpt-6-astra",
        "reasoning_effort": "high",
        "duration_ms": 500.0,
        "ttft_ms": 250.0,
        "output_chars": 16,
        "usage_received": True,
        "prompt_tokens": 12,
        "completion_tokens": 12,
        "total_tokens": 24,
    })


def test_ttft_marks_the_first_content_only(
    clock: FakeClock,
    stream_metrics: MetricsReader,
) -> None:
    with measure_stream(AssistantModel.SOL, ReasoningEffort.LOW) as metrics:
        clock.advance(250)
        metrics.record_content("first")
        clock.advance(1_000)
        metrics.record_content("second")

    assert stream_metrics() == snapshot({
        "event": "azure_openai_stream",
        "status": "completed",
        "model": "gpt-5.6-sol",
        "reasoning_effort": "low",
        "duration_ms": 1250.0,
        "ttft_ms": 250.0,
        "output_chars": 11,
        "usage_received": False,
        "prompt_tokens": None,
        "completion_tokens": None,
        "total_tokens": None,
    })


def test_stream_without_content_logs_no_ttft(
    clock: FakeClock,
    stream_metrics: MetricsReader,
) -> None:
    with measure_stream(AssistantModel.ASTRA, ReasoningEffort.HIGH) as metrics:
        clock.advance(250)
        metrics.record_chunk(as_chunk(keepalive_chunk()))

    assert stream_metrics() == snapshot({
        "event": "azure_openai_stream",
        "status": "completed",
        "model": "gpt-6-astra",
        "reasoning_effort": "high",
        "duration_ms": 250.0,
        "ttft_ms": None,
        "output_chars": 0,
        "usage_received": False,
        "prompt_tokens": None,
        "completion_tokens": None,
        "total_tokens": None,
    })


def test_failure_logs_error_status_with_partial_progress(
    clock: FakeClock,
    stream_metrics: MetricsReader,
) -> None:
    def consume() -> None:
        with measure_stream(AssistantModel.ASTRA, ReasoningEffort.HIGH) as metrics:
            clock.advance(250)
            metrics.record_content("Partial")
            clock.advance(250)
            raise ValueError(_FAILURE)

    with pytest.raises(ValueError, match=_FAILURE):
        consume()

    assert stream_metrics() == snapshot({
        "event": "azure_openai_stream",
        "status": "error",
        "model": "gpt-6-astra",
        "reasoning_effort": "high",
        "duration_ms": 500.0,
        "ttft_ms": 250.0,
        "output_chars": 7,
        "usage_received": False,
        "prompt_tokens": None,
        "completion_tokens": None,
        "total_tokens": None,
    })


def test_closing_the_consumer_logs_interrupted_status(
    clock: FakeClock,
    stream_metrics: MetricsReader,
) -> None:
    def produce() -> Generator[str]:
        with measure_stream(AssistantModel.SOL, ReasoningEffort.LOW) as metrics:
            clock.advance(250)
            metrics.record_content("Hi")
            yield "Hi"
            clock.advance(10_000)  # unreachable: the consumer closes first

    stream: Generator[str] = produce()
    assert next(stream) == "Hi"
    clock.advance(250)
    stream.close()

    assert stream_metrics() == snapshot({
        "event": "azure_openai_stream",
        "status": "interrupted",
        "model": "gpt-5.6-sol",
        "reasoning_effort": "low",
        "duration_ms": 500.0,
        "ttft_ms": 250.0,
        "output_chars": 2,
        "usage_received": False,
        "prompt_tokens": None,
        "completion_tokens": None,
        "total_tokens": None,
    })
