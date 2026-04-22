"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application runtime settings loaded from `.env` files."""

    app_name: str = "Space Debris Collision Prediction API"
    app_version: str = "1.0.0"
    database_url: str = "sqlite+aiosqlite:///./space_debris.db"
    db_echo: bool = False
    scheduler_enabled: bool = True
    scan_interval_hours: int = 1
    default_position_uncertainty_km: float = 0.5
    cors_origins: str = "*"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    def cors_origins_list(self) -> list[str]:
        """Return normalized CORS origin list from a comma-separated setting."""
        if not self.cors_origins.strip():
            return ["*"]
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance for the process lifetime."""
    return Settings()


settings = get_settings()
