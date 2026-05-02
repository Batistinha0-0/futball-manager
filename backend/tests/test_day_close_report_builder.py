from datetime import date, datetime, timezone
from uuid import uuid4

from app.domain.matchday.day_close_report import DayCloseReportBuilder
from app.domain.matchday.entities import MatchDayFixture, MatchDaySession, MatchEvent
from app.domain.matchday.enums import MatchDayPhase, MatchEventType, MatchFixtureStatus


def _session(sid: str) -> MatchDaySession:
    now = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    return MatchDaySession(
        id=sid,
        session_date=date(2026, 5, 1),
        timezone="America/Sao_Paulo",
        phase=MatchDayPhase.LIVE,
        default_match_duration_seconds=420,
        default_max_goals_per_team=2,
        reference_start_time=None,
        team_count=2,
        players_per_team=5,
        fixed_goalkeepers_enabled=False,
        fixed_goalkeeper_player_id_1=None,
        fixed_goalkeeper_player_id_2=None,
        created_at=now,
        updated_at=now,
    )


def test_builder_pending_and_live_snapshots_and_player_stats() -> None:
    sid = str(uuid4())
    s = _session(sid)
    close_time = datetime(2026, 5, 1, 15, 0, tzinfo=timezone.utc)
    f1 = str(uuid4())
    f2 = str(uuid4())
    p1 = str(uuid4())
    p2 = str(uuid4())
    fixtures = [
        MatchDayFixture(
            id=f1,
            session_id=sid,
            order_index=0,
            home_team_slot=1,
            away_team_slot=2,
            status=MatchFixtureStatus.LIVE,
            started_at=datetime(2026, 5, 1, 14, 0, tzinfo=timezone.utc),
            ended_at=None,
            home_goals=1,
            away_goals=0,
            duration_seconds=420,
            max_goals_per_team=2,
        ),
        MatchDayFixture(
            id=f2,
            session_id=sid,
            order_index=1,
            home_team_slot=1,
            away_team_slot=2,
            status=MatchFixtureStatus.PENDING,
            started_at=None,
            ended_at=None,
            home_goals=0,
            away_goals=0,
            duration_seconds=420,
            max_goals_per_team=2,
        ),
    ]
    events = {
        f1: [
            MatchEvent(
                id=str(uuid4()),
                fixture_id=f1,
                type=MatchEventType.GOAL,
                player_id=p1,
                team_slot=1,
                recorded_at=datetime(2026, 5, 1, 14, 5, tzinfo=timezone.utc),
                elapsed_seconds=60,
            ),
            MatchEvent(
                id=str(uuid4()),
                fixture_id=f1,
                type=MatchEventType.ASSIST,
                player_id=p2,
                team_slot=1,
                recorded_at=datetime(2026, 5, 1, 14, 5, tzinfo=timezone.utc),
                elapsed_seconds=60,
            ),
            MatchEvent(
                id=str(uuid4()),
                fixture_id=f1,
                type=MatchEventType.GOALKEEPER_SAVE,
                player_id=p1,
                team_slot=2,
                recorded_at=datetime(2026, 5, 1, 14, 10, tzinfo=timezone.utc),
                elapsed_seconds=120,
            ),
            MatchEvent(
                id=str(uuid4()),
                fixture_id=f1,
                type=MatchEventType.YELLOW_CARD,
                player_id=p2,
                team_slot=1,
                recorded_at=datetime(2026, 5, 1, 14, 11, tzinfo=timezone.utc),
                elapsed_seconds=121,
            ),
            MatchEvent(
                id=str(uuid4()),
                fixture_id=f1,
                type=MatchEventType.RED_CARD,
                player_id=p2,
                team_slot=1,
                recorded_at=datetime(2026, 5, 1, 14, 12, tzinfo=timezone.utc),
                elapsed_seconds=122,
            ),
        ],
        f2: [],
    }
    report = DayCloseReportBuilder.build(
        session=s,
        fixtures=fixtures,
        events_by_fixture_id=events,
        close_time=close_time,
    )
    assert len(report.fixtures) == 2
    snap0, snap1 = report.fixtures
    assert snap0.not_contested is False
    assert snap0.home_goals == 1 and snap0.away_goals == 0
    assert snap0.ended_at == close_time
    assert snap1.not_contested is True
    assert snap1.home_goals == 0 and snap1.away_goals == 0
    assert snap1.started_at is None

    by_pid = {r.player_id: r for r in report.player_stats}
    assert by_pid[p1].goals == 1
    assert by_pid[p1].goalkeeper_saves == 1
    assert by_pid[p1].fixtures_played == 1
    assert by_pid[p2].assists == 1
    assert by_pid[p2].yellow_cards == 1
    assert by_pid[p2].red_cards == 1
    assert by_pid[p2].fixtures_played == 1

    d = report.to_json_dict()
    assert d["session_id"] == sid
    assert len(d["fixtures"]) == 2
    assert len(d["players"]) == 2
    fx0_events = d["fixtures"][0]["events"]
    assert len(fx0_events) == 5
    assert fx0_events[0]["type"] == "goal"
    assert fx0_events[0]["elapsed_seconds"] == 60
    assert d["fixtures"][1]["events"] == []
