import json
from typing import TYPE_CHECKING, cast

import pytest
from loguru import logger

from app.azure_client import get_azure_openai_client
from tests.azure_double import AzureCall, build_client

if TYPE_CHECKING:
    from collections.abc import Callable, Iterator

    from loguru import Message
    from openai import AzureOpenAI

    from app.stream_metrics import MetricValue
    from tests.azure_double import Responder

    type AzureFactory = Callable[[Responder], list[AzureCall]]
    type MetricsReader = Callable[[], dict[str, MetricValue]]

# TESTING=true is set declaratively via pytest-env (see [tool.pytest.ini_options]
# `env` in pyproject.toml) before any app module is imported, so Settings() does
# not reject missing Azure credentials during collection.

METRICS_LOG_PREFIX: str = "Azure OpenAI stream metrics: "


@pytest.fixture
def fake_azure(monkeypatch: pytest.MonkeyPatch) -> Iterator[AzureFactory]:
    """Point `app.azure_client` at a real SDK client backed by a mock transport.

    Returns a factory that takes a responder and hands back the list of calls
    the transport records, so tests can assert on the actual outbound request.
    """
    clients: list[AzureOpenAI] = []

    def build(responder: Responder) -> list[AzureCall]:
        calls: list[AzureCall] = []
        client: AzureOpenAI = build_client(responder, calls)
        clients.append(client)
        get_azure_openai_client.cache_clear()
        monkeypatch.setattr(
            "app.azure_client.get_azure_openai_client",
            lambda: client,
        )
        return calls

    try:
        yield build
    finally:
        for client in clients:
            client.close()
        get_azure_openai_client.cache_clear()


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

    Reads the payload back out of the *rendered* message rather than the bound
    record, because the app configures no structured sink: that JSON is what
    actually reaches a log aggregator today. A dedicated test in
    `test_azure_client` pins the `logger.bind` half against it.
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
        return cast(
            "dict[str, MetricValue]",
            json.loads(str(events[0]).removeprefix(METRICS_LOG_PREFIX)),
        )

    try:
        yield read
    finally:
        logger.remove(sink_id)
