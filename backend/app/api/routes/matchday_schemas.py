from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.application.matchday.match_day_service import TodayView


class TeamOut(BaseModel):
    slot: int
    player_ids: list[str] = Field(default_factory=list)


class FixtureOut(BaseModel):
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


class SessionOut(BaseModel):
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
    teams: list[TeamOut]
    fixtures: list[FixtureOut]


class TodayOut(BaseModel):
    server_now: datetime
    sunday_match_layout: bool
    session: SessionOut | None

    @classmethod
    def from_view(cls, v: TodayView) -> TodayOut:
        sess = None
        if v.session is not None:
            s = v.session
            sess = SessionOut(
                id=s.id,
                session_date=s.session_date,
                timezone=s.timezone,
                phase=s.phase,
                default_match_duration_seconds=s.default_match_duration_seconds,
                default_max_goals_per_team=s.default_max_goals_per_team,
                reference_start_time=s.reference_start_time,
                team_count=s.team_count,
                players_per_team=s.players_per_team,
                fixed_goalkeepers_enabled=s.fixed_goalkeepers_enabled,
                fixed_goalkeeper_player_id_1=s.fixed_goalkeeper_player_id_1,
                fixed_goalkeeper_player_id_2=s.fixed_goalkeeper_player_id_2,
                teams=[TeamOut(slot=t.slot, player_ids=list(t.player_ids)) for t in s.teams],
                fixtures=[
                    FixtureOut(
                        id=f.id,
                        order_index=f.order_index,
                        home_team_slot=f.home_team_slot,
                        away_team_slot=f.away_team_slot,
                        status=f.status,
                        started_at=f.started_at,
                        ended_at=f.ended_at,
                        home_goals=f.home_goals,
                        away_goals=f.away_goals,
                        duration_seconds=f.duration_seconds,
                        max_goals_per_team=f.max_goals_per_team,
                    )
                    for f in s.fixtures
                ],
            )
        return cls(server_now=v.server_now, sunday_match_layout=v.sunday_match_layout, session=sess)


class TodaySettingsPatchBody(BaseModel):
    default_match_duration_seconds: int | None = None
    default_max_goals_per_team: int | None = None
    team_count: int | None = None
    players_per_team: int | None = None
    fixed_goalkeepers_enabled: bool | None = None
    fixed_goalkeeper_player_id_1: str | None = None
    fixed_goalkeeper_player_id_2: str | None = None
    phase: str | None = None


class MatchEventCreateBody(BaseModel):
    type: Literal["goal", "goalkeeper_save"]
    team_slot: int = Field(..., ge=1)
    player_id: str | None = None
    elapsed_seconds: int | None = None


class MatchEventOut(BaseModel):
    id: str
    fixture_id: str
    type: str
    player_id: str | None
    team_slot: int
    recorded_at: datetime
    elapsed_seconds: int | None
