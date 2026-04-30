"""Ensure the first `super_admin` user exists when bootstrap env vars are set (idempotent)."""

from __future__ import annotations

import logging

from app.core.config import Settings
from app.domain.user import UserRole
from app.infrastructure.persistence.database import get_session_factory
from app.infrastructure.persistence.sqlalchemy_user_repository import SqlAlchemyUserRepository
from app.infrastructure.security.bcrypt_password_hasher import BcryptPasswordHasher

logger = logging.getLogger(__name__)

# Placeholder until a profile API exists; super_admin can share a generic contact.
_BOOTSTRAP_PHONE = "+000000000000"


def ensure_bootstrap_super_admin(settings: Settings) -> None:
    """
    If `bootstrap_super_admin_enabled`, insert `super_admin` when `user_name` is absent.
    Does not change existing users or reset passwords.
    """
    if not settings.database_url:
        return

    un = settings.bootstrap_super_admin_user_name
    pw = settings.bootstrap_super_admin_password
    if not un and not pw:
        return
    if not un or not pw:
        logger.warning(
            "Bootstrap super_admin skipped: set both BOOTSTRAP_SUPER_ADMIN_USER_NAME and "
            "BOOTSTRAP_SUPER_ADMIN_PASSWORD, or leave both unset."
        )
        return

    session_factory = get_session_factory()
    session = session_factory()
    try:
        repo = SqlAlchemyUserRepository(session)
        if repo.get_auth_record_by_username(un) is not None:
            logger.info("Bootstrap super_admin skipped: user_name %r already exists.", un)
            return
        hasher = BcryptPasswordHasher()
        repo.create(
            user_name=un,
            phone=_BOOTSTRAP_PHONE,
            role=UserRole.SUPER_ADMIN,
            password_hash=hasher.hash(pw),
        )
        session.commit()
        logger.info("Bootstrap super_admin created for user_name %r.", un)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
