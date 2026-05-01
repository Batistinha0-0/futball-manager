"""Troca jogadores entre equipas para equilibrar faixas de habilidade."""

from __future__ import annotations

import random

from app.domain.player import Player

from .skill_tier import SkillTier, classify_skill_tier


def _skill_cost(buckets: list[list[str]], by_id: dict[str, Player]) -> float:
    tiers = (SkillTier.LOW, SkillTier.MID, SkillTier.HIGH)
    n = len(buckets)
    if n == 0:
        return 0.0
    total = 0.0
    for tier in tiers:
        counts = [
            sum(1 for pid in team if classify_skill_tier(by_id[pid].skill_stars) == tier) for team in buckets
        ]
        if sum(counts) == 0:
            continue
        mean = sum(counts) / n
        total += sum((c - mean) ** 2 for c in counts)
    return total


class SkillTierBalanceOptimizer:
    """Hill-climbing por swaps entre equipas (só melhora custo de habilidade)."""

    def __init__(self, *, max_passes: int = 100) -> None:
        self._max_passes = max_passes

    def refine(self, buckets: list[list[str]], by_id: dict[str, Player], rng: random.Random) -> list[list[str]]:
        b = [list(t) for t in buckets]
        best = _skill_cost(b, by_id)
        passes = 0
        while passes < self._max_passes:
            passes += 1
            improved = False
            order_i = list(range(len(b)))
            order_j = list(range(len(b)))
            rng.shuffle(order_i)
            for i in order_i:
                rng.shuffle(order_j)
                for j in order_j:
                    if i >= j:
                        continue
                    for ii in range(len(b[i])):
                        for jj in range(len(b[j])):
                            b[i][ii], b[j][jj] = b[j][jj], b[i][ii]
                            c = _skill_cost(b, by_id)
                            if c < best - 1e-12:
                                best = c
                                improved = True
                            else:
                                b[i][ii], b[j][jj] = b[j][jj], b[i][ii]
            if not improved:
                break
        return b
