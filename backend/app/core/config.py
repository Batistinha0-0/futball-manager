from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.postgres_url import normalize_postgres_url_for_psycopg


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    #: PostgreSQL URL, e.g. postgresql+psycopg://user:pass@host:5432/db (Neon / local Docker).
    #: If unset, API uses in-memory repositories for local dev without a database.
    database_url: str | None = None

    #: IANA tz para domingo / janelas do dia de jogo (ex.: Europe/Lisbon, America/Sao_Paulo).
    app_timezone: str = "Europe/Lisbon"

    #: Required when persisting users / issuing JWTs (set in any environment that uses auth).
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    #: Short-lived access JWT (minutes).
    jwt_access_expires_minutes: int = 15
    #: Opaque refresh token row lifetime (days).
    jwt_refresh_expires_days: int = 7

    auth_cookie_name: str = "fm_access"
    auth_refresh_cookie_name: str = "fm_refresh"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    #: Optional server-side pepper for refresh token hashing; if empty, `jwt_secret` is used.
    refresh_token_pepper: str = ""

    #: Optional bootstrap: create `super_admin` on startup if user does not exist (both required).
    bootstrap_super_admin_user_name: str = ""
    bootstrap_super_admin_password: str = Field(default="", repr=False)

    @field_validator("database_url", mode="before")
    @classmethod
    def empty_database_url_as_none(cls, value: object) -> str | None:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return str(value).strip()

    @field_validator("database_url", mode="after")
    @classmethod
    def database_url_use_psycopg3(cls, value: str | None) -> str | None:
        if not value:
            return value
        return normalize_postgres_url_for_psycopg(value)

    @field_validator("jwt_secret", mode="before")
    @classmethod
    def strip_jwt_secret(cls, value: object) -> str:
        if value is None:
            return ""
        return str(value).strip()

    @field_validator("bootstrap_super_admin_user_name", mode="before")
    @classmethod
    def strip_bootstrap_super_admin_user_name(cls, value: object) -> str:
        if value is None:
            return ""
        return str(value).strip()

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def refresh_token_pepper_effective(self) -> str:
        p = self.refresh_token_pepper.strip()
        if p:
            return p
        return self.jwt_secret

    @property
    def bootstrap_super_admin_enabled(self) -> bool:
        return bool(self.bootstrap_super_admin_user_name and self.bootstrap_super_admin_password)


@lru_cache
def get_settings() -> Settings:
    return Settings()
