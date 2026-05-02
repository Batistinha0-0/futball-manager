import random
import uuid
from datetime import datetime, timezone

import pytest

from app.application.matchday.balanced_team_draw import round_robin_pairs
from app.application.matchday.team_draw import TeamDrawApplicationService
from app.application.matchday.team_draw.skill_tier import SkillTier, classify_skill_tier
from app.domain.exceptions import ValidationError
from app.domain.player import Player, PlayerProfile


def _p(
    pid: str,
    stars: float | None,
    profile: PlayerProfile,
    position: str | None = "MC",
) -> Player:
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


def _assign(**kwargs: object) -> list[tuple[int, tuple[str, ...]]]:
    return TeamDrawApplicationService(rng=random.Random(0)).assign_teams(**kwargs)


def test_round_robin_pairs_three_teams() -> None:
    assert round_robin_pairs(3) == [(1, 2), (1, 3), (2, 3)]


def test_skill_tier_classification() -> None:
    assert classify_skill_tier(None) is SkillTier.UNKNOWN
    assert classify_skill_tier(2.0) is SkillTier.LOW
    assert classify_skill_tier(2.5) is SkillTier.MID
    assert classify_skill_tier(3.5) is SkillTier.MID
    assert classify_skill_tier(4.0) is SkillTier.HIGH


def test_assign_expected_sizes_no_fixed() -> None:
    players = [
        _p(str(uuid.uuid4()), 5.0, PlayerProfile.MIXED),
        _p(str(uuid.uuid4()), 4.0, PlayerProfile.MIXED),
        _p(str(uuid.uuid4()), 3.0, PlayerProfile.MIXED),
        _p(str(uuid.uuid4()), 2.0, PlayerProfile.MIXED),
    ]
    out = _assign(
        players=players,
        team_count=2,
        players_per_team=2,
        fixed_goalkeepers_enabled=False,
        fixed_goalkeeper_player_id_1=None,
        fixed_goalkeeper_player_id_2=None,
    )
    assert len(out) == 2
    assert len(out[0][1]) == 2 and len(out[1][1]) == 2


def test_fixed_one_gk_participates_in_draw() -> None:
    """Um só GR fixo: permanece no pool e pode ir para qualquer time."""
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
    out = _assign(
        players=players,
        team_count=2,
        players_per_team=2,
        fixed_goalkeepers_enabled=True,
        fixed_goalkeeper_player_id_1=g1,
        fixed_goalkeeper_player_id_2=None,
    )
    all_ids = {pid for _, ids in out for pid in ids}
    assert all_ids == {g1, p2, p3, p4}
    assert len(all_ids) == 4


def test_two_fixed_goalkeepers_excluded_from_teams() -> None:
    g1 = str(uuid.uuid4())
    g2 = str(uuid.uuid4())
    mc = [str(uuid.uuid4()) for _ in range(4)]
    players = [
        _p(g1, 5.0, PlayerProfile.DEFENSE, "GL"),
        _p(g2, 4.0, PlayerProfile.DEFENSE, "GL"),
        *[_p(pid, 3.0, PlayerProfile.MIXED, "MC") for pid in mc],
    ]
    out = _assign(
        players=players,
        team_count=2,
        players_per_team=2,
        fixed_goalkeepers_enabled=True,
        fixed_goalkeeper_player_id_1=g1,
        fixed_goalkeeper_player_id_2=g2,
    )
    all_ids = {pid for _, ids in out for pid in ids}
    assert g1 not in all_ids and g2 not in all_ids
    assert all_ids == set(mc)


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
        _assign(
            players=players,
            team_count=2,
            players_per_team=2,
            fixed_goalkeepers_enabled=True,
            fixed_goalkeeper_player_id_1=g1,
            fixed_goalkeeper_player_id_2=g2,
        )


def test_three_teams_one_fixed_gk_in_pool() -> None:
    g1 = str(uuid.uuid4())
    rest = [str(uuid.uuid4()) for _ in range(5)]
    players = [_p(g1, 5.0, PlayerProfile.DEFENSE, "GL")]
    players += [_p(pid, 3.5, PlayerProfile.MIXED, "MC") for pid in rest]
    out = _assign(
        players=players,
        team_count=3,
        players_per_team=2,
        fixed_goalkeepers_enabled=True,
        fixed_goalkeeper_player_id_1=g1,
        fixed_goalkeeper_player_id_2=None,
    )
    all_ids = {pid for _, ids in out for pid in ids}
    assert len(all_ids) == 6
    assert g1 in all_ids
    for slot, ids in out:
        assert len(ids) == 2, slot


def test_fixed_goalkeepers_requires_at_least_one_when_enabled() -> None:
    players = [
        _p(str(uuid.uuid4()), 5.0, PlayerProfile.DEFENSE, "GL"),
        _p(str(uuid.uuid4()), 4.0, PlayerProfile.MIXED, "MC"),
        _p(str(uuid.uuid4()), 3.0, PlayerProfile.MIXED, "MC"),
        _p(str(uuid.uuid4()), 2.0, PlayerProfile.MIXED, "MC"),
    ]
    with pytest.raises(ValidationError):
        _assign(
            players=players,
            team_count=2,
            players_per_team=2,
            fixed_goalkeepers_enabled=True,
            fixed_goalkeeper_player_id_1=None,
            fixed_goalkeeper_player_id_2=None,
        )


def test_draw_with_null_skill_stars() -> None:
    players = [
        _p(str(uuid.uuid4()), None, PlayerProfile.MIXED),
        _p(str(uuid.uuid4()), None, PlayerProfile.MIXED),
        _p(str(uuid.uuid4()), 4.0, PlayerProfile.MIXED),
        _p(str(uuid.uuid4()), 2.0, PlayerProfile.MIXED),
    ]
    out = _assign(
        players=players,
        team_count=2,
        players_per_team=2,
        fixed_goalkeepers_enabled=False,
        fixed_goalkeeper_player_id_1=None,
        fixed_goalkeeper_player_id_2=None,
    )
    assert len(out) == 2
