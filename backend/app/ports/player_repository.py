from typing import Protocol

from app.domain.player import Player


class PlayerRepository(Protocol):
    """Persistence port for players (Dependency Inversion)."""

    def list_players(self, *, active_only: bool = True) -> list[Player]:
        """Return players from the backing store."""
        ...

    def get_by_id(self, player_id: str) -> Player | None:
        """Return a player by id, or ``None`` if missing."""
        ...

    def create(self, player: Player) -> Player:
        """Persist a new player (``player.id`` may be ignored by the store)."""
        ...

    def update(self, player: Player) -> None:
        """Replace fields for an existing player (same ``id``)."""
        ...

    def delete(self, player_id: str) -> bool:
        """Remove a player; return ``True`` if a row was deleted."""
        ...
