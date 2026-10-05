import json
from contextlib import ExitStack
from typing import TYPE_CHECKING, cast

import pytest
from loguru import logger

from tests.azure_double import build_client

if TYPE_CHECKING:
    from collections.abc import Callable, Iterator

    from httpx2 import Response
    from loguru import Message
    from openai import AzureOpenAI

    from app.stream_metrics import MetricValue
    from tests.azure_double import Responder

    type AzureFactory = Callable[[Responder], list[Response]]
    type MetricsReader = Callable[[], dict[str, MetricValue]]

# TESTING=true is set declaratively via pytest-env (see [tool.pytest.ini_options]
# `env` in pyproject.toml) before any app module is imported, so Settings() does
# not reject missing Azure credentials during collection.

_METRICS_LOG_PREFIX: str = "Azure OpenAI stream metrics: "


@pytest.fixture
def fake_azure(monkeypatch: pytest.MonkeyPatch) -> Iterator[AzureFactory]:
    """Point `app.azure_client` at a real SDK client backed by a mock transport.

    Returns a factory that takes a responder and hands back the responses
    the transport returns, so tests can assert on the actual outbound request.
    """
    with ExitStack() as clients:

        def build(responder: Responder) -> list[Response]:
            responses: list[Response] = []
            client: AzureOpenAI = clients.enter_context(
                build_client(responder, responses),
            )
            monkeypatch.setattr(
                "app.azure_client.get_azure_openai_client",
                lambda: client,
            )
            return responses

        yield build


class FakeClock:
    """Deterministic `perf_counter` stand-in that tests advance explicitly.

    Timings are set by the test rather than inferred from how many times the
    production code happens to read the clock.

    `stream_metrics` imports `perf_counter` by name, so this replaces only that
    binding. Patching `time.perf_counter` would reach the global `time` module
    and skew httpx's own `response.elapsed` bookkeeping too.
    """

    def __init__(self) -> None:
        self._now: float = 0.0

    def advance(self, ms: float) -> None:
        self._now += ms / 1000

    def __call__(self) -> float:
        return self._now


@pytest.fixture
def clock(monkeypatch: pytest.MonkeyPatch) -> FakeClock:
    fake: FakeClock = FakeClock()
    monkeypatch.setattr("app.stream_metrics.perf_counter", fake)
    return fake


@pytest.fixture
def stream_metrics() -> Iterator[MetricsReader]:
    """Capture the single stream-metrics log event emitted by a test.

    Returns the payload parsed from the *rendered* message, because the app
    configures no structured sink: that JSON is what actually reaches a log
    aggregator today. The bound copy is what a structured sink would consume
    instead, so every read also checks that it carries the same payload.
    """
    messages: list[Message] = []
    sink_id: int = logger.add(messages.append, format="{message}")

    def read() -> dict[str, MetricValue]:
        events: list[Message] = [
            message
            for message in messages
            if "stream_metrics" in message.record["extra"]
        ]
        if len(events) != 1:
            msg: str = f"expected 1 stream_metrics event, captured {len(events)}"
            raise AssertionError(msg)
        rendered: dict[str, MetricValue] = cast(
            "dict[str, MetricValue]",
            json.loads(str(events[0]).removeprefix(_METRICS_LOG_PREFIX)),
        )
        if rendered != events[0].record["extra"]["stream_metrics"]:
            msg = "bound stream_metrics payload differs from the rendered one"
            raise AssertionError(msg)
        return rendered

    try:
        yield read
    finally:
        logger.remove(sink_id)
