import uuid
from datetime import datetime, timezone
from typing import Any

from app.domain.exceptions import ValidationError
from app.domain.player import Player, PlayerProfile
from app.domain.user import User
from app.ports.player_repository import PlayerRepository


class PlayerService:
    """Application service: player roster (list + CRUD)."""

    def __init__(self, repository: PlayerRepository) -> None:
        self._repository = repository

    def list_players(self, *, active_only: bool = True) -> list[Player]:
        return self._repository.list_players(active_only=active_only)

    def create_player(
        self,
        *,
        actor: User,
        display_name: str,
        skill_stars: float | None,
        profile: PlayerProfile,
        position: str | None = None,
        active: bool = True,
    ) -> Player:
        name = display_name.strip()
        if not name:
            raise ValidationError("invalid_display_name", "display_name is required.")
        if skill_stars is not None:
            self._validate_skill_stars(skill_stars)
        pos = self._normalize_position(position)
        now = datetime.now(timezone.utc)
        pid = str(uuid.uuid4())
        player = Player(
            id=pid,
            display_name=name,
            skill_stars=skill_stars,
            profile=profile,
            position=pos,
            active=active,
            created_by_user_id=actor.id,
            created_at=now,
            updated_at=now,
        )
        return self._repository.create(player)

    def update_player_patch(self, *, player_id: str, patch: dict[str, Any]) -> Player:
        existing = self._repository.get_by_id(player_id)
        if existing is None:
            raise ValidationError("player_not_found", "Player not found.")

        new_name = existing.display_name
        if "display_name" in patch:
            name = str(patch["display_name"]).strip()
            if not name:
                raise ValidationError("invalid_display_name", "display_name cannot be empty.")
            new_name = name

        new_stars = existing.skill_stars
        if "skill_stars" in patch:
            raw = patch["skill_stars"]
            if raw is None:
                new_stars = None
            else:
                new_stars = float(raw)
                self._validate_skill_stars(new_stars)

        new_profile = existing.profile
        if "profile" in patch:
            raw = patch["profile"]
            new_profile = raw if isinstance(raw, PlayerProfile) else PlayerProfile(str(raw))

        new_active = existing.active
        if "active" in patch:
            new_active = bool(patch["active"])

        new_position = existing.position
        if "position" in patch:
            new_position = self._normalize_position(
                None if patch["position"] is None else str(patch["position"])
            )

        now = datetime.now(timezone.utc)
        updated = Player(
            id=existing.id,
            display_name=new_name,
            skill_stars=new_stars,
            profile=new_profile,
            position=new_position,
            active=new_active,
            created_by_user_id=existing.created_by_user_id,
            created_at=existing.created_at,
            updated_at=now,
        )
        self._repository.update(updated)
        return updated

    def delete_player(self, *, player_id: str) -> None:
        if not self._repository.delete(player_id):
            raise ValidationError("player_not_found", "Player not found.")

    @staticmethod
    def _validate_skill_stars(value: float) -> None:
        if value < 0 or value > 5:
            raise ValidationError("invalid_skill_stars", "skill_stars must be between 0 and 5 (or null to omit).")

    @staticmethod
    def _normalize_position(position: str | None) -> str | None:
        if position is None:
            return None
        p = position.strip()
        return p or None
