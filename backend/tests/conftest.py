"""Test defaults: force empty DATABASE_URL so the API uses in-memory repositories."""

import os

# Env wins over `.env` file — keep tests deterministic without a local Postgres.
os.environ["DATABASE_URL"] = ""
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-at-least-32-characters-long")

from app.core.config import get_settings

get_settings.cache_clear()
