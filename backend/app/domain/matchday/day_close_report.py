"""Relatório de encerramento do dia: agregação pura a partir de sessão, fixtures e eventos."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.domain.matchday.entities import (
    MatchDayFixture,
    MatchDaySession,
    MatchEvent,
    PlayerMatchDayStat,
)
from app.domain.matchday.enums import MatchEventType, MatchFixtureStatus


@dataclass(frozen=True, slots=True)
class FixtureCloseSnapshot:
    fixture_id: str
    order_index: int
    home_team_slot: int
    away_team_slot: int
    home_goals: int
    away_goals: int
    status: str
    started_at: datetime | None
    ended_at: datetime
    not_contested: bool
    events: tuple[dict[str, Any], ...] = ()


@dataclass(frozen=True, slots=True)
class DayCloseReport:
    session_id: str
    session_date_iso: str
    fixtures: tuple[FixtureCloseSnapshot, ...]
    player_stats: tuple[PlayerMatchDayStat, ...]

    def to_json_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "session_date": self.session_date_iso,
            "fixtures": [
                {
                    "fixture_id": f.fixture_id,
                    "order_index": f.order_index,
                    "home_team_slot": f.home_team_slot,
                    "away_team_slot": f.away_team_slot,
                    "home_goals": f.home_goals,
                    "away_goals": f.away_goals,
                    "status": f.status,
                    "started_at": f.started_at.isoformat() if f.started_at else None,
                    "ended_at": f.ended_at.isoformat(),
                    "not_contested": f.not_contested,
                    "events": [dict(ev) for ev in f.events],
                }
                for f in self.fixtures
            ],
            "players": [
                {
                    "player_id": p.player_id,
                    "goals": p.goals,
                    "assists": p.assists,
                    "goalkeeper_saves": p.goalkeeper_saves,
                    "yellow_cards": p.yellow_cards,
                    "red_cards": p.red_cards,
                    "fixtures_played": p.fixtures_played,
                }
                for p in self.player_stats
            ],
        }


class DayCloseReportBuilder:
    """Monta o relatório final assumindo que fixtures abertas serão encerradas em `close_time`."""

    @staticmethod
    def _fixture_events_tuple(
        fixture_id: str,
        events_by_fixture_id: dict[str, list[MatchEvent]],
    ) -> tuple[dict[str, Any], ...]:
        evs = sorted(events_by_fixture_id.get(fixture_id, []), key=lambda e: e.recorded_at)
        return tuple(
            {
                "type": ev.type.value,
                "player_id": ev.player_id,
                "team_slot": ev.team_slot,
                "elapsed_seconds": ev.elapsed_seconds,
            }
            for ev in evs
        )

    @staticmethod
    def build(
        *,
        session: MatchDaySession,
        fixtures: list[MatchDayFixture],
        events_by_fixture_id: dict[str, list[MatchEvent]],
        close_time: datetime,
    ) -> DayCloseReport:
        ordered = sorted(fixtures, key=lambda f: f.order_index)
        snapshots: list[FixtureCloseSnapshot] = []
        for fx in ordered:
            ev_t = DayCloseReportBuilder._fixture_events_tuple(fx.id, events_by_fixture_id)
            if fx.status is MatchFixtureStatus.FINISHED:
                if fx.ended_at is None:
                    raise ValueError("fixture finished without ended_at")
                snapshots.append(
                    FixtureCloseSnapshot(
                        fixture_id=fx.id,
                        order_index=fx.order_index,
                        home_team_slot=fx.home_team_slot,
                        away_team_slot=fx.away_team_slot,
                        home_goals=fx.home_goals,
                        away_goals=fx.away_goals,
                        status=MatchFixtureStatus.FINISHED.value,
                        started_at=fx.started_at,
                        ended_at=fx.ended_at,
                        not_contested=False,
                        events=ev_t,
                    )
                )
            elif fx.status is MatchFixtureStatus.LIVE:
                snapshots.append(
                    FixtureCloseSnapshot(
                        fixture_id=fx.id,
                        order_index=fx.order_index,
                        home_team_slot=fx.home_team_slot,
                        away_team_slot=fx.away_team_slot,
                        home_goals=fx.home_goals,
                        away_goals=fx.away_goals,
                        status=MatchFixtureStatus.FINISHED.value,
                        started_at=fx.started_at,
                        ended_at=close_time,
                        not_contested=False,
                        events=ev_t,
                    )
                )
            elif fx.status is MatchFixtureStatus.PENDING:
                snapshots.append(
                    FixtureCloseSnapshot(
                        fixture_id=fx.id,
                        order_index=fx.order_index,
                        home_team_slot=fx.home_team_slot,
                        away_team_slot=fx.away_team_slot,
                        home_goals=0,
                        away_goals=0,
                        status=MatchFixtureStatus.FINISHED.value,
                        started_at=None,
                        ended_at=close_time,
                        not_contested=True,
                        events=ev_t,
                    )
                )
            else:
                raise ValueError(f"unknown fixture status: {fx.status}")

        player_stats = DayCloseReportBuilder._aggregate_player_stats(ordered, events_by_fixture_id)
        return DayCloseReport(
            session_id=session.id,
            session_date_iso=session.session_date.isoformat(),
            fixtures=tuple(snapshots),
            player_stats=tuple(player_stats),
        )

    @staticmethod
    def _aggregate_player_stats(
        fixtures: list[MatchDayFixture],
        events_by_fixture_id: dict[str, list[MatchEvent]],
    ) -> list[PlayerMatchDayStat]:
        goals: dict[str, int] = {}
        assists: dict[str, int] = {}
        saves: dict[str, int] = {}
        yellow: dict[str, int] = {}
        red: dict[str, int] = {}
        fixture_sets: dict[str, set[str]] = {}

        for fx in fixtures:
            evs = sorted(events_by_fixture_id.get(fx.id, []), key=lambda e: e.recorded_at)
            for ev in evs:
                pid = ev.player_id
                if not pid:
                    continue
                fixture_sets.setdefault(pid, set()).add(fx.id)
                if ev.type is MatchEventType.GOAL:
                    goals[pid] = goals.get(pid, 0) + 1
                elif ev.type is MatchEventType.ASSIST:
                    assists[pid] = assists.get(pid, 0) + 1
                elif ev.type is MatchEventType.GOALKEEPER_SAVE:
                    saves[pid] = saves.get(pid, 0) + 1
                elif ev.type is MatchEventType.YELLOW_CARD:
                    yellow[pid] = yellow.get(pid, 0) + 1
                elif ev.type is MatchEventType.RED_CARD:
                    red[pid] = red.get(pid, 0) + 1

        all_ids = set(goals) | set(assists) | set(saves) | set(yellow) | set(red) | set(fixture_sets)
        out: list[PlayerMatchDayStat] = []
        for pid in sorted(all_ids):
            out.append(
                PlayerMatchDayStat(
                    player_id=pid,
                    goals=goals.get(pid, 0),
                    assists=assists.get(pid, 0),
                    goalkeeper_saves=saves.get(pid, 0),
                    yellow_cards=yellow.get(pid, 0),
                    red_cards=red.get(pid, 0),
                    fixtures_played=len(fixture_sets.get(pid, set())),
                )
            )
        return out
