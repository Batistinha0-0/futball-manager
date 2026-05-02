import uuid
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_auth_service, get_writable_db
from app.application.auth.auth_service import AuthService
from app.domain.user import User, UserAuthRecord, UserRole
from app.infrastructure.security.bcrypt_password_hasher import BcryptPasswordHasher
from app.infrastructure.security.pyjwt_access_token_service import PyJwtAccessTokenService
from app.main import app
from tests.test_auth_service import StubRefreshTokenRepository, StubUserRepository


@pytest.fixture
def client() -> TestClient:
    hasher = BcryptPasswordHasher()
    uid = str(uuid.uuid4())
    user = User(id=uid, user_name="matchdayuser", phone="+5511888888888", role=UserRole.ORGANIZER)
    record = UserAuthRecord(user=user, password_hash=hasher.hash("secret99"))
    stub = StubRefreshTokenRepository()
    svc = AuthService(
        users=StubUserRepository(record),
        passwords=hasher,
        tokens=PyJwtAccessTokenService(
            secret="z" * 64,
            algorithm="HS256",
            expires_minutes=60,
        ),
        refresh_tokens=stub,
        refresh_pepper="matchday-http-test-pepper",
        refresh_expires_days=7,
    )
    app.dependency_overrides[get_auth_service] = lambda: svc
    app.dependency_overrides[get_writable_db] = lambda: MagicMock()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(get_auth_service, None)
    app.dependency_overrides.pop(get_writable_db, None)


def _login(c: TestClient) -> None:
    r = c.post("/api/v1/auth/login", json={"user_name": "matchdayuser", "password": "secret99"})
    assert r.status_code == 200


