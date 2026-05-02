"""Persistência da sessão de domingo (times, partidas, eventos)."""

from abc import ABC, abstractmethod
from collections.abc import Sequence
from datetime import date

from app.domain.matchday.entities import (
    MatchDayFixture,
    MatchDaySession,
    MatchDayTeam,
    MatchEvent,
    PlayerMatchDayStat,
)
from app.domain.matchday.session_summary import MatchDaySessionSummary


class MatchDayRepository(ABC):
    @abstractmethod
    def get_session_by_id(self, session_id: str) -> MatchDaySession | None:
        raise NotImplementedError

    @abstractmethod
    def get_session_by_date(self, session_date: date) -> MatchDaySession | None:
        raise NotImplementedError

    @abstractmethod
    def list_session_summaries_between(self, start: date, end: date) -> list[MatchDaySessionSummary]:
        """Sessões com `session_date` em [start, end], ordenadas por data descendente."""
        raise NotImplementedError

    @abstractmethod
    def save_session(self, session: MatchDaySession) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete_session_cascade(self, session_id: str) -> None:
        """Remove sessão e todos os filhos (re-sortear)."""
        raise NotImplementedError

    @abstractmethod
    def clear_teams_and_fixtures(self, session_id: str) -> None:
        """Remove times e partidas (mantém a sessão e configurações)."""
        raise NotImplementedError

    @abstractmethod
    def list_teams(self, session_id: str) -> list[MatchDayTeam]:
        raise NotImplementedError

    @abstractmethod
    def replace_teams(self, session_id: str, teams: list[MatchDayTeam]) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_fixtures(self, session_id: str) -> list[MatchDayFixture]:
        raise NotImplementedError

    @abstractmethod
    def replace_fixtures(self, session_id: str, fixtures: list[MatchDayFixture]) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_fixture(self, fixture_id: str) -> MatchDayFixture | None:
        raise NotImplementedError

    @abstractmethod
    def save_fixture(self, fixture: MatchDayFixture) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_events(self, fixture_id: str) -> list[MatchEvent]:
        raise NotImplementedError

    @abstractmethod
    def append_event(self, event: MatchEvent) -> None:
        raise NotImplementedError

    @abstractmethod
    def replace_player_match_day_stats(self, session_id: str, rows: Sequence[PlayerMatchDayStat]) -> None:
        """Substitui todas as linhas agregadas da sessão (idempotente no encerramento do dia)."""
        raise NotImplementedError
