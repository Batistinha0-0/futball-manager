from collections.abc import Generator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.application.players.player_service import PlayerService
from app.core.config import Settings, get_settings
from app.infrastructure.persistence.database import get_session_factory
from app.infrastructure.persistence.memory_player_repository import (
    MemoryPlayerRepository,
    create_default_memory_repository,
)
from app.infrastructure.persistence.sqlalchemy_player_repository import (
    SqlAlchemyPlayerRepository,
)


@lru_cache
def _memory_repo_singleton() -> MemoryPlayerRepository:
    return create_default_memory_repository()


def get_db(
    settings: Annotated[Settings, Depends(get_settings)],
) -> Generator[Session | None, None, None]:
    if not settings.database_url:
        yield None
        return
    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def get_player_service(
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[Session | None, Depends(get_db)],
) -> PlayerService:
    if settings.database_url and db is not None:
        return PlayerService(repository=SqlAlchemyPlayerRepository(db))
    return PlayerService(repository=_memory_repo_singleton())
