"""Orquestração do sorteio: participação → aleatório → balancear habilidade → perfil."""

from __future__ import annotations

import random

from app.domain.exceptions import ValidationError
from app.domain.player import Player

from .fixed_goalkeeper_rule import FixedGoalkeeperParticipationRule
from .initial_random_partitioner import InitialRandomPartitioner
from .profile_balance_optimizer import ProfileClusterBalanceOptimizer
from .skill_balance_optimizer import SkillTierBalanceOptimizer


class TeamDrawApplicationService:
    def __init__(
        self,
        *,
        rng: random.Random | None = None,
        gk_rule: FixedGoalkeeperParticipationRule | None = None,
        partitioner: InitialRandomPartitioner | None = None,
        skill_optimizer: SkillTierBalanceOptimizer | None = None,
        profile_optimizer: ProfileClusterBalanceOptimizer | None = None,
    ) -> None:
        self._rng = rng or random.Random()
        self._gk_rule = gk_rule or FixedGoalkeeperParticipationRule()
        self._partitioner = partitioner or InitialRandomPartitioner()
        self._skill = skill_optimizer or SkillTierBalanceOptimizer()
        self._profile = profile_optimizer or ProfileClusterBalanceOptimizer()

    def assign_teams(
        self,
        *,
        players: list[Player],
        team_count: int,
        players_per_team: int,
        fixed_goalkeepers_enabled: bool,
        fixed_goalkeeper_player_id_1: str | None,
        fixed_goalkeeper_player_id_2: str | None,
        rng: random.Random | None = None,
    ) -> list[tuple[int, tuple[str, ...]]]:
        if team_count < 2 or team_count > 12:
            raise ValidationError("match_day_bad_team_count", "Número de times deve estar entre 2 e 12.")
        if players_per_team < 1 or players_per_team > 20:
            raise ValidationError("match_day_bad_roster_size", "Jogadores por time deve estar entre 1 e 20.")

        participation = self._gk_rule.build_pool(
            players=players,
            fixed_goalkeepers_enabled=fixed_goalkeepers_enabled,
            fixed_goalkeeper_player_id_1=fixed_goalkeeper_player_id_1,
            fixed_goalkeeper_player_id_2=fixed_goalkeeper_player_id_2,
        )
        pool = list(participation.pool)
        need = team_count * players_per_team
        if len(pool) < need:
            raise ValidationError(
                "match_day_not_enough_players",
                f"São necessários pelo menos {need} jogadores ativos no sorteio (times × jogadores por time).",
            )

        use_rng = rng if rng is not None else self._rng
        by_id = {p.id: p for p in players}
        buckets = self._partitioner.partition(
            pool, team_count=team_count, players_per_team=players_per_team, rng=use_rng
        )
        buckets = self._skill.refine(buckets, by_id, use_rng)
        buckets = self._profile.refine(buckets, by_id, use_rng)
        return [(slot + 1, tuple(buckets[slot])) for slot in range(team_count)]
