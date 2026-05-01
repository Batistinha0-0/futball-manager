#!/usr/bin/env python3
"""
Start the FastAPI app after validating configuration and optional DB connectivity.

Run from anywhere (uses this file's directory as the backend root):

    python start.py

Logging (stderr) — ver `app.startup.logging_config.configure_logging_from_env` (também no lifespan da app, para funcionar com Uvicorn --reload).

- LOG_LEVEL — nível geral (DEBUG, INFO, …). Default: INFO. Repassado ao Uvicorn em start.py.
- LOG_LEVEL_MATCH_DAY — opcional; nível só para `app.match_day`. Ex.: LOG_LEVEL_MATCH_DAY=DEBUG
- PORT — usado no Render (Python nativo): porta de escuta; se existir, host default é 0.0.0.0 e reload default é off.
- API_HOST / API_PORT / API_RELOAD — override local (ex.: dev com reload).
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

    from app.startup.logging_config import configure_logging_from_env

    configure_logging_from_env()
    root_name = os.environ.get("LOG_LEVEL", "INFO").strip().upper()
    md_raw = os.environ.get("LOG_LEVEL_MATCH_DAY", "").strip()
    extra = f"LOG_LEVEL={root_name}"
    if md_raw:
        extra += f" LOG_LEVEL_MATCH_DAY={md_raw.upper()}"
    print(f"[start] Logging: {extra}", file=sys.stderr)

    import uvicorn

    # Render e similares exportam PORT (não API_PORT). Em PaaS queremos 0.0.0.0 e sem reload.
    on_paas = bool(os.environ.get("PORT", "").strip())
    port_raw = (os.environ.get("API_PORT") or os.environ.get("PORT") or "8000").strip()
    port = int(port_raw)
    default_host = "0.0.0.0" if on_paas else "127.0.0.1"
    host = (os.environ.get("API_HOST") or default_host).strip() or default_host
    default_reload = "0" if on_paas else "1"
    reload_raw = os.environ.get("API_RELOAD", default_reload)
    reload = reload_raw not in ("0", "false", "False")
    uvicorn_log = os.environ.get("LOG_LEVEL", "info").strip().lower()

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=uvicorn_log,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback

        print("[start] Startup validation failed:", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)
