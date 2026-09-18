"""Wire-level test double for Azure OpenAI.

The tests drive a real `AzureOpenAI` client over `httpx2.MockTransport` rather
than stubbing `client.chat.completions.create`. That keeps the SDK's own
behaviour — deployment URL construction, SSE parsing, status-to-exception
mapping — inside the system under test instead of being replaced by a stub that
can only ever echo back the arguments it was handed.
"""

import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

import httpx2
from fastapi import status
from openai import AzureOpenAI
from openai.types.chat import ChatCompletionChunk
from openai.types.chat.chat_completion_chunk import Choice, ChoiceDelta
from openai.types.completion_usage import CompletionUsage

if TYPE_CHECKING:
    from collections.abc import Callable, Iterator

AZURE_ENDPOINT: str = "https://example.openai.azure.com/"
AZURE_API_VERSION: str = "2024-02-01"
AZURE_API_KEY: str = "test-key"
CONNECT_ERROR: str = "connection refused"

type Responder = Callable[[httpx2.Request], httpx2.Response]
type RequestBody = dict[str, Any]


@dataclass(frozen=True)
class AzureCall:
    url: str
    body: RequestBody
    response: httpx2.Response


def _chunk(
    choices: list[Choice],
    usage: CompletionUsage | None = None,
) -> ChatCompletionChunk:
    return ChatCompletionChunk(
        id="test-chunk",
        created=0,
        # Never asserted on; kept deployment-agnostic so a canned response does
        # not appear to contradict the model the test actually requested.
        model="test-deployment",
        object="chat.completion.chunk",
        choices=choices,
        usage=usage,
    )


def content_chunk(content: str | None) -> ChatCompletionChunk:
    return _chunk([Choice(index=0, delta=ChoiceDelta(content=content))])


def keepalive_chunk() -> ChatCompletionChunk:
    """A chunk carrying neither choices nor usage, as sent between deltas."""
    return _chunk([])


def usage_chunk(tokens: int = 12) -> ChatCompletionChunk:
    """The final choiceless chunk carrying the token report."""
    return _chunk(
        [],
        usage=CompletionUsage(
            prompt_tokens=tokens,
            completion_tokens=tokens,
            total_tokens=tokens * 2,
        ),
    )


def error_event(message: str) -> bytes:
    """An in-band SSE error frame, which the SDK surfaces as `openai.APIError`."""
    payload: str = json.dumps({"error": {"message": message, "type": "server_error"}})
    return f"data: {payload}\n\n".encode()


def sse_bytes(*chunks: ChatCompletionChunk) -> bytes:
    # `indent=None` keeps each frame on one line; SSE frames are newline-delimited.
    return "".join(
        f"data: {chunk.to_json(indent=None)}\n\n" for chunk in chunks
    ).encode()


DONE: bytes = b"data: [DONE]\n\n"


def raw_stream(body: Callable[[], Iterator[bytes]]) -> Responder:
    """Serve an arbitrary byte stream; `body` may raise to fault the stream."""

    def respond(_request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(
            status.HTTP_200_OK,
            content=body(),
            headers={"content-type": "text/event-stream"},
        )

    return respond


def stream_of(*chunks: ChatCompletionChunk) -> Responder:
    """Serve `chunks` as a complete SSE body terminated by the [DONE] sentinel."""

    def body() -> Iterator[bytes]:
        yield sse_bytes(*chunks)
        yield DONE

    return raw_stream(body)


def error_status(status_code: int, message: str = "upstream failure") -> Responder:
    def respond(_request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(status_code, json={"error": {"message": message}})

    return respond


def unreachable() -> Responder:
    """Fail at the transport layer, as an unresolvable endpoint would."""

    def respond(_request: httpx2.Request) -> httpx2.Response:
        raise httpx2.ConnectError(CONNECT_ERROR)

    return respond


def record_request(client: AzureOpenAI, *, model: str) -> httpx2.Request:
    """Send one request through `client` and return what reached the wire.

    Re-targets an already-built client at a mock transport using the SDK's
    public `copy`, so the request is assembled from that client's real
    configuration rather than read back off its attributes.
    """
    sent: list[httpx2.Request] = []

    def handler(request: httpx2.Request) -> httpx2.Response:
        sent.append(request)
        return httpx2.Response(
            status.HTTP_200_OK,
            content=DONE,
            headers={"content-type": "text/event-stream"},
        )

    probe: AzureOpenAI = client.copy(
        http_client=httpx2.Client(transport=httpx2.MockTransport(handler)),
    )
    try:
        probe.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "probe"}],
            stream=True,
        ).close()
    finally:
        probe.close()
    return sent[0]


def build_client(responder: Responder, calls: list[AzureCall]) -> AzureOpenAI:
    def handler(request: httpx2.Request) -> httpx2.Response:
        response: httpx2.Response = responder(request)
        calls.append(
            AzureCall(
                url=str(request.url),
                body=json.loads(request.content),
                response=response,
            ),
        )
        return response

    return AzureOpenAI(
        azure_endpoint=AZURE_ENDPOINT,
        api_version=AZURE_API_VERSION,
        api_key=AZURE_API_KEY,
        # The real client retries 5 times; retrying every simulated failure with
        # the SDK's exponential backoff makes each error test take ~14 seconds.
        max_retries=0,
        http_client=httpx2.Client(transport=httpx2.MockTransport(handler)),
    )
