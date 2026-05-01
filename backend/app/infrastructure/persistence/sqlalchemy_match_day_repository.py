from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.domain.matchday.entities import (
    MatchDayFixture,
    MatchDaySession,
    MatchDayTeam,
    MatchEvent,
)
from app.domain.matchday.enums import MatchDayPhase, MatchEventType, MatchFixtureStatus
from app.infrastructure.persistence.models.match_day_fixture_row import MatchDayFixtureRow
from app.infrastructure.persistence.models.match_day_session_row import MatchDaySessionRow
from app.infrastructure.persistence.models.match_day_team_row import MatchDayTeamRow
from app.infrastructure.persistence.models.match_event_row import MatchEventRow
from app.ports.match_day_repository import MatchDayRepository


def _sid(s: str) -> UUID:
    return UUID(s)


def _session_from_row(r: MatchDaySessionRow) -> MatchDaySession:
    return MatchDaySession(
        id=str(r.id),
        session_date=r.session_date,
        timezone=r.timezone,
        phase=MatchDayPhase(r.phase),
        default_match_duration_seconds=r.default_match_duration_seconds,
        default_max_goals_per_team=r.default_max_goals_per_team,
        reference_start_time=r.reference_start_time,
        team_count=r.team_count,
        players_per_team=r.players_per_team,
        fixed_goalkeepers_enabled=r.fixed_goalkeepers_enabled,
        fixed_goalkeeper_player_id_1=str(r.fixed_goalkeeper_player_id_1)
        if r.fixed_goalkeeper_player_id_1
        else None,
        fixed_goalkeeper_player_id_2=str(r.fixed_goalkeeper_player_id_2)
        if r.fixed_goalkeeper_player_id_2
        else None,
        created_at=r.created_at,
        updated_at=r.updated_at,
        draft_teams_json=r.draft_teams_json,
        lineup_committed_at=r.lineup_committed_at,
        draw_signatures_json=r.draw_signatures_json,
    )


def _team_from_row(r: MatchDayTeamRow) -> MatchDayTeam:
    slot: int = int(r.slot)
    if slot < 1:
        raise ValueError("invalid team slot")
    ids = tuple(str(x) for x in (r.player_ids or []))
    return MatchDayTeam(session_id=str(r.session_id), slot=slot, player_ids=ids)


def _fixture_from_row(r: MatchDayFixtureRow) -> MatchDayFixture:
    hs = int(r.home_team_slot)
    aws = int(r.away_team_slot)
    return MatchDayFixture(
        id=str(r.id),
        session_id=str(r.session_id),
        order_index=r.order_index,
        home_team_slot=hs,
        away_team_slot=aws,
        status=MatchFixtureStatus(r.status),
        started_at=r.started_at,
        ended_at=r.ended_at,
        home_goals=r.home_goals,
        away_goals=r.away_goals,
        duration_seconds=r.duration_seconds,
        max_goals_per_team=r.max_goals_per_team,
    )


def _event_from_row(r: MatchEventRow) -> MatchEvent:
    ts = int(r.team_slot)
    return MatchEvent(
        id=str(r.id),
        fixture_id=str(r.fixture_id),
        type=MatchEventType(r.type),
        player_id=str(r.player_id) if r.player_id else None,
        team_slot=ts,
        recorded_at=r.recorded_at,
        elapsed_seconds=r.elapsed_seconds,
    )


