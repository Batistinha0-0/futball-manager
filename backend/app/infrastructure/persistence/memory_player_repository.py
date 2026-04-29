from app.domain.player import Player, PlayerProfile
from app.ports.player_repository import PlayerRepository


class MemoryPlayerRepository:
    """In-memory implementation until a real database is added."""

    def __init__(self) -> None:
        self._players: list[Player] = []

    def seed(self, players: list[Player]) -> None:
        self._players = list(players)

    def list_players(self, *, active_only: bool = True) -> list[Player]:
        items = self._players
        if active_only:
            items = [p for p in items if p.active]
        return list(items)


def create_default_memory_repository() -> MemoryPlayerRepository:
    """Factory with empty roster (stub for wire-up)."""
    return MemoryPlayerRepository()
