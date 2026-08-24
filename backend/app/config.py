import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NE-Setu Adaptive Logistics Platform"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://nesetu:nesetu_dev@localhost:5432/nesetu"
    )
    
    # Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "nesetu_super_secret_jwt_key_2026_change_in_prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Sim Clock
    SIM_START_HOUR: int = int(os.getenv("SIM_START_HOUR", "0"))
    
    # LLM (Optional)
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
    
    class Config:
        case_sensitive = True

settings = Settings()
