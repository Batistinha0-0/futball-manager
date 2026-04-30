from app.domain.player import Player
from app.ports.player_repository import PlayerRepository


class MemoryPlayerRepository:
    """In-memory implementation until a real database is added."""

    def __init__(self) -> None:
        self._by_id: dict[str, Player] = {}

    def seed(self, players: list[Player]) -> None:
        self._by_id = {p.id: p for p in players}

    def list_players(self, *, active_only: bool = True) -> list[Player]:
        items = list(self._by_id.values())
        if active_only:
            items = [p for p in items if p.active]
        return sorted(items, key=lambda p: p.display_name.casefold())

    def get_by_id(self, player_id: str) -> Player | None:
        return self._by_id.get(player_id)

    def create(self, player: Player) -> Player:
        self._by_id[player.id] = player
        return player

    def update(self, player: Player) -> None:
        self._by_id[player.id] = player

    def delete(self, player_id: str) -> bool:
        return self._by_id.pop(player_id, None) is not None


def create_default_memory_repository() -> MemoryPlayerRepository:
    """Factory with empty roster (stub for wire-up)."""
    return MemoryPlayerRepository()
