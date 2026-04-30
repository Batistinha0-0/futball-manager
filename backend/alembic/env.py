import os

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.postgres_url import normalize_postgres_url_for_psycopg
from app.infrastructure.persistence.database import Base
from app.infrastructure.persistence.models import (  # noqa: F401 — register models
    player_row,
    refresh_token_row,
    user_row,
)

config = context.config

target_metadata = Base.metadata


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL must be set to run Alembic.")
    return normalize_postgres_url_for_psycopg(url.strip())


def run_migrations_offline() -> None:
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_database_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
