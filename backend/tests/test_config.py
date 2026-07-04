import re
from typing import TYPE_CHECKING

import pytest

from app.config import Settings, get_settings

if TYPE_CHECKING:
    from pathlib import Path


def test_settings_valid_azure_credentials() -> None:
    s: Settings = Settings(
        azure_openai_endpoint="https://example.openai.azure.com/",
        azure_openai_api_key="key",
        azure_openai_api_version="2024-09-01-preview",
        testing=False,
    )
    assert s.azure_openai_endpoint == "https://example.openai.azure.com/"
    assert s.azure_openai_api_key == "key"
    assert s.azure_openai_api_version == "2024-09-01-preview"
    assert s.testing is False


@pytest.mark.parametrize(
    ("endpoint", "api_key", "api_version", "missing_names"),
    [
        ("", "key", "2024-09-01-preview", ["AZURE_OPENAI_ENDPOINT"]),
        (
            "https://example.openai.azure.com/",
            "",
            "2024-09-01-preview",
            ["AZURE_OPENAI_API_KEY"],
        ),
        ("https://example.openai.azure.com/", "key", "", ["AZURE_OPENAI_API_VERSION"]),
        (
            "",
            "",
            "",
            [
                "AZURE_OPENAI_ENDPOINT",
                "AZURE_OPENAI_API_KEY",
                "AZURE_OPENAI_API_VERSION",
            ],
        ),
    ],
)
def test_settings_raises_on_missing_azure_credentials(
    endpoint: str,
    api_key: str,
    api_version: str,
    missing_names: list[str],
) -> None:
    pattern: str = "Missing required Azure OpenAI settings: " + re.escape(
        ", ".join(missing_names),
    )
    with pytest.raises(ValueError, match=pattern):
        Settings(
            azure_openai_endpoint=endpoint,
            azure_openai_api_key=api_key,
            azure_openai_api_version=api_version,
            testing=False,
        )


def test_settings_whitespace_values_treated_as_missing() -> None:
    with pytest.raises(
        ValueError,
        match="Missing required Azure OpenAI settings: AZURE_OPENAI_API_KEY",
    ):
        Settings(
            azure_openai_endpoint="https://example.openai.azure.com/",
            azure_openai_api_key="   ",
            azure_openai_api_version="2024-09-01-preview",
            testing=False,
        )


def test_settings_testing_mode_allows_empty_azure_credentials(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    s: Settings = Settings(testing=True)
    assert s.azure_openai_endpoint == ""
    assert s.azure_openai_api_key == ""
    assert s.azure_openai_api_version == ""
    assert s.testing is True


def test_settings_default_chat_rate_limit(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    s: Settings = Settings(testing=True)
    assert s.chat_rate_limit == "10/minute"


def test_settings_raises_on_invalid_chat_rate_limit() -> None:
    with pytest.raises(ValueError, match="Invalid rate limit format: 10/minx"):
        Settings(testing=True, chat_rate_limit="10/minx")


def test_get_settings_returns_cached_instance() -> None:
    get_settings.cache_clear()
    first: Settings = get_settings()
    second: Settings = get_settings()
    assert first is second
    get_settings.cache_clear()
