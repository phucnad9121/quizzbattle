# backend/app/core/config.py
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            ROOT_DIR / ".env",
            ROOT_DIR / ".env.local",
            BACKEND_DIR / ".env",
            BACKEND_DIR / ".env.local",
        ),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://quizbattle:secret@localhost:5432/quizbattle_db"
    sync_database_url: str = "postgresql+psycopg2://quizbattle:secret@localhost:5432/quizbattle_db"

    # Redis
    redis_url: str = "redis://:redissecret@localhost:6379/0"

    # JWT
    jwt_secret_key: str = "dev_secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # App
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"

settings = Settings()