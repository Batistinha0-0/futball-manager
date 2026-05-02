"""Reduz concentração de perfis attack/defense no mesmo time (mixed é neutro)."""

from __future__ import annotations

import random

from app.domain.player import Player, PlayerProfile


def _profile_cost(buckets: list[list[str]], by_id: dict[str, Player]) -> float:
    cost = 0.0
    for team in buckets:
        atk = sum(1 for pid in team if by_id[pid].profile is PlayerProfile.ATTACK)
        dfn = sum(1 for pid in team if by_id[pid].profile is PlayerProfile.DEFENSE)
        cost += max(0, atk - 2) ** 2 + max(0, dfn - 2) ** 2
    return cost


class ProfileClusterBalanceOptimizer:
    def __init__(self, *, max_passes: int = 100) -> None:
        self._max_passes = max_passes

    def refine(self, buckets: list[list[str]], by_id: dict[str, Player], rng: random.Random) -> list[list[str]]:
        b = [list(t) for t in buckets]
        best = _profile_cost(b, by_id)
        passes = 0
        while passes < self._max_passes:
            passes += 1
            improved = False
            order_i = list(range(len(b)))
            rng.shuffle(order_i)
            for i in order_i:
                order_j = list(range(len(b)))
                rng.shuffle(order_j)
                for j in order_j:
                    if i >= j:
                        continue
                    for ii in range(len(b[i])):
                        for jj in range(len(b[j])):
                            b[i][ii], b[j][jj] = b[j][jj], b[i][ii]
                            c = _profile_cost(b, by_id)
                            if c < best - 1e-12:
                                best = c
                                improved = True
                            else:
                                b[i][ii], b[j][jj] = b[j][jj], b[i][ii]
            if not improved:
                break
        return b
