"""Casos de uso: sessão de domingo, sorteio e partida."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, time, timezone
from typing import Any

from app.application.matchday.balanced_team_draw import TeamDrawBalancer, build_fixtures_for_session
from app.core.config import Settings
from app.core.timezone_helpers import is_sunday_match_layout_active, now_in_app_tz, today_date_in_app_tz
from app.domain.exceptions import ValidationError
from app.domain.matchday.entities import (
    MatchDayFixture,
    MatchDaySession,
    MatchDayTeam,
    MatchEvent,
)
from app.domain.matchday.enums import MatchDayPhase, MatchEventType, MatchFixtureStatus
from app.ports.match_day_repository import MatchDayRepository
from app.ports.player_repository import PlayerRepository


@dataclass(frozen=True, slots=True)
class TeamView:
    slot: int
    player_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class FixtureView:
    id: str
    order_index: int
    home_team_slot: int
    away_team_slot: int
    status: str
    started_at: datetime | None
    ended_at: datetime | None
    home_goals: int
    away_goals: int
    duration_seconds: int
    max_goals_per_team: int


@dataclass(frozen=True, slots=True)
class SessionView:
    id: str
    session_date: str
    timezone: str
    phase: str
    default_match_duration_seconds: int
    default_max_goals_per_team: int
    reference_start_time: str | None
    team_count: int
    players_per_team: int
    fixed_goalkeepers_enabled: bool
    fixed_goalkeeper_player_id_1: str | None
    fixed_goalkeeper_player_id_2: str | None
    teams: tuple[TeamView, ...]
    fixtures: tuple[FixtureView, ...]


@dataclass(frozen=True, slots=True)
class TodayView:
    server_now: datetime
    sunday_match_layout: bool
    session: SessionView | None


class MatchDayService:
    def __init__(
        self,
        *,
        settings: Settings,
        match_days: MatchDayRepository,
        players: PlayerRepository,
    ) -> None:
        self._settings = settings
        self._match_days = match_days
        self._players = players

    def get_today_view(self) -> TodayView:
        now = datetime.now(timezone.utc)
        layout = is_sunday_match_layout_active(self._settings, now_in_app_tz(self._settings))
        d = today_date_in_app_tz(self._settings)
        s = self._match_days.get_session_by_date(d)
        if not s:
            return TodayView(server_now=now, sunday_match_layout=layout, session=None)
        teams = self._match_days.list_teams(s.id)
        fixtures = self._match_days.list_fixtures(s.id)
        return TodayView(
            server_now=now,
            sunday_match_layout=layout,
            session=self._to_session_view(s, teams, fixtures),
        )

    def _to_session_view(
        self,
        s: MatchDaySession,
        teams: list[MatchDayTeam],
        fixtures: list[MatchDayFixture],
    ) -> SessionView:
        ref = s.reference_start_time.isoformat() if s.reference_start_time else None
        return SessionView(
            id=s.id,
            session_date=s.session_date.isoformat(),
            timezone=s.timezone,
            phase=s.phase.value,
            default_match_duration_seconds=s.default_match_duration_seconds,
            default_max_goals_per_team=s.default_max_goals_per_team,
            reference_start_time=ref,
            team_count=s.team_count,
            players_per_team=s.players_per_team,
            fixed_goalkeepers_enabled=s.fixed_goalkeepers_enabled,
            fixed_goalkeeper_player_id_1=s.fixed_goalkeeper_player_id_1,
            fixed_goalkeeper_player_id_2=s.fixed_goalkeeper_player_id_2,
            teams=tuple(TeamView(slot=t.slot, player_ids=t.player_ids) for t in sorted(teams, key=lambda x: x.slot)),
            fixtures=tuple(
                FixtureView(
                    id=f.id,
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
                for f in fixtures
            ),
        )

    def _any_fixture_live(self, session_id: str) -> bool:
        return any(f.status is MatchFixtureStatus.LIVE for f in self._match_days.list_fixtures(session_id))

    def draw_today(self) -> TodayView:
        d = today_date_in_app_tz(self._settings)
        s = self._match_days.get_session_by_date(d)
        if not s:
            raise ValidationError(
                "match_day_no_session",
                "Guarde as configurações do dia antes de sortear.",
            )
        if self._any_fixture_live(s.id):
            raise ValidationError("match_day_draw_blocked_live", "Não é possível sortear com uma partida ao vivo.")

        players = [p for p in self._players.list_players(active_only=True) if p.active]
        slots = TeamDrawBalancer.assign_teams(
            players=players,
            team_count=s.team_count,
            players_per_team=s.players_per_team,
            fixed_goalkeepers_enabled=s.fixed_goalkeepers_enabled,
            fixed_goalkeeper_player_id_1=s.fixed_goalkeeper_player_id_1,
            fixed_goalkeeper_player_id_2=s.fixed_goalkeeper_player_id_2,
        )
        self._match_days.clear_teams_and_fixtures(s.id)
        teams = [MatchDayTeam(session_id=s.id, slot=slot, player_ids=ids) for slot, ids in slots]
        self._match_days.replace_teams(s.id, teams)
        fixtures = build_fixtures_for_session(
            session_id=s.id,
            team_count=s.team_count,
            duration_seconds=s.default_match_duration_seconds,
            max_goals_per_team=s.default_max_goals_per_team,
        )
        self._match_days.replace_fixtures(s.id, fixtures)
        now = datetime.now(timezone.utc)
        self._match_days.save_session(
            MatchDaySession(
                id=s.id,
                session_date=s.session_date,
                timezone=s.timezone,
                phase=MatchDayPhase.PRE_MATCH,
                default_match_duration_seconds=s.default_match_duration_seconds,
                default_max_goals_per_team=s.default_max_goals_per_team,
                reference_start_time=s.reference_start_time,
                team_count=s.team_count,
                players_per_team=s.players_per_team,
                fixed_goalkeepers_enabled=s.fixed_goalkeepers_enabled,
                fixed_goalkeeper_player_id_1=s.fixed_goalkeeper_player_id_1,
                fixed_goalkeeper_player_id_2=s.fixed_goalkeeper_player_id_2,
                created_at=s.created_at,
                updated_at=now,
            )
        )
        return self.get_today_view()

    def patch_today_settings(self, updates: dict[str, Any], *, phase: MatchDayPhase | None) -> TodayView:
        d = today_date_in_app_tz(self._settings)
        now = datetime.now(timezone.utc)
        s = self._match_days.get_session_by_date(d)
        keys = set(updates.keys())

        if s and self._any_fixture_live(s.id):
            blocked = keys & {
                "team_count",
                "players_per_team",
                "fixed_goalkeepers_enabled",
                "fixed_goalkeeper_player_id_1",
                "fixed_goalkeeper_player_id_2",
            }
            if blocked:
                raise ValidationError(
                    "match_day_settings_blocked_live",
                    "Com partida ao vivo só pode alterar duração/máx. golos/fase nas partidas em espera.",
                )

        if not s:
            dur = int(updates["default_match_duration_seconds"]) if "default_match_duration_seconds" in keys else 420
            mx = int(updates["default_max_goals_per_team"]) if "default_max_goals_per_team" in keys else 2
            tc = int(updates["team_count"]) if "team_count" in keys else 2
            ppt = int(updates["players_per_team"]) if "players_per_team" in keys else 5
            fge = bool(updates["fixed_goalkeepers_enabled"]) if "fixed_goalkeepers_enabled" in keys else False
            g1 = updates["fixed_goalkeeper_player_id_1"] if "fixed_goalkeeper_player_id_1" in keys else None
            g2 = updates["fixed_goalkeeper_player_id_2"] if "fixed_goalkeeper_player_id_2" in keys else None
        else:
            dur = (
                int(updates["default_match_duration_seconds"])
                if "default_match_duration_seconds" in keys
                else s.default_match_duration_seconds
            )
            mx = (
                int(updates["default_max_goals_per_team"])
                if "default_max_goals_per_team" in keys
                else s.default_max_goals_per_team
            )
            tc = int(updates["team_count"]) if "team_count" in keys else s.team_count
            ppt = int(updates["players_per_team"]) if "players_per_team" in keys else s.players_per_team
            fge = (
                bool(updates["fixed_goalkeepers_enabled"])
                if "fixed_goalkeepers_enabled" in keys
                else s.fixed_goalkeepers_enabled
            )
            g1 = (
                updates["fixed_goalkeeper_player_id_1"]
                if "fixed_goalkeeper_player_id_1" in keys
                else s.fixed_goalkeeper_player_id_1
            )
            g2 = (
                updates["fixed_goalkeeper_player_id_2"]
                if "fixed_goalkeeper_player_id_2" in keys
                else s.fixed_goalkeeper_player_id_2
            )

        if not fge:
            g1 = None
            g2 = None
        if g1 == "":
            g1 = None
        if g2 == "":
            g2 = None

        if dur < 60 or dur > 3600:
            raise ValidationError("match_day_bad_duration", "Match duration must be between 60 and 3600 seconds.")
        if mx < 0 or mx > 20:
            raise ValidationError("match_day_bad_max_goals", "Max goals per team must be between 0 and 20.")
        if tc < 2 or tc > 12:
            raise ValidationError("match_day_bad_team_count", "Número de equipas deve estar entre 2 e 12.")
        if ppt < 1 or ppt > 20:
            raise ValidationError("match_day_bad_roster_size", "Jogadores por equipa deve estar entre 1 e 20.")

        ph = phase if phase is not None else (s.phase if s else MatchDayPhase.PRE_MATCH)

        if not s:
            sid = str(uuid.uuid4())
            ns = MatchDaySession(
                id=sid,
                session_date=d,
                timezone=self._settings.app_timezone,
                phase=ph,
                default_match_duration_seconds=dur,
                default_max_goals_per_team=mx,
                reference_start_time=time(8, 30),
                team_count=tc,
                players_per_team=ppt,
                fixed_goalkeepers_enabled=fge,
                fixed_goalkeeper_player_id_1=g1,
                fixed_goalkeeper_player_id_2=g2,
                created_at=now,
                updated_at=now,
            )
            self._match_days.save_session(ns)
        else:
            ns = MatchDaySession(
                id=s.id,
                session_date=s.session_date,
                timezone=s.timezone,
                phase=ph,
                default_match_duration_seconds=dur,
                default_max_goals_per_team=mx,
                reference_start_time=s.reference_start_time,
                team_count=tc,
                players_per_team=ppt,
                fixed_goalkeepers_enabled=fge,
                fixed_goalkeeper_player_id_1=g1,
                fixed_goalkeeper_player_id_2=g2,
                created_at=s.created_at,
                updated_at=now,
            )
            self._match_days.save_session(ns)
            for f in self._match_days.list_fixtures(s.id):
                if f.status is MatchFixtureStatus.PENDING:
                    nf = MatchDayFixture(
                        id=f.id,
                        session_id=f.session_id,
                        order_index=f.order_index,
                        home_team_slot=f.home_team_slot,
                        away_team_slot=f.away_team_slot,
                        status=f.status,
                        started_at=f.started_at,
                        ended_at=f.ended_at,
                        home_goals=f.home_goals,
                        away_goals=f.away_goals,
                        duration_seconds=dur,
                        max_goals_per_team=mx,
                    )
                    self._match_days.save_fixture(nf)
        return self.get_today_view()

    def start_fixture(self, fixture_id: str) -> TodayView:
        fx = self._require_fixture(fixture_id)
        if fx.status is not MatchFixtureStatus.PENDING:
            raise ValidationError("match_day_fixture_bad_state", "Fixture cannot be started.")
        now = datetime.now(timezone.utc)
        nf = MatchDayFixture(
            id=fx.id,
            session_id=fx.session_id,
            order_index=fx.order_index,
            home_team_slot=fx.home_team_slot,
            away_team_slot=fx.away_team_slot,
            status=MatchFixtureStatus.LIVE,
            started_at=now,
            ended_at=None,
            home_goals=fx.home_goals,
            away_goals=fx.away_goals,
            duration_seconds=fx.duration_seconds,
            max_goals_per_team=fx.max_goals_per_team,
        )
        self._match_days.save_fixture(nf)
        self._bump_session_phase_live(fx.session_id)
        return self.get_today_view()

    def finish_fixture(self, fixture_id: str) -> TodayView:
        fx = self._require_fixture(fixture_id)
        if fx.status is not MatchFixtureStatus.LIVE:
            raise ValidationError("match_day_fixture_not_live", "Fixture is not live.")
        now = datetime.now(timezone.utc)
        nf = MatchDayFixture(
            id=fx.id,
            session_id=fx.session_id,
            order_index=fx.order_index,
            home_team_slot=fx.home_team_slot,
            away_team_slot=fx.away_team_slot,
            status=MatchFixtureStatus.FINISHED,
            started_at=fx.started_at,
            ended_at=now,
            home_goals=fx.home_goals,
            away_goals=fx.away_goals,
            duration_seconds=fx.duration_seconds,
            max_goals_per_team=fx.max_goals_per_team,
        )
        self._match_days.save_fixture(nf)
        return self.get_today_view()

    def record_event(
        self,
        *,
        fixture_id: str,
        type: MatchEventType,
        player_id: str | None,
        team_slot: int,
        elapsed_seconds: int | None,
    ) -> TodayView:
        fx = self._require_fixture(fixture_id)
        if fx.status is not MatchFixtureStatus.LIVE:
            raise ValidationError("match_day_fixture_not_live", "Fixture is not live.")
        if team_slot not in (fx.home_team_slot, fx.away_team_slot):
            raise ValidationError("match_day_bad_team_slot", "team_slot must be home or away for this fixture.")
        if player_id:
            p = self._players.get_by_id(player_id)
            if not p:
                raise ValidationError("match_day_unknown_player", "Unknown player.")
        now = datetime.now(timezone.utc)
        nh = fx.home_goals
        na = fx.away_goals
        if type is MatchEventType.GOAL:
            home_inc = 1 if team_slot == fx.home_team_slot else 0
            away_inc = 1 if team_slot == fx.away_team_slot else 0
            nh = fx.home_goals + home_inc
            na = fx.away_goals + away_inc
            if nh > fx.max_goals_per_team or na > fx.max_goals_per_team:
                raise ValidationError("match_day_max_goals", "Max goals per team reached for this fixture.")
        ev = MatchEvent(
            id=str(uuid.uuid4()),
            fixture_id=fx.id,
            type=type,
            player_id=player_id,
            team_slot=team_slot,
            recorded_at=now,
            elapsed_seconds=elapsed_seconds,
        )
        self._match_days.append_event(ev)
        if type is MatchEventType.GOAL:
            nf = MatchDayFixture(
                id=fx.id,
                session_id=fx.session_id,
                order_index=fx.order_index,
                home_team_slot=fx.home_team_slot,
                away_team_slot=fx.away_team_slot,
                status=fx.status,
                started_at=fx.started_at,
                ended_at=fx.ended_at,
                home_goals=nh,
                away_goals=na,
                duration_seconds=fx.duration_seconds,
                max_goals_per_team=fx.max_goals_per_team,
            )
            self._match_days.save_fixture(nf)
        return self.get_today_view()

    def list_fixture_events(self, fixture_id: str) -> list[MatchEvent]:
        self._require_fixture(fixture_id)
        return self._match_days.list_events(fixture_id)

    def _require_fixture(self, fixture_id: str) -> MatchDayFixture:
        fx = self._match_days.get_fixture(fixture_id)
        if not fx:
            raise ValidationError("match_day_unknown_fixture", "Unknown fixture.")
        return fx

    def _bump_session_phase_live(self, session_id: str) -> None:
        s = self._match_days.get_session_by_id(session_id)
        if not s or s.phase is MatchDayPhase.LIVE:
            return
        now = datetime.now(timezone.utc)
        ns = MatchDaySession(
            id=s.id,
            session_date=s.session_date,
            timezone=s.timezone,
            phase=MatchDayPhase.LIVE,
            default_match_duration_seconds=s.default_match_duration_seconds,
            default_max_goals_per_team=s.default_max_goals_per_team,
            reference_start_time=s.reference_start_time,
            team_count=s.team_count,
            players_per_team=s.players_per_team,
            fixed_goalkeepers_enabled=s.fixed_goalkeepers_enabled,
            fixed_goalkeeper_player_id_1=s.fixed_goalkeeper_player_id_1,
            fixed_goalkeeper_player_id_2=s.fixed_goalkeeper_player_id_2,
            created_at=s.created_at,
            updated_at=now,
        )
        self._match_days.save_session(ns)
