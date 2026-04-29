from app.application.players.player_service import PlayerService
from app.domain.player import Player, PlayerProfile
from app.infrastructure.persistence.memory_player_repository import MemoryPlayerRepository


def test_list_players_empty() -> None:
    repo = MemoryPlayerRepository()
    service = PlayerService(repository=repo)
    assert service.list_players() == []


def test_list_players_seeded() -> None:
    repo = MemoryPlayerRepository()
    repo.seed(
        [
            Player(
                id="p1",
                display_name="João",
                skill_stars=3.5,
                profile=PlayerProfile.MIXED,
            ),
        ]
    )
    service = PlayerService(repository=repo)
    players = service.list_players()
    assert len(players) == 1
    assert players[0].display_name == "João"
    assert players[0].skill_stars == 3.5


def test_list_players_active_filter() -> None:
    repo = MemoryPlayerRepository()
    repo.seed(
        [
            Player(
                id="p1",
                display_name="Active",
                skill_stars=2.0,
                profile=PlayerProfile.ATTACK,
                active=True,
            ),
            Player(
                id="p2",
                display_name="Inactive",
                skill_stars=2.0,
                profile=PlayerProfile.DEFENSE,
                active=False,
            ),
        ]
    )
    service = PlayerService(repository=repo)
    assert len(service.list_players(active_only=True)) == 1
    assert len(service.list_players(active_only=False)) == 2
