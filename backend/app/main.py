import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, health, matchday, players, users_admin
from app.core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB engine and apply migrations when DATABASE_URL is set."""
    from app.startup.logging_config import configure_logging_from_env

    configure_logging_from_env()

    app_settings = get_settings()
    if app_settings.database_url:
        from alembic import command
        from alembic.config import Config

        from app.infrastructure.persistence.database import init_engine

        init_engine(app_settings.database_url)
        os.environ.setdefault("DATABASE_URL", app_settings.database_url)
        alembic_ini = Path(__file__).resolve().parent.parent / "alembic.ini"
        command.upgrade(Config(str(alembic_ini)), "head")
        from app.startup.super_admin_bootstrap import ensure_bootstrap_super_admin

        ensure_bootstrap_super_admin(app_settings)
    yield


app = FastAPI(
    title="Futball Manager API",
    version="0.1.0",
    description="Backend for Sunday football group management.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(players.router, prefix="/api/v1", tags=["players"])
app.include_router(matchday.router, prefix="/api/v1", tags=["match-day"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(users_admin.router, prefix="/api/v1/super-admin", tags=["super-admin"])
