"""HTTP DTOs for the players roster API (transport layer only)."""

from pydantic import BaseModel, Field

from app.domain.player import Player, PlayerProfile


class PlayerResponse(BaseModel):
    id: str
    display_name: str
    skill_stars: float | None
    profile: PlayerProfile
    position: str | None
    active: bool

    model_config = {"from_attributes": True}

    @classmethod
    def from_domain(cls, player: Player) -> "PlayerResponse":
        return cls(
            id=player.id,
            display_name=player.display_name,
            skill_stars=player.skill_stars,
            profile=player.profile,
            position=player.position,
            active=player.active,
        )


class PlayerCreateBody(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)
    skill_stars: float | None = Field(default=None, ge=0, le=5)
    profile: PlayerProfile
    position: str | None = Field(default=None, max_length=64)
    active: bool = True


class PlayerUpdateBody(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    skill_stars: float | None = Field(default=None, ge=0, le=5)
    profile: PlayerProfile | None = None
    position: str | None = Field(default=None, max_length=64)
    active: bool | None = None
