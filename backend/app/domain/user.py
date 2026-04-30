from dataclasses import dataclass
from enum import Enum


class UserRole(str, Enum):
    """Organizer-facing roles stored on `users.role`."""

    ORGANIZER = "organizer"
    ADMIN = "admin"
    #: First account from env bootstrap; same capability as admin (manages other users).
    SUPER_ADMIN = "super_admin"


@dataclass(frozen=True, slots=True)
class User:
    """Organizer account (no password material — use `UserAuthRecord` for login lookup)."""

    id: str
    user_name: str
    phone: str
    role: UserRole


@dataclass(frozen=True, slots=True)
class UserAuthRecord:
    """Bundle used only in the authentication application flow."""

    user: User
    password_hash: str
