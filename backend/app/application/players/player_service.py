from app.domain.player import Player
from app.ports.player_repository import PlayerRepository


class PlayerService:
    """Application service: list players use case."""

    def __init__(self, repository: PlayerRepository) -> None:
        self._repository = repository

    def list_players(self, *, active_only: bool = True) -> list[Player]:
        return self._repository.list_players(active_only=active_only)
