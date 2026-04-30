from enum import Enum

from app.domain.user import UserRole


class Permission(str, Enum):
    """Fine-grained permissions; assignment is derived from `UserRole` (no extra DB table in v1)."""

    PLAYERS_READ = "players:read"
    PLAYERS_WRITE = "players:write"
    USERS_MANAGE = "users:manage"


def permissions_for(role: UserRole) -> frozenset[Permission]:
    """Return the permission set implied by a role (open for extension: add roles/permissions here)."""
    if role is UserRole.ADMIN or role is UserRole.SUPER_ADMIN:
        return frozenset(Permission)
    if role is UserRole.ORGANIZER:
        return frozenset({Permission.PLAYERS_READ, Permission.PLAYERS_WRITE})
    return frozenset()
