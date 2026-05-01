from dataclasses import dataclass
from datetime import datetime
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
    profile: PlayerProfile
    skill_stars: float | None = None
    position: str | None = None
    active: bool = True
    created_by_user_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
