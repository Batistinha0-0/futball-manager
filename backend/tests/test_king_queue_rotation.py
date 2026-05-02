"""Regras da fila de times (vencedor fica, empate por sequência de vitórias)."""

from app.domain.matchday.king_queue import (
    initial_king_queue_state,
    king_state_from_json,
    king_state_to_json,
    rotate_after_submatch,
)


def test_initial_queue_four_teams() -> None:
    s = initial_king_queue_state(4)
    assert s.queue == (3, 4)
    assert dict(s.win_streak) == {1: 0, 2: 0, 3: 0, 4: 0}


def test_win_home_loser_to_end_next_challenger() -> None:
    s0 = initial_king_queue_state(4)
    h, a, s1 = rotate_after_submatch(
        home_slot=1,
        away_slot=2,
        home_goals=2,
        away_goals=0,
        state=s0,
        team_count=4,
    )
    assert h == 1 and a == 3
    assert s1.queue == (4, 2)
    assert dict(s1.win_streak)[1] == 1
    assert dict(s1.win_streak)[2] == 0


def test_draw_higher_streak_leaves() -> None:
    s0 = initial_king_queue_state(4)
    st = dict(s0.win_streak)
    st[2] = 4
    st[3] = 0
    from app.domain.matchday.king_queue import KingQueueState

    state = KingQueueState(queue=(4,), win_streak=tuple(sorted(st.items())))
    h, a, s1 = rotate_after_submatch(
        home_slot=2,
        away_slot=3,
        home_goals=1,
        away_goals=1,
        state=state,
        team_count=4,
    )
    assert h == 3 and a == 4
    assert 2 in s1.queue
    assert dict(s1.win_streak)[2] == 0
    assert dict(s1.win_streak)[3] == 0


def test_draw_equal_streak_lower_slot_stays() -> None:
    s0 = initial_king_queue_state(3)
    h, a, s1 = rotate_after_submatch(
        home_slot=1,
        away_slot=2,
        home_goals=0,
        away_goals=0,
        state=s0,
        team_count=3,
    )
    assert h == 1 and a == 3
    assert s1.queue == (2,)


def test_sanitized_queue_drops_team_on_field_so_no_self_match() -> None:
    """Estado corrompido: o time 2 na fila enquanto disputa 2×1 — não pode sair 2×2."""
    from app.domain.matchday.king_queue import KingQueueState

    bad = KingQueueState(queue=(2, 3, 4), win_streak=((1, 0), (2, 0), (3, 0), (4, 0)))
    h, a, s1 = rotate_after_submatch(
        home_slot=2,
        away_slot=1,
        home_goals=2,
        away_goals=0,
        state=bad,
        team_count=4,
    )
    assert h != a
    assert h == 2 and a == 3


def test_challenger_skips_heads_equal_to_winner() -> None:
    """Se a cabeça da fila repetir o vencedor, avança até achar outro slot."""
    from app.domain.matchday.king_queue import KingQueueState

    bad = KingQueueState(queue=(2, 2, 3), win_streak=((1, 0), (2, 0), (3, 0)))
    h, a, _ = rotate_after_submatch(
        home_slot=2,
        away_slot=1,
        home_goals=1,
        away_goals=0,
        state=bad,
        team_count=3,
    )
    assert h == 2 and a == 3


def test_json_roundtrip() -> None:
    s0 = initial_king_queue_state(5)
    raw = king_state_to_json(s0)
    s1 = king_state_from_json(raw)
    assert s1 is not None
    assert s1.queue == s0.queue
    assert s1.win_streak == s0.win_streak
