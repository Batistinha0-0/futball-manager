"""Small helpers for HTTP handlers that optionally run against a SQLAlchemy session."""

from collections.abc import Callable, Generator
from contextlib import contextmanager
from typing import TypeVar

from sqlalchemy.orm import Session

T = TypeVar("T")


@contextmanager
def optional_db_commit(db: Session | None) -> Generator[None, None, None]:
    """
    Commit on success, rollback on any exception, when ``db`` is not ``None``.
    In-memory / no-DB mode leaves the session argument as ``None`` (no-op).
    """
    try:
        yield
        if db is not None:
            db.commit()
    except BaseException:
        if db is not None:
            db.rollback()
        raise


def run_with_optional_commit(db: Session | None, fn: Callable[[], T]) -> T:
    """Run ``fn`` inside :func:`optional_db_commit`."""
    with optional_db_commit(db):
        return fn()
