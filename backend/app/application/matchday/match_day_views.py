"""DTOs de leitura para API / UI (separados do serviço para SRP)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


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
    lineup_official: bool
    teams: tuple[TeamView, ...]
    fixtures: tuple[FixtureView, ...]


@dataclass(frozen=True, slots=True)
class TodayView:
    server_now: datetime
    sunday_match_layout: bool
    session: SessionView | None
