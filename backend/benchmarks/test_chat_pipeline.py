"""CodSpeed benchmarks for the CPU work behind one chat request.

Inputs are built before timing, and every result is checked afterwards so a
faster measurement cannot come from skipped work. These checks are sanity
checks, not tests: unit coverage and mutation testing come from `tests/` alone.
"""

lazy from typing import TYPE_CHECKING

lazy import pytest

lazy from app.azure_client import stream_azure_openai_response
lazy from app.entities import AssistantModel, ReasoningEffort
lazy from app.main import ChatRequest
lazy from tests.azure_double import build_client, content_chunk, stream_of, usage_chunk

if TYPE_CHECKING:
    lazy from httpx2 import Response
    lazy from openai import AzureOpenAI
    lazy from openai.types.chat import ChatCompletionChunk
    lazy from pytest_codspeed.plugin import BenchmarkFixture

    type Payload = dict[str, object]

# The request limits enforced by `app.main`: 50 messages of up to 50 parts,
# with at most 32,000 characters per message.
_MAX_MESSAGES: int = 50
_MAX_PARTS: int = 50
_PART_CHARS: int = 640


def _conversation(message_count: int, parts_per_message: int) -> Payload:
    """Build a request body shaped like the AI SDK's `UIMessage` parts."""
    roles: tuple[str, str] = ("user", "assistant")
    return {
        "messages": [
            {
                "role": roles[index % 2],
                "parts": [
                    {"type": "text", "text": "x" * _PART_CHARS}
                    for _ in range(parts_per_message)
                ],
            }
            for index in range(message_count)
        ],
        "model": AssistantModel.SOL.value,
        "reasoning_effort": ReasoningEffort.HIGH.value,
    }


@pytest.mark.parametrize(
    ("payload", "expected_messages"),
    [
        pytest.param(_conversation(4, 1), 4, id="short-conversation"),
        pytest.param(
            _conversation(_MAX_MESSAGES, _MAX_PARTS),
            _MAX_MESSAGES,
            id="largest-accepted-conversation",
        ),
    ],
)
def test_validate_chat_request(
    benchmark: BenchmarkFixture,
    payload: Payload,
    expected_messages: int,
) -> None:
    request: ChatRequest = benchmark(ChatRequest.model_validate, payload)

    assert len(request.messages) == expected_messages
    assert request.model is AssistantModel.SOL


@pytest.mark.parametrize(
    "delta_count",
    [
        pytest.param(100, id="short-reply"),
        pytest.param(2_000, id="long-reply"),
    ],
)
def test_relay_streamed_reply(
    benchmark: BenchmarkFixture,
    monkeypatch: pytest.MonkeyPatch,
    delta_count: int,
) -> None:
    # The real SDK parses the SSE body from a mock transport, so this measures
    # chunk decoding, metrics recording and relaying, but no network I/O.
    chunks: list[ChatCompletionChunk] = [
        *(content_chunk("token ") for _ in range(delta_count)),
        usage_chunk(),
    ]
    responses: list[Response] = []
    client: AzureOpenAI = build_client(stream_of(*chunks), responses)
    monkeypatch.setattr("app.azure_client.get_azure_openai_client", lambda: client)

    def relay() -> list[str]:
        return list(
            stream_azure_openai_response(
                messages=[{"role": "user", "content": "Tell me a story."}],
                model=AssistantModel.ASTRA,
                reasoning_effort=ReasoningEffort.LOW,
            ),
        )

    with client:
        deltas: list[str] = benchmark(relay)

    assert len(deltas) == delta_count
    assert set(deltas) == {"token "}
