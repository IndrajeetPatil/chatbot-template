import re
from typing import TYPE_CHECKING

import pytest
from hypothesis import assume, given
from hypothesis import strategies as st
from limits import parse

from app.config import Settings, get_settings

if TYPE_CHECKING:
    from pathlib import Path

# Azure env-var names reported in the "missing" error, in the order
# app.config.validate_azure_settings lists them (endpoint, api key, api version).
AZURE_ENV_NAMES: list[str] = [
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_API_VERSION",
]


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


@st.composite
def _azure_credentials_with_blanks(
    draw: st.DrawFn,
) -> tuple[str, str, str, list[str]]:
    """Blank out a non-empty subset of the Azure fields (with any whitespace).

    Returns (endpoint, api_key, api_version, expected-missing-env-names), so the
    property covers both empty and whitespace-only values in one shot.
    """
    is_blank: list[bool] = draw(
        st.lists(st.booleans(), min_size=3, max_size=3).filter(any),
    )
    whitespace: st.SearchStrategy[str] = st.text(alphabet=" \t\n\r", max_size=4)
    values: list[str] = []
    missing: list[str] = []
    for blank, env_name in zip(is_blank, AZURE_ENV_NAMES, strict=True):
        values.append(draw(whitespace) if blank else "valid")
        if blank:
            missing.append(env_name)
    endpoint, api_key, api_version = values
    return endpoint, api_key, api_version, missing


@given(_azure_credentials_with_blanks())
def test_settings_raises_on_missing_azure_credentials(
    case: tuple[str, str, str, list[str]],
) -> None:
    endpoint, api_key, api_version, missing = case
    pattern: str = "Missing required Azure OpenAI settings: " + re.escape(
        ", ".join(missing),
    )
    with pytest.raises(ValueError, match=pattern):
        Settings(
            azure_openai_endpoint=endpoint,
            azure_openai_api_key=api_key,
            azure_openai_api_version=api_version,
            testing=False,
        )


def test_settings_testing_mode_allows_empty_azure_credentials(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)  # isolate from the repo's .env
    s: Settings = Settings(testing=True)
    assert s.azure_openai_endpoint == ""
    assert s.azure_openai_api_key == ""
    assert s.azure_openai_api_version == ""
    assert s.testing is True


def test_settings_default_chat_rate_limit(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)  # isolate from the repo's .env
    s: Settings = Settings(testing=True)
    assert s.chat_rate_limit == "10/minute"


@given(st.text(alphabet=st.characters(min_codepoint=33, max_codepoint=126), min_size=1))
def test_settings_raises_on_invalid_chat_rate_limit(value: str) -> None:
    try:
        parse(value)
    except ValueError:
        is_valid_rate_limit = False  # genuinely invalid — exactly what we want
    else:
        is_valid_rate_limit = True
    assume(not is_valid_rate_limit)  # skip strings that are a valid rate limit

    pattern: str = re.escape(f"Invalid rate limit format: {value}")
    with pytest.raises(ValueError, match=pattern):
        Settings(testing=True, chat_rate_limit=value)


def test_get_settings_returns_cached_instance() -> None:
    get_settings.cache_clear()
    first: Settings = get_settings()
    second: Settings = get_settings()
    assert first is second
    get_settings.cache_clear()
