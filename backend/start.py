#!/usr/bin/env python3
"""
Start the FastAPI app after validating configuration and optional DB connectivity.

Run from anywhere (uses this file's directory as the backend root):

    python start.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


def _ensure_backend_root() -> Path:
    root = Path(__file__).resolve().parent
    os.chdir(root)
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))
    return root


def _load_env(root: Path) -> None:
    from dotenv import load_dotenv

    load_dotenv(root / ".env")


def validate() -> None:
    """Fail fast before uvicorn if something required is missing or unreachable."""
    if sys.version_info < (3, 11):
        raise RuntimeError(f"Python 3.11+ required; found {sys.version_info.major}.{sys.version_info.minor}")

    from app.core.config import get_settings

    get_settings.cache_clear()
    settings = get_settings()

    if not settings.cors_origins_list:
        raise RuntimeError("CORS_ORIGINS must include at least one origin (comma-separated).")

    if settings.database_url:
        _check_postgres(settings.database_url)
        print("[start] PostgreSQL reachable; API will use DATABASE_URL.", file=sys.stderr)
    else:
        print(
            "[start] DATABASE_URL not set — API will use in-memory repositories (tests / quick dev).",
            file=sys.stderr,
        )


def _check_postgres(database_url: str) -> None:
    from sqlalchemy import create_engine, text

    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        raise RuntimeError(
            "Cannot connect to PostgreSQL with DATABASE_URL. "
            "Is the server running (e.g. `docker compose up -d`) and the URL correct?"
        ) from exc
    finally:
        engine.dispose()


def main() -> None:
    root = _ensure_backend_root()
    _load_env(root)
    validate()

    import uvicorn

    host = os.environ.get("API_HOST", "127.0.0.1")
    port = int(os.environ.get("API_PORT", "8000"))
    reload = os.environ.get("API_RELOAD", "1") not in ("0", "false", "False")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback

        print("[start] Startup validation failed:", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)
