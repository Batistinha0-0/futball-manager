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


def test_create_update_delete_player() -> None:
    from app.domain.user import User, UserRole

    repo = MemoryPlayerRepository()
    service = PlayerService(repository=repo)
    actor = User(id="00000000-0000-4000-8000-000000000001", user_name="a", phone="1", role=UserRole.ORGANIZER)
    p = service.create_player(
        actor=actor,
        display_name="  Nome ",
        skill_stars=3.0,
        profile=PlayerProfile.ATTACK,
        position="ATA",
    )
    assert p.display_name == "Nome"
    assert p.created_by_user_id == actor.id

    updated = service.update_player_patch(player_id=p.id, patch={"skill_stars": 5.0, "active": False})
    assert updated.skill_stars == 5.0
    assert updated.active is False

    service.delete_player(player_id=p.id)
    assert repo.get_by_id(p.id) is None
