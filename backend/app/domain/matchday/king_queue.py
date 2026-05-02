"""Fila de times (vencedor fica, perdedor/saída do empate vai ao fim da fila)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class KingQueueState:
    """Estado serializado em `MatchDaySession.king_state_json` quando team_count > 2."""

    queue: tuple[int, ...]
    win_streak: tuple[tuple[int, int], ...]

    def streak_map(self) -> dict[int, int]:
        return dict(self.win_streak)


def initial_king_queue_state(team_count: int) -> KingQueueState:
    if team_count < 3:
        raise ValueError("king queue requires at least 3 teams")
    q = tuple(range(3, team_count + 1))
    streaks = tuple((s, 0) for s in range(1, team_count + 1))
    return KingQueueState(queue=q, win_streak=streaks)


def king_state_to_json(state: KingQueueState) -> str:
    payload: dict[str, Any] = {
        "queue": list(state.queue),
        "win_streak": {str(k): v for k, v in state.win_streak},
    }
    return json.dumps(payload, separators=(",", ":"))


def king_state_from_json(raw: str | None) -> KingQueueState | None:
    if not raw or not raw.strip():
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    q = data.get("queue")
    ws = data.get("win_streak")
    if not isinstance(q, list) or not all(isinstance(x, int) and x >= 1 for x in q):
        return None
    if not isinstance(ws, dict):
        return None
    streak_pairs: list[tuple[int, int]] = []
    for k, v in ws.items():
        try:
            slot = int(k)
            wins = int(v)
        except (TypeError, ValueError):
            return None
        if slot < 1 or wins < 0:
            return None
        streak_pairs.append((slot, wins))
    streak_pairs.sort(key=lambda x: x[0])
    return KingQueueState(queue=tuple(int(x) for x in q), win_streak=tuple(streak_pairs))


def _merge_streak(
    base: dict[int, int],
    team_count: int,
) -> dict[int, int]:
    out = dict(base)
    for s in range(1, team_count + 1):
        out.setdefault(s, 0)
    return out


def _sanitized_waiting_queue(
    raw_queue: tuple[int, ...] | list[int],
    *,
    home_slot: int,
    away_slot: int,
    team_count: int,
) -> list[int]:
    """Fila de espera: slots válidos; nunca inclui quem já está em campo (invariante da quadra).

    Se o estado persistido estiver inconsistente (ex.: um time na fila enquanto joga),
    removemos para evitar confronto inválido (mandante vs o mesmo slot).
    """
    playing = {home_slot, away_slot}
    seen: set[int] = set()
    out: list[int] = []
    for x in raw_queue:
        if not isinstance(x, int) or not (1 <= x <= team_count):
            continue
        if x in playing or x in seen:
            continue
        seen.add(x)
        out.append(x)
    return out


def _pop_next_challenger(waiting: list[int], *, mandante: int) -> int:
    """Primeiro da fila diferente do mandante (quem permanece em campo após a sub-partida)."""
    while waiting:
        c = waiting.pop(0)
        if c != mandante:
            return c
    raise ValueError("king_queue_no_valid_challenger")


def rotate_after_submatch(
    *,
    home_slot: int,
    away_slot: int,
    home_goals: int,
    away_goals: int,
    state: KingQueueState,
    team_count: int,
) -> tuple[int, int, KingQueueState]:
    """Retorna (next_home, next_away, novo_estado) após encerrar uma sub-partida.

    Regras:
    - Vitória: perdedor vai ao fim da fila; vencedor fica como mandante; próximo da fila entra.
    - Empate: quem tem MAIOR sequência de vitórias sai; empate na sequência → fica o de menor slot.
    - Após empate, zera vitórias consecutivas dos dois que disputaram.
    - Após vitória, vencedor +1, perdedor 0.
    """
    if team_count < 3:
        raise ValueError("rotate_after_submatch requires team_count >= 3")
    if home_slot == away_slot:
        raise ValueError("rotate_after_submatch requires distinct home and away slots")

    st = _merge_streak(state.streak_map(), team_count)
    q = _sanitized_waiting_queue(
        state.queue,
        home_slot=home_slot,
        away_slot=away_slot,
        team_count=team_count,
    )

    if home_goals > away_goals:
        winner, loser = home_slot, away_slot
        q.append(loser)
        challenger = _pop_next_challenger(q, mandante=winner)
        new_st = {**st, winner: st.get(winner, 0) + 1, loser: 0}
        next_home, next_away = winner, challenger
    elif away_goals > home_goals:
        winner, loser = away_slot, home_slot
        q.append(loser)
        challenger = _pop_next_challenger(q, mandante=winner)
        new_st = {**st, winner: st.get(winner, 0) + 1, loser: 0}
        next_home, next_away = winner, challenger
    else:
        st_h = st.get(home_slot, 0)
        st_a = st.get(away_slot, 0)
        if st_h > st_a:
            leaver, stayer = home_slot, away_slot
        elif st_a > st_h:
            leaver, stayer = away_slot, home_slot
        else:
            if home_slot < away_slot:
                stayer, leaver = home_slot, away_slot
            else:
                stayer, leaver = away_slot, home_slot
        new_st = {**st, home_slot: 0, away_slot: 0}
        q.append(leaver)
        challenger = _pop_next_challenger(q, mandante=stayer)
        next_home, next_away = stayer, challenger

    if next_home == next_away:
        raise ValueError("king_queue_next_fixture_same_team")

    streak_tuples = tuple(sorted(((s, int(new_st.get(s, 0))) for s in range(1, team_count + 1)), key=lambda x: x[0]))
    return next_home, next_away, KingQueueState(queue=tuple(q), win_streak=streak_tuples)
