from typing import TYPE_CHECKING, Annotated, Literal

import openai
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from loguru import logger
from pydantic import BaseModel, Field, model_validator
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.azure_client import ChatMessage, stream_azure_openai_response
from app.config import get_settings
from app.entities import AssistantModel, AssistantTemperature, OpenAIMessageRole

if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Iterator

    from app.config import Settings

_MAX_MESSAGES = 50
_MAX_MESSAGE_CHARS = 32_000

settings: Settings = get_settings()

limiter: Limiter = Limiter(key_func=get_remote_address)

app: FastAPI = FastAPI(
    title="chatbot-template backend",
    description="Streaming backend API for the chatbot template.",
    version="1.0.0",
)

app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(_request: Request, _exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )


class TextPart(BaseModel):
    type: Literal["text"]
    text: Annotated[str, Field(max_length=_MAX_MESSAGE_CHARS)]


def _parse_message_text(content: str | None, parts: list[TextPart]) -> str:
    if content is not None:
        return content
    return "".join(part.text for part in parts)


class UIMessage(BaseModel):
    role: OpenAIMessageRole
    content: str | None = Field(default=None, max_length=_MAX_MESSAGE_CHARS)
    parts: list[TextPart] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_content_or_parts(self) -> UIMessage:
        if self.content is None and not self.parts:
            msg: str = "At least one of 'content' or 'parts' must be provided."
            raise ValueError(msg)
        return self

    @property
    def text(self) -> str:
        return _parse_message_text(self.content, self.parts)


class ChatRequest(BaseModel):
    messages: Annotated[list[UIMessage], Field(min_length=1, max_length=_MAX_MESSAGES)]
    model: AssistantModel = AssistantModel.FULL
    temperature: AssistantTemperature = AssistantTemperature.BALANCED


@app.get("/health")
def health() -> dict[str, str]:
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
@limiter.limit(lambda: settings.chat_rate_limit)
def chat(request: Request, body: ChatRequest) -> StreamingResponse:
    messages: list[ChatMessage] = _to_openai_messages(body.messages)
    logger.debug(
        "Received chat stream request with {} messages, model={}, temperature={}",
        len(messages),
        body.model.value,
        body.temperature.name,
    )

    return StreamingResponse(
        _stream_chat(
            messages=messages,
            model=body.model,
            temperature=body.temperature,
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

    return openai_messages


def _stream_chat(
    *,
    messages: list[ChatMessage],
    model: AssistantModel,
    temperature: AssistantTemperature,
) -> Iterator[str]:
    try:
        yield from stream_azure_openai_response(
            messages=messages,
            model=model,
            temperature=temperature,
        )
    except openai.APIError:
        raise  # all openai.APIError subtypes are logged in azure_client.py
    except Exception:
        logger.exception("Unexpected error while streaming response")
        raise
