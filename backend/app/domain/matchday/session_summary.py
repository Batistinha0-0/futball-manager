"""Resumo de sessão para listagens (sem carregar times/fixtures)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True, slots=True)
class MatchDaySessionSummary:
    session_date: date
    phase: str
    updated_at: datetime
    has_draft: bool
