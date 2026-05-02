"""Partição inicial aleatória em N times com P jogadores cada."""

from __future__ import annotations

import random

from app.domain.exceptions import ValidationError
from app.domain.player import Player


class InitialRandomPartitioner:
    def partition(
        self,
        pool: list[Player],
        *,
        team_count: int,
        players_per_team: int,
        rng: random.Random,
    ) -> list[list[str]]:
        need = team_count * players_per_team
        if len(pool) < need:
            raise ValidationError(
                "match_day_not_enough_players",
                f"São necessários pelo menos {need} jogadores ativos no sorteio (times × jogadores por time).",
            )
        shuffled = list(pool)
        rng.shuffle(shuffled)
        roster = shuffled[:need]
        buckets: list[list[str]] = [[] for _ in range(team_count)]
        for idx, p in enumerate(roster):
            buckets[idx % team_count].append(p.id)
        for t in range(team_count):
            if len(buckets[t]) != players_per_team:
                raise ValidationError("match_day_draw_split", "Não foi possível preencher todos os times.")
        return buckets
