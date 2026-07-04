from typing import TYPE_CHECKING, Any

import httpx
import openai
import pytest
from fastapi import status

from app.azure_client import get_azure_openai_client, stream_azure_openai_response
from app.entities import AssistantModel, AssistantTemperature

if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Iterable, Iterator


class MockAzureClient:
    def __init__(self) -> None:
        self.chat = self.MockChat()

    class MockChat:
        def __init__(self) -> None:
            self.completions = self.MockCompletions()

        class MockCompletions:
            def __init__(self) -> None:
                self.create_calls: list[dict[str, Any]] = []
                self.return_value: Iterable[object] = []
                self.side_effect: Exception | None = None

            def create(self, **kwargs: object) -> Iterable[object]:
                self.create_calls.append(kwargs)
                if self.side_effect is not None:
                    raise self.side_effect
                return self.return_value


def create_chunk(content: str | None) -> object:
    delta: object = type("MockDelta", (), {"content": content})()
    choice: object = type("MockChoice", (), {"delta": delta})()
    return type("MockChunk", (), {"choices": [choice]})()


@pytest.fixture
def prompt_messages() -> list[dict[str, str]]:
    return [
        {
            "role": "user",
            "content": "Test prompt",
        },
    ]


@pytest.fixture
def mock_azure_client(monkeypatch: pytest.MonkeyPatch) -> MockAzureClient:
    mock_client: MockAzureClient = MockAzureClient()
    get_azure_openai_client.cache_clear()
    monkeypatch.setattr("app.azure_client.get_azure_openai_client", lambda: mock_client)
    return mock_client


@pytest.mark.parametrize(
    ("model", "temperature", "expected_model", "expected_temp"),
    [
        (AssistantModel.MINI, AssistantTemperature.CREATIVE, "gpt-4o-mini", 0.9),
        (AssistantModel.FULL, AssistantTemperature.BALANCED, "gpt-4o", 0.7),
        (AssistantModel.FULL, AssistantTemperature.DETERMINISTIC, "gpt-4o", 0.2),
        (AssistantModel.MINI, AssistantTemperature.DETERMINISTIC, "gpt-4o-mini", 0.2),
    ],
)
def test_stream_successful_response(
    mock_azure_client: MockAzureClient,
    prompt_messages: list[dict[str, str]],
    model: AssistantModel,
    temperature: AssistantTemperature,
    expected_model: str,
    expected_temp: float,
) -> None:
    mock_azure_client.chat.completions.return_value = [
        create_chunk("Hello"),
        create_chunk(None),
        create_chunk(" world"),
    ]

    response: list[str] = list(
        stream_azure_openai_response(
            messages=prompt_messages,
            model=model,
            temperature=temperature,
        ),
    )

    assert response == ["Hello", " world"]
    assert mock_azure_client.chat.completions.create_calls == [
        {
            "model": expected_model,
            "temperature": expected_temp,
            "messages": prompt_messages,
            "stream": True,
        },
    ]


@pytest.mark.parametrize(
    ("exc_class", "message"),
    [
        (Exception, "API Error"),
        (ValueError, "Bad value"),
        (RuntimeError, "Runtime failure"),
    ],
)
def test_api_exception(
    mock_azure_client: MockAzureClient,
    prompt_messages: list[dict[str, str]],
    exc_class: type[Exception],
    message: str,
) -> None:
    mock_azure_client.chat.completions.side_effect = exc_class(message)

    with pytest.raises(exc_class, match=message):
        list(
            stream_azure_openai_response(
                messages=prompt_messages,
                model=AssistantModel.FULL,
                temperature=AssistantTemperature.BALANCED,
            ),
        )


def _make_request() -> httpx.Request:
    return httpx.Request("POST", "https://example.openai.azure.com/")


def _make_response(status_code: int) -> httpx.Response:
    return httpx.Response(status_code=status_code, request=_make_request())


def test_openai_api_exceptions_are_reraised(
    mock_azure_client: MockAzureClient,
    prompt_messages: list[dict[str, str]],
    openai_api_error: openai.APIError,
) -> None:
    mock_azure_client.chat.completions.side_effect = openai_api_error

    with pytest.raises(type(openai_api_error)):
        list(
            stream_azure_openai_response(
                messages=prompt_messages,
                model=AssistantModel.FULL,
                temperature=AssistantTemperature.BALANCED,
            ),
        )


def test_get_azure_openai_client_wires_settings_correctly(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_azure_openai_client.cache_clear()

    class MockSettings:
        azure_openai_endpoint: str = "https://test.openai.azure.com/"
        azure_openai_api_key: str = "test-key-123"
        azure_openai_api_version: str = "2024-02-01"

    monkeypatch.setattr("app.azure_client.get_settings", MockSettings)

    captured: dict[str, object] = {}

    class MockAzureOpenAI:
        def __init__(self, **kwargs: object) -> None:
            captured.update(kwargs)

    monkeypatch.setattr("app.azure_client.AzureOpenAI", MockAzureOpenAI)

    client: object = get_azure_openai_client()
    get_azure_openai_client.cache_clear()

    assert isinstance(client, MockAzureOpenAI)
    assert captured["azure_endpoint"] == "https://test.openai.azure.com/"
    assert captured["api_key"] == "test-key-123"
    assert captured["api_version"] == "2024-02-01"
    assert captured["max_retries"] == 5


def test_openai_api_error_mid_stream_is_reraised(
    mock_azure_client: MockAzureClient,
) -> None:
    mid_stream_exc: openai.InternalServerError = openai.InternalServerError(
        "mid-stream failure",
        response=_make_response(status.HTTP_500_INTERNAL_SERVER_ERROR),
        body=None,
    )

    def failing_stream() -> Iterator[object]:
        yield create_chunk("partial")
        raise mid_stream_exc

    mock_azure_client.chat.completions.return_value = failing_stream()

    with pytest.raises(openai.InternalServerError, match="mid-stream failure"):
        list(
            stream_azure_openai_response(
                messages=[
                    {
                        "role": "user",
                        "content": "Test",
                    },
                ],
                model=AssistantModel.FULL,
                temperature=AssistantTemperature.BALANCED,
            ),
        )


def test_stream_skips_chunks_with_empty_choices(
    mock_azure_client: MockAzureClient,
) -> None:
    empty_chunk: object = type("MockChunk", (), {"choices": []})()
    mock_azure_client.chat.completions.return_value = [
        empty_chunk,
        create_chunk("Hello"),
        empty_chunk,
    ]

    result: list[str] = list(
        stream_azure_openai_response(
            messages=[
                {
                    "role": "user",
                    "content": "Test",
                },
            ],
            model=AssistantModel.FULL,
            temperature=AssistantTemperature.BALANCED,
        ),
    )

    assert result == ["Hello"]
