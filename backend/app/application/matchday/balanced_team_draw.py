"""Sorteio equilibrado de equipas (snake por nível + perfil/posição leve)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.domain.exceptions import ValidationError
from app.domain.matchday.entities import MatchDayFixture
from app.domain.matchday.enums import MatchFixtureStatus
from app.domain.player import Player, PlayerProfile


def _profile_weight(p: Player) -> float:
    if p.profile is PlayerProfile.DEFENSE:
        return 1.0
    if p.profile is PlayerProfile.ATTACK:
        return -1.0
    return 0.0


def _position_weight(p: Player) -> float:
    pos = (p.position or "").strip().upper()
    if pos == "GL":
        return 2.0
    if pos in ("ZAG",):
        return 1.0
    if pos in ("ATA", "AL"):
        return -0.5
    return 0.0


def _sort_key_draw(p: Player) -> tuple:
    """Maior nível primeiro; depois equilíbrio defesa/ataque e função."""
    return (-p.skill_stars, _profile_weight(p), _position_weight(p), p.display_name.casefold())


def snake_pick_order(team_count: int, total_picks: int) -> list[int]:
    """Índices de equipa 0..team_count-1 em ordem snake (uma vaga por pick)."""
    out: list[int] = []
    for pick in range(total_picks):
        row = pick // team_count
        col = pick % team_count
        if row % 2 == 0:
            out.append(col)
        else:
            out.append(team_count - 1 - col)
    return out


def round_robin_pairs(team_count: int) -> list[tuple[int, int]]:
    """Pares (casa, fora) com slots 1..team_count; (1,2) é o primeiro jogo (ordem lex)."""
    if team_count < 2:
        return []
    pairs: list[tuple[int, int]] = []
    for i in range(1, team_count + 1):
        for j in range(i + 1, team_count + 1):
            pairs.append((i, j))
    return pairs


def build_fixtures_for_session(
    *,
    session_id: str,
    team_count: int,
    duration_seconds: int,
    max_goals_per_team: int,
) -> list[MatchDayFixture]:
    pairs = round_robin_pairs(team_count)
    out: list[MatchDayFixture] = []
    for idx, (home, away) in enumerate(pairs):
        out.append(
            MatchDayFixture(
                id=str(uuid.uuid4()),
                session_id=session_id,
                order_index=idx,
                home_team_slot=home,
                away_team_slot=away,
                status=MatchFixtureStatus.PENDING,
                started_at=None,
                ended_at=None,
                home_goals=0,
                away_goals=0,
                duration_seconds=duration_seconds,
                max_goals_per_team=max_goals_per_team,
            )
        )
    return out


class TeamDrawBalancer:
    """
    Monta listas por slot com snake e pinos opcionais de GR fixo (gol A = equipa 1, gol B = equipa 2).

    Com «goleiros fixos» ligado: até dois GR na base, nos slots de equipa 1 e 2 (válido com
    qualquer número de equipas ≥ 2). As equipas 3…N não têm pin por esta opção. Pode
    indicar-se só um goleiro: a outra «porta» (equipa 2 ou 1) entra no sorteio normal
    quanto ao GR; no jogo reveza-se quem defende se não houver pin.
    """

    @staticmethod
    def assign_teams(
        *,
        players: list[Player],
        team_count: int,
        players_per_team: int,
        fixed_goalkeepers_enabled: bool,
        fixed_goalkeeper_player_id_1: str | None,
        fixed_goalkeeper_player_id_2: str | None,
    ) -> list[tuple[int, tuple[str, ...]]]:
        if team_count < 2 or team_count > 12:
            raise ValidationError("match_day_bad_team_count", "Número de equipas deve estar entre 2 e 12.")
        if players_per_team < 1 or players_per_team > 20:
            raise ValidationError("match_day_bad_roster_size", "Jogadores por equipa deve estar entre 1 e 20.")
        need = team_count * players_per_team
        if len(players) < need:
            raise ValidationError(
                "match_day_not_enough_players",
                f"São necessários pelo menos {need} jogadores ativos (equipas × jogadores por equipa).",
            )

        by_id = {p.id: p for p in players}
        pinned: dict[int, str] = {}

        if fixed_goalkeepers_enabled:
            g1 = fixed_goalkeeper_player_id_1 or None
            g2 = fixed_goalkeeper_player_id_2 or None
            if not g1 and not g2:
                raise ValidationError(
                    "match_day_fixed_gk_missing",
                    "Indique pelo menos um goleiro fixo (gol A ou gol B), ou desligue goleiros fixos.",
                )
            if g1 and g2 and g1 == g2:
                raise ValidationError("match_day_fixed_gk_duplicate", "Os dois goleiros fixos devem ser diferentes.")
            for slot, gid in ((1, g1), (2, g2)):
                if not gid:
                    continue
                p = by_id.get(gid)
                if not p or not p.active:
                    raise ValidationError("match_day_fixed_gk_inactive", "Goleiro fixo deve ser jogador ativo.")
                if (p.position or "").strip().upper() != "GL":
                    raise ValidationError("match_day_fixed_gk_not_gl", "Goleiros fixos devem ter posição GL no elenco.")
                pinned[slot] = gid

        pool = [p for p in players if p.id not in pinned.values()]
        pool.sort(key=_sort_key_draw)
        roster_size = need - len(pinned)
        roster = pool[:roster_size]

        buckets: list[list[str]] = [[] for _ in range(team_count)]
        for slot, pid in pinned.items():
            buckets[slot - 1].append(pid)

        cap_remaining = [players_per_team - len(buckets[t]) for t in range(team_count)]
        total_picks = sum(cap_remaining)
        if total_picks != len(roster):
            raise ValidationError("match_day_draw_split", "Inconsistência ao distribuir o elenco após goleiros fixos.")
        order = snake_pick_order(team_count, total_picks)
        for k in range(total_picks):
            buckets[order[k]].append(roster[k].id)

        for t in range(team_count):
            if len(buckets[t]) != players_per_team:
                raise ValidationError("match_day_draw_split", "Não foi possível preencher todas as equipas.")

        return [(slot + 1, tuple(buckets[slot])) for slot in range(team_count)]
