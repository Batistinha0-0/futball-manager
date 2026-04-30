from passlib.context import CryptContext

_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class BcryptPasswordHasher:
    """bcrypt via passlib (PasswordHasher port)."""

    def hash(self, plain_password: str) -> str:
        return _context.hash(plain_password)

    def verify(self, plain_password: str, password_hash: str) -> bool:
        return _context.verify(plain_password, password_hash)
