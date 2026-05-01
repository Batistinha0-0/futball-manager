"""Utilitários de confrontos (round-robin) e fixtures da sessão."""

from __future__ import annotations

import uuid

from app.domain.matchday.entities import MatchDayFixture
from app.domain.matchday.enums import MatchFixtureStatus


def snake_pick_order(team_count: int, total_picks: int) -> list[int]:
    """Índices de equipa 0..team_count-1 em ordem snake (uma vaga por pick)."""
    out: list[int] = []
    for pick in range(total_picks):
        row = pick // team_count
        col = pick % team_count
        if row % 2 == 0:
            out.append(col)
        else:
            out.append(team_count - 1 - col)
    return out


def round_robin_pairs(team_count: int) -> list[tuple[int, int]]:
    """Pares (casa, fora) com slots 1..team_count; (1,2) é o primeiro jogo (ordem lex)."""
    if team_count < 2:
        return []
    pairs: list[tuple[int, int]] = []
    for i in range(1, team_count + 1):
        for j in range(i + 1, team_count + 1):
            pairs.append((i, j))
    return pairs


def build_fixtures_for_session(
    *,
    session_id: str,
    team_count: int,
    duration_seconds: int,
    max_goals_per_team: int,
) -> list[MatchDayFixture]:
    pairs = round_robin_pairs(team_count)
    out: list[MatchDayFixture] = []
    for idx, (home, away) in enumerate(pairs):
        out.append(
            MatchDayFixture(
                id=str(uuid.uuid4()),
                session_id=session_id,
                order_index=idx,
                home_team_slot=home,
                away_team_slot=away,
                status=MatchFixtureStatus.PENDING,
                started_at=None,
                ended_at=None,
                home_goals=0,
                away_goals=0,
                duration_seconds=duration_seconds,
                max_goals_per_team=max_goals_per_team,
            )
        )
    return out
