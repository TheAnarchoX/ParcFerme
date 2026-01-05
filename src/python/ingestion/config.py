"""Configuration settings loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings from environment."""

    model_config = SettingsConfigDict(
        env_file="../../.env",
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra environment variables
    )

    # Database
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "parcferme"
    postgres_password: str = "localdev"
    postgres_db: str = "parcferme"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}"

    # OpenF1 API
    openf1_base_url: str = "https://api.openf1.org/v1"

    # Logging
    log_level: str = "INFO"


settings = Settings()
