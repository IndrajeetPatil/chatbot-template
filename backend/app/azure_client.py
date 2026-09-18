from functools import cache
from typing import TYPE_CHECKING, cast

import openai
from loguru import logger
from openai import AzureOpenAI

from app.config import get_settings
from app.stream_metrics import StreamMetrics, measure_stream

if TYPE_CHECKING:
    from collections.abc import Generator, Iterator, Sequence

    from openai import Stream
    from openai.types.chat import ChatCompletionChunk, ChatCompletionMessageParam

    from app.config import Settings
    from app.entities import AssistantModel, ReasoningEffort

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
    reasoning_effort: ReasoningEffort,
) -> Stream[ChatCompletionChunk]:
    try:
        # Both deployed reasoning models accept effort; GPT-6 Astra rejects temperature.
        return client.chat.completions.create(
            model=model.value,
            reasoning_effort=reasoning_effort.value,
            messages=cast("OpenAIChatMessages", messages),
            stream=True,
            stream_options={"include_usage": True},
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


def _iter_stream_content(
    stream: Stream[ChatCompletionChunk],
    metrics: StreamMetrics,
) -> Iterator[str]:
    try:
        for chunk in stream:
            if content := metrics.record(chunk):
                yield content
    except openai.APIError:
        logger.exception(
            "Azure OpenAI error during streaming after {} characters",
            metrics.output_chars,
        )
        raise


def stream_azure_openai_response(
    *,
    messages: Sequence[ChatMessage],
    model: AssistantModel,
    reasoning_effort: ReasoningEffort,
) -> Generator[str]:
    client: AzureOpenAI = get_azure_openai_client()
    with (
        measure_stream(model, reasoning_effort) as metrics,
        _create_openai_stream(
            client,
            messages=messages,
            model=model,
            reasoning_effort=reasoning_effort,
        ) as stream,
    ):
        yield from _iter_stream_content(stream, metrics)
