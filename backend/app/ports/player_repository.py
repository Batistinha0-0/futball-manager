from typing import Protocol

from app.domain.player import Player


class PlayerRepository(Protocol):
    """Persistence port for players (Dependency Inversion)."""

    def list_players(self, *, active_only: bool = True) -> list[Player]:
        """Return players from the backing store."""
        ...
