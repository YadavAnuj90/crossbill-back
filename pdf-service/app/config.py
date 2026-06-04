"""Service configuration loaded from environment (design §21)."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_port: int = 8000
    internal_service_token: str = "change-me-internal-token"
    storage_dir: str = "/data/storage"

    # Optional S3-compatible object store; falls back to local disk if unset (design §17).
    storage_bucket: str | None = None
    storage_access_key: str | None = None
    storage_secret_key: str | None = None
    storage_endpoint: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
