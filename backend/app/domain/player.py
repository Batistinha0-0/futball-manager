from dataclasses import dataclass
from enum import Enum


class PlayerProfile(str, Enum):
    ATTACK = "attack"
    DEFENSE = "defense"
    MIXED = "mixed"


@dataclass(frozen=True, slots=True)
class Player:
    """Core player aggregate fields used by the application layer."""

    id: str
    display_name: str
    skill_stars: float
    profile: PlayerProfile
    position: str | None = None
    active: bool = True
