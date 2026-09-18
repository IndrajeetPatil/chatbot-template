import re
from typing import TYPE_CHECKING, NamedTuple

import pytest
from hypothesis import assume, given
from hypothesis import strategies as st
from inline_snapshot import snapshot
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


class _AzureCase(NamedTuple):
    endpoint: str
    api_key: str
    api_version: str
    missing: list[str]  # env-var names expected in the "missing" error


@pytest.fixture(autouse=True)
def _isolated_from_dotenv(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Keep the snapshotted defaults independent of a developer's local .env."""
    monkeypatch.chdir(tmp_path)


def test_accepts_complete_azure_credentials() -> None:
    settings: Settings = Settings(
        azure_openai_endpoint="https://example.openai.azure.com/",
        azure_openai_api_key="key",
        azure_openai_api_version="2024-09-01-preview",
        testing=False,
    )

    assert settings.model_dump() == snapshot({
        "azure_openai_endpoint": "https://example.openai.azure.com/",
        "azure_openai_api_key": "key",
        "azure_openai_api_version": "2024-09-01-preview",
        "cors_allowed_origins": ["http://localhost:3000"],
        "chat_rate_limit": "10/minute",
        "testing": False,
    })


def test_testing_mode_allows_empty_azure_credentials() -> None:
    settings: Settings = Settings(testing=True)

    assert settings.model_dump() == snapshot({
        "azure_openai_endpoint": "",
        "azure_openai_api_key": "",
        "azure_openai_api_version": "",
        "cors_allowed_origins": ["http://localhost:3000"],
        "chat_rate_limit": "10/minute",
        "testing": True,
    })


@st.composite
def _azure_credentials_with_blanks(draw: st.DrawFn) -> _AzureCase:
    """Blank out a non-empty subset of the Azure fields (with any whitespace).

    The blank values cover both empty and whitespace-only strings in one shot.
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
    return _AzureCase(values[0], values[1], values[2], missing)


@given(_azure_credentials_with_blanks())
def test_settings_raises_on_missing_azure_credentials(case: _AzureCase) -> None:
    pattern: str = "Missing required Azure OpenAI settings: " + re.escape(
        ", ".join(case.missing),
    )
    with pytest.raises(ValueError, match=pattern):
        Settings(
            azure_openai_endpoint=case.endpoint,
            azure_openai_api_key=case.api_key,
            azure_openai_api_version=case.api_version,
            testing=False,
        )


@given(st.text(alphabet=st.characters(min_codepoint=33, max_codepoint=126), min_size=1))
def test_settings_raises_on_invalid_chat_rate_limit(value: str) -> None:
    is_valid_rate_limit: bool
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
