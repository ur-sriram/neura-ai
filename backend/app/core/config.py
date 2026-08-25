from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Intelligent Emergency Resource Scheduling API"
    api_prefix: str = "/api"
    environment: str = "development"

    database_url: str = "postgresql+psycopg://postgres:postgres@db:5432/emergency_scheduling"
    redis_url: str = "redis://redis:6379/0"
    auto_seed_defaults: bool = True

    llm_api_key: str | None = None
    llm_base_url: str | None = None
    llm_model: str = "deepseek-chat"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

