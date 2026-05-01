from collections.abc import Generator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.application.auth.auth_service import AuthService
from app.application.matchday.match_day_service import MatchDayService
from app.application.players.player_service import PlayerService
from app.core.config import Settings, get_settings
from app.application.users.user_admin_service import UserAdminService
from app.domain.exceptions import AuthenticationError
from app.domain.permissions import Permission, permissions_for
from app.domain.user import User, UserRole
from app.infrastructure.persistence.database import get_session_factory
from app.infrastructure.persistence.memory_match_day_repository import MemoryMatchDayRepository
from app.infrastructure.persistence.memory_player_repository import (
    MemoryPlayerRepository,
    create_default_memory_repository,
)
from app.infrastructure.persistence.sqlalchemy_match_day_repository import SqlAlchemyMatchDayRepository
from app.infrastructure.persistence.sqlalchemy_player_repository import (
    SqlAlchemyPlayerRepository,
)
from app.infrastructure.persistence.sqlalchemy_refresh_token_repository import (
    SqlAlchemyRefreshTokenRepository,
)
from app.infrastructure.persistence.sqlalchemy_user_repository import (
    SqlAlchemyUserRepository,
)
from app.infrastructure.security.bcrypt_password_hasher import BcryptPasswordHasher
from app.infrastructure.security.pyjwt_access_token_service import PyJwtAccessTokenService


@lru_cache
def _memory_repo_singleton() -> MemoryPlayerRepository:
    return create_default_memory_repository()


@lru_cache
def _memory_match_day_singleton() -> MemoryMatchDayRepository:
    return MemoryMatchDayRepository()


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


def get_writable_db(
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[Session | None, Depends(get_db)],
) -> Session:
    if db is None or not settings.database_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured.",
        )
    return db


def get_player_service(
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[Session | None, Depends(get_db)],
) -> PlayerService:
    if settings.database_url and db is not None:
        return PlayerService(repository=SqlAlchemyPlayerRepository(db))
    return PlayerService(repository=_memory_repo_singleton())


def get_match_day_service(
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[Session | None, Depends(get_db)],
) -> MatchDayService:
    if settings.database_url and db is not None:
        return MatchDayService(
            settings=settings,
            match_days=SqlAlchemyMatchDayRepository(db),
            players=SqlAlchemyPlayerRepository(db),
        )
    return MatchDayService(
        settings=settings,
        match_days=_memory_match_day_singleton(),
        players=_memory_repo_singleton(),
    )


@lru_cache
def _password_hasher_singleton() -> BcryptPasswordHasher:
    return BcryptPasswordHasher()


def get_auth_service(
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[Session | None, Depends(get_db)],
) -> AuthService:
    if db is None or not settings.database_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication requires DATABASE_URL.",
        )
    if not settings.jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT_SECRET is not configured.",
        )
    return AuthService(
        users=SqlAlchemyUserRepository(db),
        passwords=_password_hasher_singleton(),
        tokens=PyJwtAccessTokenService(
            secret=settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
            expires_minutes=settings.jwt_access_expires_minutes,
        ),
        refresh_tokens=SqlAlchemyRefreshTokenRepository(db),
        refresh_pepper=settings.refresh_token_pepper_effective,
        refresh_expires_days=settings.jwt_refresh_expires_days,
    )


def get_current_user(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    auth: Annotated[AuthService, Depends(get_auth_service)],
) -> User:
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    try:
        return auth.resolve_user_from_token(token)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        ) from exc


def require_super_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super_admin may access this resource.",
        )
    return user


def require_players_read(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if Permission.PLAYERS_READ not in permissions_for(user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: players:read.",
        )
    return user


def require_players_write(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if Permission.PLAYERS_WRITE not in permissions_for(user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing permission: players:write.",
        )
    return user


def get_user_admin_service(
    db: Annotated[Session, Depends(get_writable_db)],
) -> UserAdminService:
    return UserAdminService(
        users=SqlAlchemyUserRepository(db),
        passwords=_password_hasher_singleton(),
    )
