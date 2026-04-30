from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_player_service, require_players_read, require_players_write
from app.application.players.player_service import PlayerService
from app.domain.exceptions import ValidationError
from app.domain.player import Player, PlayerProfile
from app.domain.user import User

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


class PlayerCreateBody(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)
    skill_stars: float = Field(ge=0, le=5)
    profile: PlayerProfile
    position: str | None = Field(default=None, max_length=64)
    active: bool = True


class PlayerUpdateBody(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    skill_stars: float | None = Field(default=None, ge=0, le=5)
    profile: PlayerProfile | None = None
    position: str | None = Field(default=None, max_length=64)
    active: bool | None = None


def _http_for_player_validation(exc: ValidationError) -> HTTPException:
    code = exc.code
    if code in ("player_not_found",):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/players", response_model=list[PlayerResponse])
def list_players(
    _auth: Annotated[User, Depends(require_players_read)],
    service: Annotated[PlayerService, Depends(get_player_service)],
    active_only: bool = True,
) -> list[PlayerResponse]:
    players = service.list_players(active_only=active_only)
    return [PlayerResponse.from_domain(p) for p in players]


@router.post("/players", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
def create_player(
    body: PlayerCreateBody,
    actor: Annotated[User, Depends(require_players_write)],
    db: Annotated[Session | None, Depends(get_db)],
    service: Annotated[PlayerService, Depends(get_player_service)],
) -> PlayerResponse:
    try:
        player = service.create_player(
            actor=actor,
            display_name=body.display_name,
            skill_stars=body.skill_stars,
            profile=body.profile,
            position=body.position,
            active=body.active,
        )
        if db is not None:
            db.commit()
    except ValidationError as exc:
        if db is not None:
            db.rollback()
        raise _http_for_player_validation(exc) from exc
    return PlayerResponse.from_domain(player)


@router.patch("/players/{player_id}", response_model=PlayerResponse)
def update_player(
    player_id: UUID,
    body: PlayerUpdateBody,
    _: Annotated[User, Depends(require_players_write)],
    db: Annotated[Session | None, Depends(get_db)],
    service: Annotated[PlayerService, Depends(get_player_service)],
) -> PlayerResponse:
    patch: dict[str, Any] = body.model_dump(exclude_unset=True)
    if not patch:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one field must be provided.",
        )
    try:
        player = service.update_player_patch(player_id=str(player_id), patch=patch)
        if db is not None:
            db.commit()
    except ValidationError as exc:
        if db is not None:
            db.rollback()
        raise _http_for_player_validation(exc) from exc
    return PlayerResponse.from_domain(player)


@router.delete("/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player(
    player_id: UUID,
    _: Annotated[User, Depends(require_players_write)],
    db: Annotated[Session | None, Depends(get_db)],
    service: Annotated[PlayerService, Depends(get_player_service)],
) -> None:
    try:
        service.delete_player(player_id=str(player_id))
        if db is not None:
            db.commit()
    except ValidationError as exc:
        if db is not None:
            db.rollback()
        raise _http_for_player_validation(exc) from exc
