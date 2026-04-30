from typing import Protocol


class PasswordHasher(Protocol):
    """Hashing port — keeps password algorithms out of application services."""

    def hash(self, plain_password: str) -> str:
        ...

    def verify(self, plain_password: str, password_hash: str) -> bool:
        ...
