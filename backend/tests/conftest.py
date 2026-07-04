import httpx
import openai
import pytest
from fastapi import status

# TESTING=true is set declaratively via pytest-env (see [tool.pytest.ini_options]
# `env` in pyproject.toml) before any app module is imported, so Settings() does
# not reject missing Azure credentials during collection.


def _make_openai_request() -> httpx.Request:
    return httpx.Request("POST", "https://example.openai.azure.com/")


def _make_openai_response(status_code: int) -> httpx.Response:
    return httpx.Response(status_code=status_code, request=_make_openai_request())


# The concrete openai.APIError subclasses the client must re-raise unchanged.
# Shared here so both the client-level and endpoint-level suites parametrize over
# the same list instead of duplicating construction helpers.
OPENAI_API_ERRORS: list[openai.APIError] = [
    openai.AuthenticationError(
        "auth failed",
        response=_make_openai_response(status.HTTP_401_UNAUTHORIZED),
        body=None,
    ),
    openai.RateLimitError(
        "rate limited",
        response=_make_openai_response(status.HTTP_429_TOO_MANY_REQUESTS),
        body=None,
    ),
    openai.APIConnectionError(
        message="connection failed",
        request=_make_openai_request(),
    ),
    openai.InternalServerError(
        "server error",
        response=_make_openai_response(status.HTTP_500_INTERNAL_SERVER_ERROR),
        body=None,
    ),
]


@pytest.fixture(params=OPENAI_API_ERRORS, ids=lambda exc: type(exc).__name__)
def openai_api_error(request: pytest.FixtureRequest) -> openai.APIError:
    return request.param
