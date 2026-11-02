"""Application settings, read from the environment and `.env`."""

lazy from functools import cache
lazy from typing import TYPE_CHECKING

lazy from limits import parse
lazy from pydantic import field_validator, model_validator
lazy from pydantic_settings import BaseSettings, SettingsConfigDict

if TYPE_CHECKING:
    lazy from typing import ClassVar


class Settings(BaseSettings):
    """Runtime configuration; Azure credentials are required outside tests."""

    # pydantic-settings reads each field from its upper-cased name as the env var
    # (AZURE_OPENAI_ENDPOINT, CHAT_RATE_LIMIT, TESTING, …) case-insensitively, so
    # no explicit aliases are needed.
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_api_version: str = ""
    cors_allowed_origins: list[str] = ["http://localhost:3000"]
    chat_rate_limit: str = "10/minute"
    testing: bool = False

    model_config: ClassVar[SettingsConfigDict] = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        frozen=True,
    )

    @field_validator("chat_rate_limit", mode="after")
    @classmethod
    def validate_rate_limit(cls, v: str) -> str:
        """Check that the rate limit parses as a `limits` expression.

        Raises:
            ValueError: if it does not.
        """
        try:
            parse(v)
        except ValueError as e:
            msg: str = f"Invalid rate limit format: {v}"
            raise ValueError(msg) from e
        return v

    @model_validator(mode="after")
    def validate_azure_settings(self) -> Settings:
        """Require the Azure OpenAI endpoint, key and API version outside tests.

        Raises:
            ValueError: naming every missing setting.
        """
        if not self.testing:
            missing: list[str] = [
                name
                for name, value in [
                    ("AZURE_OPENAI_ENDPOINT", self.azure_openai_endpoint),
                    ("AZURE_OPENAI_API_KEY", self.azure_openai_api_key),
                    ("AZURE_OPENAI_API_VERSION", self.azure_openai_api_version),
                ]
                if not value.strip()
            ]
            if missing:
                msg: str = (
                    f"Missing required Azure OpenAI settings: {', '.join(missing)}"
                )
                raise ValueError(msg)
        return self


@cache
def get_settings() -> Settings:
    """Return the settings, read once per process."""
    return Settings()
