"""Helpers for PostgreSQL connection strings (SQLAlchemy + Psycopg 3)."""


def normalize_postgres_url_for_psycopg(url: str) -> str:
    """Use Psycopg 3 driver; bare ``postgresql://`` defaults to missing psycopg2 on many hosts."""
    u = url.strip()
    if u.startswith("postgresql://"):
        return "postgresql+psycopg://" + u.removeprefix("postgresql://")
    if u.startswith("postgres://"):
        return "postgresql+psycopg://" + u.removeprefix("postgres://")
    return u