def _create_player(c: TestClient, name: str, stars: float, position: str = "MC") -> str:
    r = c.post(
        "/api/v1/players",
        json={
            "display_name": name,
            "skill_stars": stars,
            "profile": "mixed",
            "position": position,
            "active": True,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_match_day_patch_creates_session(client: TestClient) -> None:
    _login(client)
    r = client.get("/api/v1/match-day/today")
    assert r.json()["session"] is None
    p = client.patch(
        "/api/v1/match-day/today/settings",
        json={"team_count": 2, "players_per_team": 1, "default_match_duration_seconds": 420},
    )
    assert p.status_code == 200, p.text
    s = p.json()["session"]
    assert s is not None
    assert s["team_count"] == 2
    assert s["players_per_team"] == 1
    assert s["teams"] == []
    assert s["fixtures"] == []


def test_match_day_draw_start_goal_finish_flow(client: TestClient) -> None:
    _login(client)
    _create_player(client, "A", 5.0)
    _create_player(client, "B", 3.0)

    today = client.get("/api/v1/match-day/today")
    assert today.status_code == 200
    assert today.json()["session"] is None

    init = client.patch(
        "/api/v1/match-day/today/settings",
        json={
            "team_count": 2,
            "players_per_team": 1,
            "default_match_duration_seconds": 420,
            "default_max_goals_per_team": 2,
        },
    )
    assert init.status_code == 200, init.text
    assert init.json()["session"]["teams"] == []

    draw = client.post("/api/v1/match-day/today/draw")
    assert draw.status_code == 200, draw.text
    d = draw.json()
    assert d["session"] is not None
    assert len(d["session"]["teams"]) == 2
    assert len(d["session"]["fixtures"]) == 1
    fx = d["session"]["fixtures"][0]
    assert fx["order_index"] == 0
    assert fx["home_team_slot"] == 1
    assert fx["away_team_slot"] == 2
    assert fx["status"] == "pending"
    fid = fx["id"]

    patch = client.patch(
        "/api/v1/match-day/today/settings",
        json={"default_match_duration_seconds": 300, "default_max_goals_per_team": 2},
    )
    assert patch.status_code == 200
    assert patch.json()["session"]["fixtures"][0]["duration_seconds"] == 300

    assert d["session"]["lineup_official"] is False
    assert d["session"]["partida_board_unlocked"] is False

    start = client.post(f"/api/v1/match-day/today/fixtures/{fid}/start")
    assert start.status_code == 200
    assert start.json()["session"]["lineup_official"] is True
    assert start.json()["session"]["phase"] == "live"
    assert start.json()["session"]["fixtures"][0]["status"] == "live"
    assert start.json()["session"]["partida_board_unlocked"] is True

    ev = client.post(
        f"/api/v1/match-day/today/fixtures/{fid}/events",
        json={"type": "goal", "team_slot": 1, "elapsed_seconds": 12},
    )
    assert ev.status_code == 200
    assert ev.json()["session"]["fixtures"][0]["home_goals"] == 1

    ev2 = client.post(
        f"/api/v1/match-day/today/fixtures/{fid}/events",
        json={"type": "goalkeeper_save", "team_slot": 2},
    )
    assert ev2.status_code == 200

    slot1_pid = next(t["player_ids"][0] for t in d["session"]["teams"] if t["slot"] == 1)
    ev3 = client.post(
        f"/api/v1/match-day/today/fixtures/{fid}/events",
        json={"type": "yellow_card", "team_slot": 1, "player_id": slot1_pid},
    )
    assert ev3.status_code == 200
    assert ev3.json()["session"]["fixtures"][0]["home_goals"] == 1

    listed = client.get(f"/api/v1/match-day/today/fixtures/{fid}/events")
    assert listed.status_code == 200
    types = {e["type"] for e in listed.json()}
    assert types == {"goal", "goalkeeper_save", "yellow_card"}
    assert len(listed.json()) == 3

    finish = client.post(f"/api/v1/match-day/today/fixtures/{fid}/finish")
    assert finish.status_code == 200
    assert finish.json()["session"]["fixtures"][0]["status"] == "finished"
    assert finish.json()["session"]["fixtures"][0]["ended_at"] is not None


def test_match_day_draw_requires_enough_players(client: TestClient) -> None:
    _login(client)
    _create_player(client, "Solo", 4.0)
    client.patch(
        "/api/v1/match-day/today/settings",
        json={"team_count": 2, "players_per_team": 1},
    )
    draw = client.post("/api/v1/match-day/today/draw")
    assert draw.status_code == 400


def test_match_day_fixed_goalkeepers_two_teams(client: TestClient) -> None:
    _login(client)
    g1 = _create_player(client, "GR1", 3.0, "GL")
    g2 = _create_player(client, "GR2", 2.5, "GL")
    for name in ("C", "D", "E", "F"):
        _create_player(client, name, 3.0, "MC")
    client.patch(
        "/api/v1/match-day/today/settings",
        json={
            "team_count": 2,
            "players_per_team": 2,
            "fixed_goalkeepers_enabled": True,
            "fixed_goalkeeper_player_id_1": g1,
            "fixed_goalkeeper_player_id_2": g2,
        },
    )
    dr = client.post("/api/v1/match-day/today/draw")
    assert dr.status_code == 200, dr.text
    teams = dr.json()["session"]["teams"]
    on_field = {pid for t in teams for pid in t["player_ids"]}
    assert g1 not in on_field and g2 not in on_field
    assert len(on_field) == 4


def test_match_day_fixed_goalkeepers_three_teams_gol_a(client: TestClient) -> None:
    _login(client)
    g1 = _create_player(client, "GR1", 3.0, "GL")
    for name in ("C", "D", "E", "F", "G"):
        _create_player(client, name, 3.0, "MC")
    client.patch(
        "/api/v1/match-day/today/settings",
        json={
            "team_count": 3,
            "players_per_team": 2,
            "fixed_goalkeepers_enabled": True,
            "fixed_goalkeeper_player_id_1": g1,
            "fixed_goalkeeper_player_id_2": None,
        },
    )
    dr = client.post("/api/v1/match-day/today/draw")
    assert dr.status_code == 200, dr.text
    sess = dr.json()["session"]
    teams = sess["teams"]
    by_slot = {t["slot"]: t["player_ids"] for t in teams}
    on_field = {pid for t in teams for pid in t["player_ids"]}
    assert g1 in on_field
    assert len(by_slot[1]) == len(by_slot[2]) == len(by_slot[3]) == 2
    assert len(sess["fixtures"]) == 1
    kq = sess.get("king_queue")
    assert kq is not None
    assert kq["queue"] == [3]
    assert kq["win_streak"]["1"] == 0


def test_match_day_consecutive_draws_differ_from_previous(client: TestClient) -> None:
    _login(client)
    for i in range(10):
        _create_player(client, f"D{i}", 2.5 + (i % 4) * 0.4)
    client.patch(
        "/api/v1/match-day/today/settings",
        json={"team_count": 2, "players_per_team": 4, "default_match_duration_seconds": 420},
    )
    prev_key: str | None = None
    for _ in range(12):
        r = client.post("/api/v1/match-day/today/draw")
        assert r.status_code == 200, r.text
        teams = r.json()["session"]["teams"]
        key = "|".join(
            ",".join(sorted(t["player_ids"]))
            for t in sorted(teams, key=lambda x: int(x["slot"]))
        )
        if prev_key is not None:
            assert key != prev_key
        prev_key = key


def test_match_day_redraw_keeps_fixture_id_and_lineup_stays_provisional(client: TestClient) -> None:
    _login(client)
    _create_player(client, "A", 5.0)
    _create_player(client, "B", 3.0)
    client.patch(
        "/api/v1/match-day/today/settings",
        json={"team_count": 2, "players_per_team": 1, "default_match_duration_seconds": 420},
    )
    d1 = client.post("/api/v1/match-day/today/draw").json()
    fid1 = d1["session"]["fixtures"][0]["id"]
    assert d1["session"]["lineup_official"] is False
    d2 = client.post("/api/v1/match-day/today/draw").json()
    fid2 = d2["session"]["fixtures"][0]["id"]
    assert fid1 == fid2
    assert d2["session"]["lineup_official"] is False
    assert len(d2["session"]["teams"]) == 2


def test_match_day_fixed_goalkeeper_single_gol_a(client: TestClient) -> None:
    _login(client)
    g1 = _create_player(client, "GR1", 3.0, "GL")
    _create_player(client, "C", 4.0, "MC")
    _create_player(client, "D", 3.5, "MC")
    _create_player(client, "E", 3.0, "MC")
    client.patch(
        "/api/v1/match-day/today/settings",
        json={
            "team_count": 2,
            "players_per_team": 2,
            "fixed_goalkeepers_enabled": True,
            "fixed_goalkeeper_player_id_1": g1,
            "fixed_goalkeeper_player_id_2": None,
        },
    )
    dr = client.post("/api/v1/match-day/today/draw")
    assert dr.status_code == 200, dr.text
    teams = dr.json()["session"]["teams"]
    by_slot = {t["slot"]: t["player_ids"] for t in teams}
    on_field = {pid for t in teams for pid in t["player_ids"]}
    assert g1 in on_field
    assert len(by_slot[1]) == len(by_slot[2]) == 2


def test_king_mode_assist_after_goal_cap_finishes_submatch(client: TestClient) -> None:
    """Último golo encerra o subjogo (fixture finished); o cliente ainda envia assist no mesmo fixture_id."""
    _login(client)
    _create_player(client, "K1", 4.0)
    _create_player(client, "K2", 3.5)
    _create_player(client, "K3", 3.0)
    client.patch(
        "/api/v1/match-day/today/settings",
        json={
            "team_count": 3,
            "players_per_team": 1,
            "default_match_duration_seconds": 420,
            "default_max_goals_per_team": 2,
        },
    )
    dr = client.post("/api/v1/match-day/today/draw")
    assert dr.status_code == 200, dr.text
    fx0 = dr.json()["session"]["fixtures"][0]
    fid = fx0["id"]
    home_slot = int(fx0["home_team_slot"])
    away_slot = int(fx0["away_team_slot"])
    assert client.post(f"/api/v1/match-day/today/fixtures/{fid}/start").status_code == 200

    assert (
        client.post(
            f"/api/v1/match-day/today/fixtures/{fid}/events",
            json={"type": "goal", "team_slot": home_slot, "elapsed_seconds": 1},
        ).status_code
        == 200
    )
    g2 = client.post(
        f"/api/v1/match-day/today/fixtures/{fid}/events",
        json={"type": "goal", "team_slot": home_slot, "elapsed_seconds": 2},
    )
    assert g2.status_code == 200, g2.text
    fixtures = g2.json()["session"]["fixtures"]
    first = next(f for f in fixtures if f["id"] == fid)
    assert first["status"] == "finished"

    assist_pid = next(
        t["player_ids"][0] for t in g2.json()["session"]["teams"] if int(t["slot"]) == home_slot
    )
    asst = client.post(
        f"/api/v1/match-day/today/fixtures/{fid}/events",
        json={
            "type": "assist",
            "team_slot": home_slot,
            "player_id": assist_pid,
            "elapsed_seconds": 2,
        },
    )
    assert asst.status_code == 200, asst.text

    goal_after = client.post(
        f"/api/v1/match-day/today/fixtures/{fid}/events",
        json={"type": "goal", "team_slot": home_slot, "elapsed_seconds": 3},
    )
    assert goal_after.status_code == 400


def test_draw_again_after_all_fixtures_finished_two_teams(client: TestClient) -> None:
    """Rodada concluída (2 times): novo sorteio deve funcionar ao voltar para o mesmo dia."""
    _login(client)
    _create_player(client, "R1", 4.0)
    _create_player(client, "R2", 3.5)
    client.patch(
        "/api/v1/match-day/today/settings",
        json={"team_count": 2, "players_per_team": 1, "default_match_duration_seconds": 420},
    )
    dr = client.post("/api/v1/match-day/today/draw")
    assert dr.status_code == 200, dr.text
    fid = dr.json()["session"]["fixtures"][0]["id"]
    assert client.post(f"/api/v1/match-day/today/fixtures/{fid}/start").status_code == 200
    assert client.post(f"/api/v1/match-day/today/fixtures/{fid}/finish").status_code == 200
    today = client.get("/api/v1/match-day/today").json()
    assert today["session"]["fixtures"][0]["status"] == "finished"
    assert today["session"]["lineup_official"] is True

    again = client.post("/api/v1/match-day/today/draw")
    assert again.status_code == 200, again.text
    sess = again.json()["session"]
    assert sess["lineup_official"] is False
    assert len(sess["fixtures"]) == 1
    assert sess["fixtures"][0]["status"] == "pending"
    assert sess["partida_board_unlocked"] is False


def test_unlock_partida_board_after_draw(client: TestClient) -> None:
    _login(client)
    _create_player(client, "U1", 4.0)
    _create_player(client, "U2", 3.5)
    client.patch(
        "/api/v1/match-day/today/settings",
        json={"team_count": 2, "players_per_team": 1, "default_match_duration_seconds": 420},
    )
    dr = client.post("/api/v1/match-day/today/draw")
    assert dr.status_code == 200, dr.text
    assert dr.json()["session"]["partida_board_unlocked"] is False
    u = client.post("/api/v1/match-day/today/unlock-partida-board")
    assert u.status_code == 200, u.text
    assert u.json()["session"]["partida_board_unlocked"] is True
    u2 = client.post("/api/v1/match-day/today/unlock-partida-board")
    assert u2.status_code == 200
    assert u2.json()["session"]["partida_board_unlocked"] is True
