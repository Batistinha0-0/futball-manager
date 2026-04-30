import hashlib


def hash_refresh_token(raw: str, pepper: str) -> str:
    """SHA-256 hex digest of opaque refresh value + server-side pepper."""
    return hashlib.sha256(f"{raw}{pepper}".encode("utf-8")).hexdigest()
