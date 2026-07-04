from functools import cache
from typing import TYPE_CHECKING

from limits import parse
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

if TYPE_CHECKING:
    from typing import ClassVar


class Settings(BaseSettings):
    # pydantic-settings reads each field from its upper-cased name as the env var
    # (AZURE_OPENAI_ENDPOINT, CHAT_RATE_LIMIT, TESTING, …) case-insensitively, so
    # no explicit aliases are needed.
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_api_version: str = ""
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"],
    )
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
        try:
            parse(v)
        except ValueError as e:
            msg: str = f"Invalid rate limit format: {v}"
            raise ValueError(msg) from e
        return v

    @model_validator(mode="after")
    def validate_azure_settings(self) -> Settings:
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
    return Settings()
