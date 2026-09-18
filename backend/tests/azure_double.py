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

if TYPE_CHECKING:
    from collections.abc import Callable, Iterator

AZURE_ENDPOINT: str = "https://example.openai.azure.com/"
AZURE_API_VERSION: str = "2024-02-01"
AZURE_API_KEY: str = "test-key"
CONNECT_ERROR: str = "connection refused"

type Responder = Callable[[httpx2.Request], httpx2.Response]
type Chunk = dict[str, Any]


@dataclass(frozen=True)
class AzureCall:
    url: str
    body: Chunk
    response: httpx2.Response


def content_chunk(content: str | None) -> Chunk:
    return {
        "id": "test-chunk",
        "created": 0,
        # Never asserted on; kept deployment-agnostic so a canned response does
        # not appear to contradict the model the test actually requested.
        "model": "test-deployment",
        "object": "chat.completion.chunk",
        "choices": [{"index": 0, "delta": {"content": content}}],
    }


def _choiceless_chunk() -> Chunk:
    chunk: Chunk = content_chunk(None)
    chunk["choices"] = []
    return chunk


def keepalive_chunk() -> Chunk:
    """A chunk carrying neither choices nor usage, as sent between deltas."""
    return _choiceless_chunk()


def usage_chunk(tokens: int = 12) -> Chunk:
    """The final choiceless chunk carrying the token report."""
    chunk: Chunk = _choiceless_chunk()
    chunk["usage"] = {
        "prompt_tokens": tokens,
        "completion_tokens": tokens,
        "total_tokens": tokens * 2,
    }
    return chunk


def error_event(message: str) -> bytes:
    """An in-band SSE error frame, which the SDK surfaces as `openai.APIError`."""
    return sse_bytes({"error": {"message": message, "type": "server_error"}})


def sse_bytes(*chunks: Chunk) -> bytes:
    return "".join(f"data: {json.dumps(chunk)}\n\n" for chunk in chunks).encode()


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


def stream_of(*chunks: Chunk) -> Responder:
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
