from functools import lru_cache
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    depth_limit: int = Field(4, description="Maximum depth allowed for story hierarchy")
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    class Config:
        env_prefix = "AIPM_"


@lru_cache
def get_settings() -> Settings:
    return Settings()
