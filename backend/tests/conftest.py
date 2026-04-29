"""Test defaults: no DATABASE_URL so the API uses in-memory repositories."""

import os

os.environ.pop("DATABASE_URL", None)

from app.core.config import get_settings

get_settings.cache_clear()
