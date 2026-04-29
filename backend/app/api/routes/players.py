from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_player_service
from app.application.players.player_service import PlayerService
from app.domain.player import Player, PlayerProfile

router = APIRouter()


class PlayerResponse(BaseModel):
    id: str
    display_name: str
    skill_stars: float
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


@router.get("/players", response_model=list[PlayerResponse])
def list_players(
    active_only: bool = True,
    service: PlayerService = Depends(get_player_service),
) -> list[PlayerResponse]:
    players = service.list_players(active_only=active_only)
    return [PlayerResponse.from_domain(p) for p in players]
