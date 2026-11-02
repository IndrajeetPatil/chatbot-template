"""FastAPI application: health check and the streaming chat endpoint."""

lazy from typing import TYPE_CHECKING, Annotated, Literal

lazy from fastapi import FastAPI, HTTPException, Request, status
lazy from fastapi.middleware.cors import CORSMiddleware
lazy from fastapi.responses import StreamingResponse
lazy from limits import parse
lazy from limits.storage import MemoryStorage
lazy from limits.strategies import FixedWindowRateLimiter
lazy from loguru import logger
lazy from pydantic import BaseModel, Field, model_validator

lazy from app.azure_client import ChatMessage, stream_azure_openai_response
lazy from app.config import get_settings
lazy from app.entities import AssistantModel, OpenAIMessageRole, ReasoningEffort

if TYPE_CHECKING:
    lazy from app.config import Settings

_MAX_MESSAGES = 50
_MAX_MESSAGE_CHARS = 32_000
_MAX_PARTS = 50
RESPONSE_FORMAT_INSTRUCTIONS: str = (
    "Format replies in Markdown. Use language-tagged fenced blocks for code. "
    "For LaTeX math, use $...$ inline and $$ on separate lines for display math, "
    r"not \(...\) or \[...\]. Escape literal currency dollar signs as \$."
)

settings: Settings = get_settings()

limiter: FixedWindowRateLimiter = FixedWindowRateLimiter(MemoryStorage())

app: FastAPI = FastAPI(
    title="chatbot-template backend",
    description="Streaming backend API for the chatbot template.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextPart(BaseModel):
    """A text part of an AI SDK UI message."""

    type: Literal["text"]
    text: Annotated[str, Field(max_length=_MAX_MESSAGE_CHARS)]


class UIMessage(BaseModel):
    """A chat message from the frontend, as text content or text parts."""

    role: OpenAIMessageRole
    content: str | None = Field(default=None, max_length=_MAX_MESSAGE_CHARS)
    parts: list[TextPart] = Field(default_factory=list, max_length=_MAX_PARTS)

    @model_validator(mode="after")
    def validate_content_or_parts(self) -> UIMessage:
        """Require content or parts, and cap the joined length of parts.

        Raises:
            ValueError: if both are missing or the joined parts are too long.
        """
        # `content` is already length-capped by its field and takes precedence
        # over `parts`, so only a parts-only message needs further checks.
        if self.content is not None:
            return self
        if not self.parts:
            msg: str = "At least one of 'content' or 'parts' must be provided."
            raise ValueError(msg)
        # Each part is capped individually, but the joined result must also stay
        # within the per-message limit so a request can't concatenate many parts
        # into an oversized payload forwarded to Azure. Sum the part lengths
        # instead of len(self.text) so an abusive payload is rejected without
        # first materializing the fully-joined string.
        if sum(len(part.text) for part in self.parts) > _MAX_MESSAGE_CHARS:
            msg = (
                f"Joined message text must not exceed {_MAX_MESSAGE_CHARS} characters."
            )
            raise ValueError(msg)
        return self

    @property
    def text(self) -> str:
        """The message text: its content, else its parts joined."""
        if self.content is not None:
            return self.content
        return "".join(part.text for part in self.parts)


class ChatRequest(BaseModel):
    """A chat request: the conversation, model and reasoning effort."""

    messages: Annotated[list[UIMessage], Field(min_length=1, max_length=_MAX_MESSAGES)]
    model: AssistantModel = AssistantModel.ASTRA
    reasoning_effort: ReasoningEffort = ReasoningEffort.LOW


def _enforce_rate_limit(request: Request) -> None:
    # Called from the endpoint body rather than as a dependency so that requests
    # rejected by validation never consume the client's quota.
    client_address: str = request.client.host if request.client else "127.0.0.1"
    if not limiter.hit(parse(settings.chat_rate_limit), client_address):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
        )


@app.get("/health")
def health() -> dict[str, str]:
    """Report that the service is up."""
    return {"status": "ok"}


@app.post(
    "/api/v1/chat",
    response_class=StreamingResponse,
    responses={
        200: {
            "content": {"text/plain": {}},
            "description": "Plain-text assistant response stream.",
        },
    },
)
def chat(request: Request, body: ChatRequest) -> StreamingResponse:
    """Stream the assistant's reply to the conversation as plain text."""
    _enforce_rate_limit(request)
    messages: list[ChatMessage] = _to_openai_messages(body.messages)
    logger.debug(
        "Received chat stream request with {} messages, model={}, reasoning_effort={}",
        len(messages),
        body.model.value,
        body.reasoning_effort.name,
    )

    return StreamingResponse(
        stream_azure_openai_response(
            messages=messages,
            model=body.model,
            reasoning_effort=body.reasoning_effort,
        ),
        media_type="text/plain; charset=utf-8",
    )


def _to_openai_messages(messages: list[UIMessage]) -> list[ChatMessage]:
    openai_messages: list[ChatMessage] = [
        {"role": message.role.value, "content": message.text}
        for message in messages
        if message.text.strip()
    ]

    if not openai_messages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one text message is required.",
        )

    return [
        {"role": "system", "content": RESPONSE_FORMAT_INSTRUCTIONS},
        *openai_messages,
    ]
