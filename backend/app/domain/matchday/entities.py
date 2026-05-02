from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time

from app.domain.matchday.enums import MatchDayPhase, MatchEventType, MatchFixtureStatus


@dataclass(frozen=True, slots=True)
class MatchDaySession:
    id: str
    session_date: date
    timezone: str
    phase: MatchDayPhase
    default_match_duration_seconds: int
    default_max_goals_per_team: int
    reference_start_time: time | None
    team_count: int
    players_per_team: int
    fixed_goalkeepers_enabled: bool
    fixed_goalkeeper_player_id_1: str | None
    fixed_goalkeeper_player_id_2: str | None
    created_at: datetime
    updated_at: datetime
    draft_teams_json: str | None = None
    lineup_committed_at: datetime | None = None
    draw_signatures_json: str | None = None
    king_state_json: str | None = None
    closed_at: datetime | None = None
    day_summary_json: str | None = None
    # Após sorteio: False até apito na Início (ou iniciar partida); libera UI da aba Partida.
    partida_board_unlocked: bool = False


@dataclass(frozen=True, slots=True)
class PlayerMatchDayStat:
    """Agregado persistido por sessão/jogador (espelha `player_match_day_stats`)."""

    player_id: str
    goals: int
    assists: int
    goalkeeper_saves: int
    yellow_cards: int
    red_cards: int
    fixtures_played: int


@dataclass(frozen=True, slots=True)
class MatchDayTeam:
    session_id: str
    slot: int
    player_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class MatchDayFixture:
    id: str
    session_id: str
    order_index: int
    home_team_slot: int
    away_team_slot: int
    status: MatchFixtureStatus
    started_at: datetime | None
    ended_at: datetime | None
    home_goals: int
    away_goals: int
    duration_seconds: int
    max_goals_per_team: int


@dataclass(frozen=True, slots=True)
class MatchEvent:
    id: str
    fixture_id: str
    type: MatchEventType
    player_id: str | None
    team_slot: int
    recorded_at: datetime
    elapsed_seconds: int | None
