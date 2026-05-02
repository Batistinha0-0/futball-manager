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
from app.ports.match_day_repository import MatchDayRepository


class MemoryMatchDayRepository(MatchDayRepository):
    """Armazenamento em memória (testes e dev sem Postgres)."""

    def __init__(self) -> None:
        self._sessions_by_id: dict[str, MatchDaySession] = {}
        self._date_to_session_id: dict[date, str] = {}
        self._teams: dict[str, list[MatchDayTeam]] = {}
        self._fixtures: dict[str, list[MatchDayFixture]] = {}
        self._fixture_by_id: dict[str, MatchDayFixture] = {}
        self._events: dict[str, list[MatchEvent]] = {}
        self._player_match_day_stats: dict[str, list[PlayerMatchDayStat]] = {}

    def get_session_by_id(self, session_id: str) -> MatchDaySession | None:
        return self._sessions_by_id.get(session_id)

    def get_session_by_date(self, session_date: date) -> MatchDaySession | None:
        sid = self._date_to_session_id.get(session_date)
        if not sid:
            return None
        return self._sessions_by_id.get(sid)

    def list_session_summaries_between(self, start: date, end: date) -> list[MatchDaySessionSummary]:
        items: list[MatchDaySessionSummary] = []
        for s in self._sessions_by_id.values():
            if start <= s.session_date <= end:
                items.append(
                    MatchDaySessionSummary(
                        session_date=s.session_date,
                        phase=s.phase.value,
                        updated_at=s.updated_at,
                        has_draft=bool(s.draft_teams_json),
                    )
                )
        items.sort(key=lambda x: x.session_date, reverse=True)
        return items

    def save_session(self, session: MatchDaySession) -> None:
        self._sessions_by_id[session.id] = session
        self._date_to_session_id[session.session_date] = session.id
        self._teams.setdefault(session.id, [])
        self._fixtures.setdefault(session.id, [])
        self._events.setdefault(session.id, [])

    def delete_session_cascade(self, session_id: str) -> None:
        session = self._sessions_by_id.pop(session_id, None)
        if session:
            self._date_to_session_id.pop(session.session_date, None)
        self._teams.pop(session_id, None)
        self._player_match_day_stats.pop(session_id, None)
        fxs = self._fixtures.pop(session_id, None)
        if fxs:
            for fx in fxs:
                self._fixture_by_id.pop(fx.id, None)
                self._events.pop(fx.id, None)

    def clear_teams_and_fixtures(self, session_id: str) -> None:
        fxs = self._fixtures.pop(session_id, None)
        if fxs:
            for fx in fxs:
                self._fixture_by_id.pop(fx.id, None)
                self._events.pop(fx.id, None)
        self._teams[session_id] = []

    def list_teams(self, session_id: str) -> list[MatchDayTeam]:
        return list(self._teams.get(session_id, []))

    def replace_teams(self, session_id: str, teams: list[MatchDayTeam]) -> None:
        self._teams[session_id] = list(teams)

    def list_fixtures(self, session_id: str) -> list[MatchDayFixture]:
        return sorted(self._fixtures.get(session_id, []), key=lambda f: f.order_index)

    def replace_fixtures(self, session_id: str, fixtures: list[MatchDayFixture]) -> None:
        old = self._fixtures.get(session_id, [])
        for fx in old:
            self._fixture_by_id.pop(fx.id, None)
            self._events.pop(fx.id, None)
        self._fixtures[session_id] = list(fixtures)
        for fx in fixtures:
            self._fixture_by_id[fx.id] = fx
            self._events.setdefault(fx.id, [])

    def get_fixture(self, fixture_id: str) -> MatchDayFixture | None:
        return self._fixture_by_id.get(fixture_id)

    def save_fixture(self, fixture: MatchDayFixture) -> None:
        self._fixture_by_id[fixture.id] = fixture
        lst = self._fixtures.setdefault(fixture.session_id, [])
        for i, f in enumerate(lst):
            if f.id == fixture.id:
                lst[i] = fixture
                return
        lst.append(fixture)
        lst.sort(key=lambda x: x.order_index)

    def list_events(self, fixture_id: str) -> list[MatchEvent]:
        return list(self._events.get(fixture_id, []))

    def append_event(self, event: MatchEvent) -> None:
        self._events.setdefault(event.fixture_id, []).append(event)

    def replace_player_match_day_stats(self, session_id: str, rows: Sequence[PlayerMatchDayStat]) -> None:
        self._player_match_day_stats[session_id] = list(rows)
