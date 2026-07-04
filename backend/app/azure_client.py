import time
from functools import cache
from typing import TYPE_CHECKING, cast

import openai
from loguru import logger
from openai import AzureOpenAI

from app.config import get_settings

if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Iterator, Sequence

    from openai import Stream
    from openai.types.chat import ChatCompletionChunk, ChatCompletionMessageParam

    from app.config import Settings
    from app.entities import AssistantModel, AssistantTemperature

    type OpenAIChatMessages = Sequence[ChatCompletionMessageParam]

type ChatMessage = dict[str, str]


@cache
def get_azure_openai_client() -> AzureOpenAI:
    settings: Settings = get_settings()
    return AzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
        api_key=settings.azure_openai_api_key,
        max_retries=5,
    )


def _create_openai_stream(
    client: AzureOpenAI,
    *,
    messages: Sequence[ChatMessage],
    model: AssistantModel,
    temperature: AssistantTemperature,
) -> Stream[ChatCompletionChunk]:
    try:
        return client.chat.completions.create(
            model=model.value,
            temperature=temperature.openai_value,
            messages=cast("OpenAIChatMessages", messages),
            stream=True,
        )
    except openai.AuthenticationError:
        logger.error("Azure OpenAI authentication failed — verify API key and endpoint")
        raise
    except openai.RateLimitError:
        logger.warning("Azure OpenAI rate limit exceeded")
        raise
    except openai.APIConnectionError:
        logger.warning(
            "Azure OpenAI connection failed — check network and endpoint settings",
        )
        raise
    except openai.APIError:
        logger.exception("Azure OpenAI API error creating stream")
        raise


def _iter_stream_content(stream: Stream[ChatCompletionChunk]) -> Iterator[str]:
    for chunk in stream:
        if not chunk.choices:
            continue

        content: str = chunk.choices[0].delta.content or ""
        if content:
            yield content


def stream_azure_openai_response(
    *,
    messages: Sequence[ChatMessage],
    model: AssistantModel,
    temperature: AssistantTemperature,
) -> Iterator[str]:
    client: AzureOpenAI = get_azure_openai_client()
    start_time: float = time.perf_counter()
    stream: Stream[ChatCompletionChunk] = _create_openai_stream(
        client,
        messages=messages,
        model=model,
        temperature=temperature,
    )

    total_length: int = 0
    try:
        for content in _iter_stream_content(stream):
            total_length += len(content)
            yield content
    except openai.APIError:
        logger.exception(
            "Azure OpenAI error during streaming after {} characters",
            total_length,
        )
        raise

    logger.info(
        "Azure OpenAI streaming completion took {:.2f}s and returned {} characters",
        time.perf_counter() - start_time,
        total_length,
    )
