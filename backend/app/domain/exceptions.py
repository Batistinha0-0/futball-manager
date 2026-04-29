"""Domain-level error codes (English). User-facing messages are mapped in the frontend (pt-BR)."""


class DomainError(Exception):
    """Base class for domain errors."""

    def __init__(self, code: str, message: str | None = None) -> None:
        self.code = code
        super().__init__(message or code)


class ValidationError(DomainError):
    """Raised when domain invariants are violated."""

    pass
