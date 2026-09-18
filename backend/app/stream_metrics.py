import json
import time
from contextlib import contextmanager
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from loguru import logger

if TYPE_CHECKING:
    from collections.abc import Iterator

    from openai.types.chat import ChatCompletionChunk
    from openai.types.completion_usage import CompletionUsage

    from app.entities import AssistantModel, ReasoningEffort


type StreamStatus = Literal["completed", "error", "interrupted"]
type MetricValue = str | float | int | bool | None


@dataclass
class StreamMetrics:
    model: AssistantModel
    reasoning_effort: ReasoningEffort
    started_at: float
    ttft_ms: float | None = None
    output_chars: int = 0
    usage: CompletionUsage | None = None

    def record_chunk(self, chunk: ChatCompletionChunk) -> str:
        if chunk.usage is not None:
            self.usage = chunk.usage
        if not chunk.choices:
            return ""
        return chunk.choices[0].delta.content or ""

    def record_content(self, content: str) -> None:
        if self.ttft_ms is None:
            self.ttft_ms = (time.perf_counter() - self.started_at) * 1000
        self.output_chars += len(content)

    def log(self, status: StreamStatus) -> None:
        metrics: dict[str, MetricValue] = {
            "event": "azure_openai_stream",
            "status": status,
            "model": self.model.value,
            "reasoning_effort": self.reasoning_effort.value,
            "duration_ms": (time.perf_counter() - self.started_at) * 1000,
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
            json.dumps(metrics, sort_keys=True),
        )


@contextmanager
def measure_stream(
    model: AssistantModel,
    reasoning_effort: ReasoningEffort,
) -> Iterator[StreamMetrics]:
    metrics: StreamMetrics = StreamMetrics(
        model=model,
        reasoning_effort=reasoning_effort,
        started_at=time.perf_counter(),
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
