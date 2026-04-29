"""SQLAlchemy engine and session factory (initialized when DATABASE_URL is set)."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    """ORM base for all tables."""

    pass


_engine = None
_SessionLocal: sessionmaker | None = None


def init_engine(database_url: str) -> None:
    """Create engine and session factory once (idempotent)."""
    global _engine, _SessionLocal
    if _engine is not None:
        return
    _engine = create_engine(
        database_url,
        pool_pre_ping=True,
    )
    _SessionLocal = sessionmaker(
        bind=_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )


def get_engine():
    if _engine is None:
        raise RuntimeError("Database engine not initialized; set DATABASE_URL and call init_engine.")
    return _engine


def get_session_factory() -> sessionmaker:
    if _SessionLocal is None:
        raise RuntimeError("Session factory not initialized.")
    return _SessionLocal
