"""Quem entra no pool do sorteio consoante goleiros fixos (gol A / gol B)."""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.exceptions import ValidationError
from app.domain.player import Player


@dataclass(frozen=True, slots=True)
class DrawParticipation:
    """Elenco que entra no sorteio e ids excluídos (dois GR fixos fora dos times)."""

    pool: tuple[Player, ...]
    excluded_ids: frozenset[str]


class FixedGoalkeeperParticipationRule:
    """Dois ids fixos e ativos com GL → excluídos do pool; um só id → todos no pool; modo off → todos."""

    def build_pool(
        self,
        *,
        players: list[Player],
        fixed_goalkeepers_enabled: bool,
        fixed_goalkeeper_player_id_1: str | None,
        fixed_goalkeeper_player_id_2: str | None,
    ) -> DrawParticipation:
        if not fixed_goalkeepers_enabled:
            return DrawParticipation(pool=tuple(players), excluded_ids=frozenset())

        g1 = (fixed_goalkeeper_player_id_1 or "").strip() or None
        g2 = (fixed_goalkeeper_player_id_2 or "").strip() or None
        if not g1 and not g2:
            raise ValidationError(
                "match_day_fixed_gk_missing",
                "Indique pelo menos um goleiro fixo (gol A ou gol B), ou desligue goleiros fixos.",
            )

        by_id = {p.id: p for p in players}

        def _assert_fixed_gl(pid: str) -> None:
            p = by_id.get(pid)
            if not p or not p.active:
                raise ValidationError("match_day_fixed_gk_inactive", "Goleiro fixo deve ser jogador ativo.")
            if (p.position or "").strip().upper() != "GL":
                raise ValidationError("match_day_fixed_gk_not_gl", "Goleiros fixos devem ter posição GL no elenco.")

        if g1:
            _assert_fixed_gl(g1)
        if g2:
            _assert_fixed_gl(g2)

        if g1 and g2:
            if g1 == g2:
                raise ValidationError("match_day_fixed_gk_duplicate", "Os dois goleiros fixos devem ser diferentes.")
            excluded = frozenset({g1, g2})
            pool = tuple(p for p in players if p.id not in excluded)
            return DrawParticipation(pool=pool, excluded_ids=excluded)

        return DrawParticipation(pool=tuple(players), excluded_ids=frozenset())
