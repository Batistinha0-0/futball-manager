"""Regras puras: janela de datas de sessão acessíveis (ex.: últimos 14 dias no calendário da app)."""

from __future__ import annotations

from datetime import date, timedelta

from app.domain.exceptions import ValidationError

DEFAULT_RECENT_SESSION_DAYS = 14


def recent_session_date_range(today: date, *, max_days: int = DEFAULT_RECENT_SESSION_DAYS) -> tuple[date, date]:
    """Intervalo inclusive [start, end] com `end == today` e `max_days` corridos."""
    if max_days < 1:
        raise ValueError("max_days must be at least 1")
    end = today
    start = today - timedelta(days=max_days - 1)
    return start, end


def assert_session_date_in_recent_window(
    session_date: date,
    *,
    today: date,
    max_days: int = DEFAULT_RECENT_SESSION_DAYS,
) -> None:
    """Garante `session_date` entre o início da janela recente e `today` (inclusive)."""
    start, end = recent_session_date_range(today, max_days=max_days)
    if session_date > end:
        raise ValidationError(
            "match_day_session_date_future",
            "A data da sessão não pode ser no futuro.",
        )
    if session_date < start:
        raise ValidationError(
            "match_day_session_date_outside_window",
            f"Só é possível acessar sessões dos últimos {max_days} dias.",
        )
