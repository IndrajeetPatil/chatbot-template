from functools import cache
from typing import TYPE_CHECKING

from limits import parse
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

if TYPE_CHECKING:
    from typing import ClassVar


class Settings(BaseSettings):
    azure_openai_endpoint: str = Field(default="", alias="AZURE_OPENAI_ENDPOINT")
    azure_openai_api_key: str = Field(default="", alias="AZURE_OPENAI_API_KEY")
    azure_openai_api_version: str = Field(default="", alias="AZURE_OPENAI_API_VERSION")
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"],
        alias="CORS_ALLOWED_ORIGINS",
    )
    chat_rate_limit: str = Field(default="10/minute", alias="CHAT_RATE_LIMIT")
    testing: bool = Field(default=False, alias="TESTING")

    model_config: ClassVar[SettingsConfigDict] = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
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
