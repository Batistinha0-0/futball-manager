"""Test defaults: force empty DATABASE_URL so the API uses in-memory repositories."""

import os

import pytest

# Env wins over `.env` file — keep tests deterministic without a local Postgres.
os.environ["DATABASE_URL"] = ""
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-at-least-32-characters-long")

from app.core.config import get_settings

get_settings.cache_clear()


@pytest.fixture(autouse=True)
def _reset_memory_repositories() -> None:
    """Isolate tests that share ``lru_cache`` singletons in ``app.api.deps``."""
    from app.api import deps

    deps._memory_repo_singleton.cache_clear()
    deps._memory_match_day_singleton.cache_clear()
