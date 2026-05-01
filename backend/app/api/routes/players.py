from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.db_commit_scope import run_with_optional_commit
from app.api.deps import get_db, get_player_service, require_players_read, require_players_write
from app.api.routes.players_schemas import PlayerCreateBody, PlayerResponse, PlayerUpdateBody
from app.application.players.player_service import PlayerService
from app.domain.exceptions import ValidationError
from app.domain.player import Player
from app.domain.user import User

router = APIRouter()


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

        def _create() -> Player:
            return service.create_player(
                actor=actor,
                display_name=body.display_name,
                skill_stars=body.skill_stars,
                profile=body.profile,
                position=body.position,
                active=body.active,
            )

        player = run_with_optional_commit(db, _create)
    except ValidationError as exc:
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

        def _update() -> Player:
            return service.update_player_patch(player_id=str(player_id), patch=patch)

        player = run_with_optional_commit(db, _update)
    except ValidationError as exc:
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

        def _delete() -> None:
            service.delete_player(player_id=str(player_id))

        run_with_optional_commit(db, _delete)
    except ValidationError as exc:
        raise _http_for_player_validation(exc) from exc
