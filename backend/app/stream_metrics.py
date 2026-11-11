"""Timing and token metrics for one Azure OpenAI response stream."""

lazy import json
lazy from contextlib import contextmanager
lazy from dataclasses import dataclass
lazy from time import perf_counter
lazy from typing import TYPE_CHECKING, Literal

lazy from loguru import logger

if TYPE_CHECKING:
    lazy from collections.abc import Generator

    lazy from openai.types.chat import ChatCompletionChunk
    lazy from openai.types.completion_usage import CompletionUsage

    lazy from app.entities import AssistantModel, ReasoningEffort


type StreamStatus = Literal["completed", "error", "interrupted"]
type MetricValue = str | float | int | bool | None


@dataclass
class StreamMetrics:
    """Running metrics for one stream: time to first token, output and usage."""

    model: AssistantModel
    reasoning_effort: ReasoningEffort
    started_at: float
    ttft_ms: float | None = None
    output_chars: int = 0
    usage: CompletionUsage | None = None

    def record(self, chunk: ChatCompletionChunk) -> str:
        """Fold `chunk` into the running metrics and return its text delta."""
        if chunk.usage is not None:
            self.usage = chunk.usage
        content: str = (chunk.choices[0].delta.content if chunk.choices else None) or ""
        if not content:
            return ""
        if self.ttft_ms is None:
            self.ttft_ms = (perf_counter() - self.started_at) * 1000
        self.output_chars += len(content)
        return content

    def log(self, status: StreamStatus) -> None:
        """Log the metrics as one structured event with the stream's outcome."""
        metrics: dict[str, MetricValue] = {
            "event": "azure_openai_stream",
            "status": status,
            "model": self.model.value,
            "reasoning_effort": self.reasoning_effort.value,
            "duration_ms": (perf_counter() - self.started_at) * 1000,
            "ttft_ms": self.ttft_ms,
            "output_chars": self.output_chars,
            "usage_received": self.usage is not None,
            "prompt_tokens": getattr(self.usage, "prompt_tokens", None),
            "completion_tokens": getattr(self.usage, "completion_tokens", None),
            "total_tokens": getattr(self.usage, "total_tokens", None),
        }
        # Include JSON in the message so the default Loguru sink exposes every field.
        logger.bind(stream_metrics=metrics).info(
            "Azure OpenAI stream metrics: {}",
            json.dumps(metrics),
        )


@contextmanager
def measure_stream(
    model: AssistantModel,
    reasoning_effort: ReasoningEffort,
) -> Generator[StreamMetrics]:
    """Time a stream and log its metrics once it completes, fails or is closed.

    Yields:
        The metrics to record each chunk into.

    Raises:
        GeneratorExit: re-raised after logging when the consumer closes the stream.
    """
    metrics: StreamMetrics = StreamMetrics(
        model=model,
        reasoning_effort=reasoning_effort,
        started_at=perf_counter(),
    )
    status: StreamStatus = "error"
    try:
        yield metrics
        status = "completed"
    except GeneratorExit:
        status = "interrupted"
        raise
    finally:
        metrics.log(status)
