"""Faixas de habilidade para balanceamento (nível opcional)."""

from __future__ import annotations

from enum import Enum


class SkillTier(str, Enum):
    UNKNOWN = "unknown"
    LOW = "low"
    MID = "mid"
    HIGH = "high"


def classify_skill_tier(skill_stars: float | None) -> SkillTier:
    """Low < 2,5; Mid [2,5 ; 4); High >= 4 (passos de 0,5 na prática)."""
    if skill_stars is None:
        return SkillTier.UNKNOWN
    if skill_stars < 2.5:
        return SkillTier.LOW
    if skill_stars < 4.0:
        return SkillTier.MID
    return SkillTier.HIGH