class SqlAlchemyMatchDayRepository(MatchDayRepository):
    def __init__(self, session: Session) -> None:
        self._s = session

    def get_session_by_id(self, session_id: str) -> MatchDaySession | None:
        row = self._s.get(MatchDaySessionRow, _sid(session_id))
        return _session_from_row(row) if row else None

    def get_session_by_date(self, session_date: date) -> MatchDaySession | None:
        row = self._s.scalars(
            select(MatchDaySessionRow).where(MatchDaySessionRow.session_date == session_date)
        ).first()
        return _session_from_row(row) if row else None

    def save_session(self, session: MatchDaySession) -> None:
        uid = _sid(session.id)
        row = self._s.get(MatchDaySessionRow, uid)
        if row is None:
            row = MatchDaySessionRow(
                id=uid,
                session_date=session.session_date,
                timezone=session.timezone,
                phase=session.phase.value,
                default_match_duration_seconds=session.default_match_duration_seconds,
                default_max_goals_per_team=session.default_max_goals_per_team,
                reference_start_time=session.reference_start_time,
                team_count=session.team_count,
                players_per_team=session.players_per_team,
                fixed_goalkeepers_enabled=session.fixed_goalkeepers_enabled,
                fixed_goalkeeper_player_id_1=_sid(session.fixed_goalkeeper_player_id_1)
                if session.fixed_goalkeeper_player_id_1
                else None,
                fixed_goalkeeper_player_id_2=_sid(session.fixed_goalkeeper_player_id_2)
                if session.fixed_goalkeeper_player_id_2
                else None,
                created_at=session.created_at,
                updated_at=session.updated_at,
                draft_teams_json=session.draft_teams_json,
                lineup_committed_at=session.lineup_committed_at,
                draw_signatures_json=session.draw_signatures_json,
            )
            self._s.add(row)
        else:
            row.timezone = session.timezone
            row.phase = session.phase.value
            row.default_match_duration_seconds = session.default_match_duration_seconds
            row.default_max_goals_per_team = session.default_max_goals_per_team
            row.reference_start_time = session.reference_start_time
            row.team_count = session.team_count
            row.players_per_team = session.players_per_team
            row.fixed_goalkeepers_enabled = session.fixed_goalkeepers_enabled
            row.fixed_goalkeeper_player_id_1 = (
                _sid(session.fixed_goalkeeper_player_id_1) if session.fixed_goalkeeper_player_id_1 else None
            )
            row.fixed_goalkeeper_player_id_2 = (
                _sid(session.fixed_goalkeeper_player_id_2) if session.fixed_goalkeeper_player_id_2 else None
            )
            row.updated_at = session.updated_at
            row.draft_teams_json = session.draft_teams_json
            row.lineup_committed_at = session.lineup_committed_at
            row.draw_signatures_json = session.draw_signatures_json
        # Garantir INSERT/UPDATE da sessão antes de filhos (equipas/fixtures) no mesmo flush/commit —
        # sem relationship FK, o SQLAlchemy pode ordenar INSERTs por nome de tabela e violar FK no Postgres.
        self._s.flush()

    def delete_session_cascade(self, session_id: str) -> None:
        uid = _sid(session_id)
        row = self._s.get(MatchDaySessionRow, uid)
        if row:
            self._s.delete(row)
            self._s.flush()

    def clear_teams_and_fixtures(self, session_id: str) -> None:
        uid = _sid(session_id)
        self._s.execute(delete(MatchDayFixtureRow).where(MatchDayFixtureRow.session_id == uid))
        self._s.execute(delete(MatchDayTeamRow).where(MatchDayTeamRow.session_id == uid))
        self._s.flush()

    def list_teams(self, session_id: str) -> list[MatchDayTeam]:
        uid = _sid(session_id)
        rows = self._s.scalars(select(MatchDayTeamRow).where(MatchDayTeamRow.session_id == uid)).all()
        return [_team_from_row(r) for r in rows]

    def replace_teams(self, session_id: str, teams: list[MatchDayTeam]) -> None:
        uid = _sid(session_id)
        self._s.execute(delete(MatchDayTeamRow).where(MatchDayTeamRow.session_id == uid))
        for t in teams:
            self._s.add(
                MatchDayTeamRow(
                    session_id=uid,
                    slot=t.slot,
                    player_ids=list(t.player_ids),
                )
            )

    def list_fixtures(self, session_id: str) -> list[MatchDayFixture]:
        uid = _sid(session_id)
        rows = self._s.scalars(
            select(MatchDayFixtureRow)
            .where(MatchDayFixtureRow.session_id == uid)
            .order_by(MatchDayFixtureRow.order_index)
        ).all()
        return [_fixture_from_row(r) for r in rows]

    def replace_fixtures(self, session_id: str, fixtures: list[MatchDayFixture]) -> None:
        uid = _sid(session_id)
        self._s.execute(delete(MatchDayFixtureRow).where(MatchDayFixtureRow.session_id == uid))
        for f in fixtures:
            self._s.add(
                MatchDayFixtureRow(
                    id=_sid(f.id),
                    session_id=uid,
                    order_index=f.order_index,
                    home_team_slot=f.home_team_slot,
                    away_team_slot=f.away_team_slot,
                    status=f.status.value,
                    started_at=f.started_at,
                    ended_at=f.ended_at,
                    home_goals=f.home_goals,
                    away_goals=f.away_goals,
                    duration_seconds=f.duration_seconds,
                    max_goals_per_team=f.max_goals_per_team,
                )
            )

    def get_fixture(self, fixture_id: str) -> MatchDayFixture | None:
        row = self._s.get(MatchDayFixtureRow, _sid(fixture_id))
        return _fixture_from_row(row) if row else None

    def save_fixture(self, fixture: MatchDayFixture) -> None:
        row = self._s.get(MatchDayFixtureRow, _sid(fixture.id))
        if row is None:
            self._s.add(
                MatchDayFixtureRow(
                    id=_sid(fixture.id),
                    session_id=_sid(fixture.session_id),
                    order_index=fixture.order_index,
                    home_team_slot=fixture.home_team_slot,
                    away_team_slot=fixture.away_team_slot,
                    status=fixture.status.value,
                    started_at=fixture.started_at,
                    ended_at=fixture.ended_at,
                    home_goals=fixture.home_goals,
                    away_goals=fixture.away_goals,
                    duration_seconds=fixture.duration_seconds,
                    max_goals_per_team=fixture.max_goals_per_team,
                )
            )
            return
        row.order_index = fixture.order_index
        row.home_team_slot = fixture.home_team_slot
        row.away_team_slot = fixture.away_team_slot
        row.status = fixture.status.value
        row.started_at = fixture.started_at
        row.ended_at = fixture.ended_at
        row.home_goals = fixture.home_goals
        row.away_goals = fixture.away_goals
        row.duration_seconds = fixture.duration_seconds
        row.max_goals_per_team = fixture.max_goals_per_team

    def list_events(self, fixture_id: str) -> list[MatchEvent]:
        fid = _sid(fixture_id)
        rows = self._s.scalars(
            select(MatchEventRow).where(MatchEventRow.fixture_id == fid).order_by(MatchEventRow.recorded_at)
        ).all()
        return [_event_from_row(r) for r in rows]

    def append_event(self, event: MatchEvent) -> None:
        pid = _sid(event.player_id) if event.player_id else None
        self._s.add(
            MatchEventRow(
                id=_sid(event.id),
                fixture_id=_sid(event.fixture_id),
                type=event.type.value,
                player_id=pid,
                team_slot=event.team_slot,
                recorded_at=event.recorded_at,
                elapsed_seconds=event.elapsed_seconds,
            )
        )
