import uuid
from datetime import datetime, timezone

import pytest

from app.application.matchday.balanced_team_draw import TeamDrawBalancer, round_robin_pairs
from app.domain.exceptions import ValidationError
from app.domain.player import Player, PlayerProfile


def _p(pid: str, stars: float, profile: PlayerProfile, position: str | None = "MC") -> Player:
    return Player(
        id=pid,
        display_name=pid,
        skill_stars=stars,
        profile=profile,
        position=position,
        active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def test_round_robin_pairs_three_teams() -> None:
    assert round_robin_pairs(3) == [(1, 2), (1, 3), (2, 3)]


def test_snake_assigns_expected_sizes() -> None:
    players = [
        _p(str(uuid.uuid4()), 5.0, PlayerProfile.MIXED),
        _p(str(uuid.uuid4()), 4.0, PlayerProfile.MIXED),
        _p(str(uuid.uuid4()), 3.0, PlayerProfile.MIXED),
        _p(str(uuid.uuid4()), 2.0, PlayerProfile.MIXED),
    ]
    out = TeamDrawBalancer.assign_teams(
        players=players,
        team_count=2,
        players_per_team=2,
        fixed_goalkeepers_enabled=False,
        fixed_goalkeeper_player_id_1=None,
        fixed_goalkeeper_player_id_2=None,
    )
    assert len(out) == 2
    assert len(out[0][1]) == 2 and len(out[1][1]) == 2


def test_fixed_goalkeepers_only_one_goal() -> None:
    """Um só GR fixo no gol A; o gol B entra no sorteio normal (revezamento no jogo, não modelado)."""
    g1 = str(uuid.uuid4())
    p2 = str(uuid.uuid4())
    p3 = str(uuid.uuid4())
    p4 = str(uuid.uuid4())
    players = [
        _p(g1, 5.0, PlayerProfile.DEFENSE, "GL"),
        _p(p2, 4.0, PlayerProfile.MIXED, "MC"),
        _p(p3, 3.0, PlayerProfile.MIXED, "MC"),
        _p(p4, 2.0, PlayerProfile.MIXED, "MC"),
    ]
    out = TeamDrawBalancer.assign_teams(
        players=players,
        team_count=2,
        players_per_team=2,
        fixed_goalkeepers_enabled=True,
        fixed_goalkeeper_player_id_1=g1,
        fixed_goalkeeper_player_id_2=None,
    )
    slots = {slot: set(ids) for slot, ids in out}
    assert g1 in slots[1]
    assert g1 not in slots[2]
    assert len(slots[2]) == 2


def test_fixed_goalkeepers_pin() -> None:
    g1 = str(uuid.uuid4())
    g2 = str(uuid.uuid4())
    p3 = str(uuid.uuid4())
    p4 = str(uuid.uuid4())
    players = [
        _p(g1, 5.0, PlayerProfile.DEFENSE, "GL"),
        _p(g2, 4.0, PlayerProfile.DEFENSE, "GL"),
        _p(p3, 3.0, PlayerProfile.MIXED, "MC"),
        _p(p4, 2.0, PlayerProfile.MIXED, "MC"),
    ]
    out = TeamDrawBalancer.assign_teams(
        players=players,
        team_count=2,
        players_per_team=2,
        fixed_goalkeepers_enabled=True,
        fixed_goalkeeper_player_id_1=g1,
        fixed_goalkeeper_player_id_2=g2,
    )
    slots = {slot: set(ids) for slot, ids in out}
    assert g1 in slots[1]
    assert g2 in slots[2]


def test_fixed_gk_requires_gl_position() -> None:
    g1 = str(uuid.uuid4())
    g2 = str(uuid.uuid4())
    players = [
        _p(g1, 5.0, PlayerProfile.MIXED, "MC"),
        _p(g2, 4.0, PlayerProfile.MIXED, "MC"),
        _p(str(uuid.uuid4()), 3.0, PlayerProfile.MIXED, "MC"),
        _p(str(uuid.uuid4()), 2.0, PlayerProfile.MIXED, "MC"),
    ]
    with pytest.raises(ValidationError):
        TeamDrawBalancer.assign_teams(
            players=players,
            team_count=2,
            players_per_team=2,
            fixed_goalkeepers_enabled=True,
            fixed_goalkeeper_player_id_1=g1,
            fixed_goalkeeper_player_id_2=g2,
        )


def test_fixed_goalkeepers_three_teams_pins_slot1_only() -> None:
    g1 = str(uuid.uuid4())
    rest = [str(uuid.uuid4()) for _ in range(5)]
    players = [_p(g1, 5.0, PlayerProfile.DEFENSE, "GL")]
    players += [_p(pid, 3.5, PlayerProfile.MIXED, "MC") for pid in rest]
    out = TeamDrawBalancer.assign_teams(
        players=players,
        team_count=3,
        players_per_team=2,
        fixed_goalkeepers_enabled=True,
        fixed_goalkeeper_player_id_1=g1,
        fixed_goalkeeper_player_id_2=None,
    )
    slots = {slot: set(ids) for slot, ids in out}
    assert g1 in slots[1]
    assert g1 not in slots[2] and g1 not in slots[3]
    for s in (1, 2, 3):
        assert len(slots[s]) == 2


def test_fixed_goalkeepers_requires_at_least_one_when_enabled() -> None:
    players = [
        _p(str(uuid.uuid4()), 5.0, PlayerProfile.DEFENSE, "GL"),
        _p(str(uuid.uuid4()), 4.0, PlayerProfile.MIXED, "MC"),
        _p(str(uuid.uuid4()), 3.0, PlayerProfile.MIXED, "MC"),
        _p(str(uuid.uuid4()), 2.0, PlayerProfile.MIXED, "MC"),
    ]
    with pytest.raises(ValidationError):
        TeamDrawBalancer.assign_teams(
            players=players,
            team_count=2,
            players_per_team=2,
            fixed_goalkeepers_enabled=True,
            fixed_goalkeeper_player_id_1=None,
            fixed_goalkeeper_player_id_2=None,
        )
