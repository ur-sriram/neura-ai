from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "AI Smart Logistics & Accessibility Platform NER"
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    GOOGLE_API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./ner_logistics.db"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "*"]

    WEATHER_API_KEY: str = ""
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_API_KEY: str = ""

    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_VISION_MODEL: str = "gemini-1.5-flash"


settings = Settings()
