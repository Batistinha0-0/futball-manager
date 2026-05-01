import bcrypt

# Limite do algoritmo bcrypt; truncar evita ValueError em senhas longas (mesmo comportamento comum).
_MAX_PASSWORD_BYTES = 72


def _password_bytes(plain_password: str) -> bytes:
    b = plain_password.encode("utf-8")
    if len(b) > _MAX_PASSWORD_BYTES:
        return b[:_MAX_PASSWORD_BYTES]
    return b


class BcryptPasswordHasher:
    """bcrypt nativo (evita passlib + bcrypt>=4.1 incompatíveis no deploy)."""

    def hash(self, plain_password: str) -> str:
        return bcrypt.hashpw(_password_bytes(plain_password), bcrypt.gensalt()).decode("ascii")

    def verify(self, plain_password: str, password_hash: str) -> bool:
        try:
            return bcrypt.checkpw(
                _password_bytes(plain_password),
                password_hash.encode("ascii"),
            )
        except (ValueError, TypeError):
            return False
