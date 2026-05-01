"""Casos de uso: sessão de domingo, sorteio e partida."""

from __future__ import annotations

import json
import logging
import random
import secrets
import uuid
from dataclasses import replace
from datetime import datetime, time, timezone
from typing import Any

from app.application.matchday.balanced_team_draw import build_fixtures_for_session
from app.application.matchday.match_day_draw_fingerprint import fingerprint_team_slots, load_last_draw_fingerprint
from app.application.matchday.match_day_views import FixtureView, SessionView, TeamView, TodayView
from app.application.matchday.team_draw import TeamDrawApplicationService
from app.core.config import Settings
from app.core.timezone_helpers import is_sunday_match_layout_active, now_in_app_tz, today_date_in_app_tz
from app.domain.exceptions import ValidationError
from app.domain.matchday.entities import (
    MatchDayFixture,
    MatchDaySession,
    MatchDayTeam,
    MatchEvent,
)
from app.domain.matchday.enums import MatchDayPhase, MatchEventType, MatchFixtureStatus
from app.ports.match_day_repository import MatchDayRepository
from app.ports.player_repository import PlayerRepository

_MAX_DRAW_ATTEMPTS = 500

_log = logging.getLogger("app.match_day")


class MatchDayService:
    def __init__(
        self,
        *,
        settings: Settings,
        match_days: MatchDayRepository,
        players: PlayerRepository,
        team_draw: TeamDrawApplicationService | None = None,
    ) -> None:
        self._settings = settings
        self._match_days = match_days
        self._players = players
        self._team_draw = team_draw or TeamDrawApplicationService()

    def get_today_view(self) -> TodayView:
        now = datetime.now(timezone.utc)
        layout = is_sunday_match_layout_active(self._settings, now_in_app_tz(self._settings))
        d = today_date_in_app_tz(self._settings)
        s = self._match_days.get_session_by_date(d)
        if not s:
            return TodayView(server_now=now, sunday_match_layout=layout, session=None)
        teams = self._teams_for_session_display(s)
        fixtures = self._match_days.list_fixtures(s.id)
        return TodayView(
            server_now=now,
            sunday_match_layout=layout,
            session=self._to_session_view(s, teams, fixtures),
        )

    def _to_session_view(
        self,
        s: MatchDaySession,
        teams: list[MatchDayTeam],
        fixtures: list[MatchDayFixture],
    ) -> SessionView:
        ref = s.reference_start_time.isoformat() if s.reference_start_time else None
        return SessionView(
            id=s.id,
            session_date=s.session_date.isoformat(),
            timezone=s.timezone,
            phase=s.phase.value,
            default_match_duration_seconds=s.default_match_duration_seconds,
            default_max_goals_per_team=s.default_max_goals_per_team,
            reference_start_time=ref,
            team_count=s.team_count,
            players_per_team=s.players_per_team,
            fixed_goalkeepers_enabled=s.fixed_goalkeepers_enabled,
            fixed_goalkeeper_player_id_1=s.fixed_goalkeeper_player_id_1,
            fixed_goalkeeper_player_id_2=s.fixed_goalkeeper_player_id_2,
            lineup_official=s.lineup_committed_at is not None,
            teams=tuple(TeamView(slot=t.slot, player_ids=t.player_ids) for t in sorted(teams, key=lambda x: x.slot)),
            fixtures=tuple(
                FixtureView(
                    id=f.id,
                    order_index=f.order_index,
                    home_team_slot=f.home_team_slot,
                    away_team_slot=f.away_team_slot,
                    status=f.status.value,
                    started_at=f.started_at,
                    ended_at=f.ended_at,
                    home_goals=f.home_goals,
                    away_goals=f.away_goals,
                    duration_seconds=f.duration_seconds,
                    max_goals_per_team=f.max_goals_per_team,
                )
                for f in fixtures
            ),
        )

    def _any_fixture_live(self, session_id: str) -> bool:
        return any(f.status is MatchFixtureStatus.LIVE for f in self._match_days.list_fixtures(session_id))

    def _parse_draft_teams(self, session_id: str, raw: str) -> list[MatchDayTeam]:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValidationError("match_day_bad_draft", "Rascunho de equipas inválido.") from exc
        if not isinstance(data, list):
            raise ValidationError("match_day_bad_draft", "Rascunho de equipas inválido.")
        out: list[MatchDayTeam] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            slot = int(item["slot"])
            raw_ids = item.get("player_ids", [])
            if not isinstance(raw_ids, list):
                raw_ids = []
            ids = tuple(str(x) for x in raw_ids)
            out.append(MatchDayTeam(session_id=session_id, slot=slot, player_ids=ids))
        return sorted(out, key=lambda t: t.slot)

    def _teams_for_session_display(self, s: MatchDaySession) -> list[MatchDayTeam]:
        if s.lineup_committed_at is not None:
            return self._match_days.list_teams(s.id)
        if s.draft_teams_json:
            return self._parse_draft_teams(s.id, s.draft_teams_json)
        return []

    def draw_today(self) -> TodayView:
        d = today_date_in_app_tz(self._settings)
        s = self._match_days.get_session_by_date(d)
        if not s:
            raise ValidationError(
                "match_day_no_session",
                "Guarde as configurações do dia antes de sortear.",
            )
        if s.lineup_committed_at is not None:
            raise ValidationError(
                "match_day_draw_locked",
                "A escalação do dia já foi confirmada ao iniciar uma partida; não é possível resortear.",
            )
        fxs = self._match_days.list_fixtures(s.id)
        if fxs and not all(f.status is MatchFixtureStatus.PENDING for f in fxs):
            raise ValidationError(
                "match_day_draw_blocked_progress",
                "Não é possível resortear com partidas já iniciadas ou concluídas.",
            )
        players = [p for p in self._players.list_players(active_only=True) if p.active]
        last_fp = load_last_draw_fingerprint(s.draw_signatures_json)
        hist_set = {last_fp} if last_fp else set()

        _log.info(
            "draw_today begin session_id=%s session_date=%s players_active=%s team_count=%s "
            "players_per_team=%s fixed_gk=%s previous_fp_prefix=%s lineup_committed=%s "
            "pending_fixtures=%s is_redraw=%s (só 1 assinatura na sessão, atualiza a cada sorteio; oficiais só ao apitar)",
            s.id,
            d.isoformat(),
            len(players),
            s.team_count,
            s.players_per_team,
            s.fixed_goalkeepers_enabled,
            last_fp[:16] if last_fp else "",
            s.lineup_committed_at is not None,
            len(fxs),
            bool(fxs),
        )

        slots: list[tuple[int, tuple[str, ...]]] | None = None
        fp_new: str | None = None
        attempt_used = 0
        collisions = 0
        for attempt in range(_MAX_DRAW_ATTEMPTS):
            seed = secrets.randbits(64) ^ (attempt * 0x9E3779B97F4A7C15)
            rng = random.Random(seed)
            cand = self._team_draw.assign_teams(
                players=players,
                team_count=s.team_count,
                players_per_team=s.players_per_team,
                fixed_goalkeepers_enabled=s.fixed_goalkeepers_enabled,
                fixed_goalkeeper_player_id_1=s.fixed_goalkeeper_player_id_1,
                fixed_goalkeeper_player_id_2=s.fixed_goalkeeper_player_id_2,
                rng=rng,
            )
            fp = fingerprint_team_slots(cand)
            if fp not in hist_set:
                slots = cand
                fp_new = fp
                attempt_used = attempt + 1
                break
            collisions += 1
            _log.debug(
                "draw_today collision session_id=%s attempt=%s fp_prefix=%s",
                s.id,
                attempt + 1,
                fp[:16],
            )
        if slots is None or fp_new is None:
            _log.warning(
                "draw_today exhausted session_id=%s attempts=%s collisions=%s previous_fp_prefix=%s",
                s.id,
                _MAX_DRAW_ATTEMPTS,
                collisions,
                last_fp[:16] if last_fp else "",
            )
            raise ValidationError(
                "match_day_draw_exhausted",
                "Não foi possível gerar um sorteio diferente do anterior. "
                "Altere o elenco ou as configurações (equipas / jogadores por equipa / GR fixos).",
            )

        sig_json = json.dumps(fp_new, separators=(",", ":"))

        team_objs = [MatchDayTeam(session_id=s.id, slot=slot, player_ids=ids) for slot, ids in slots]
        draft_json = json.dumps(
            [{"slot": t.slot, "player_ids": list(t.player_ids)} for t in team_objs],
            separators=(",", ":"),
        )
        now = datetime.now(timezone.utc)

        if not fxs:
            self._match_days.clear_teams_and_fixtures(s.id)
            fixtures = build_fixtures_for_session(
                session_id=s.id,
                team_count=s.team_count,
                duration_seconds=s.default_match_duration_seconds,
                max_goals_per_team=s.default_max_goals_per_team,
            )
            self._match_days.replace_fixtures(s.id, fixtures)
        else:
            self._match_days.replace_teams(s.id, [])

        self._match_days.save_session(
            replace(
                s,
                draft_teams_json=draft_json,
                draw_signatures_json=sig_json,
                phase=MatchDayPhase.PRE_MATCH,
                updated_at=now,
            )
        )
        _log.info(
            "draw_today ok session_id=%s attempts=%s collisions=%s fp_prefix=%s "
            "stored_single_fingerprint draft_bytes=%s replace_official_teams_empty=%s",
            s.id,
            attempt_used,
            collisions,
            fp_new[:16],
            len(draft_json),
            bool(fxs),
        )
        return self.get_today_view()

    def patch_today_settings(self, updates: dict[str, Any], *, phase: MatchDayPhase | None) -> TodayView:
        d = today_date_in_app_tz(self._settings)
        now = datetime.now(timezone.utc)
        s = self._match_days.get_session_by_date(d)
        keys = set(updates.keys())

        if s and self._any_fixture_live(s.id):
            blocked = keys & {
                "team_count",
                "players_per_team",
                "fixed_goalkeepers_enabled",
                "fixed_goalkeeper_player_id_1",
                "fixed_goalkeeper_player_id_2",
            }
            if blocked:
                raise ValidationError(
                    "match_day_settings_blocked_live",
                    "Com partida ao vivo só pode alterar duração/máx. golos/fase nas partidas em espera.",
                )

        if not s:
            dur = int(updates["default_match_duration_seconds"]) if "default_match_duration_seconds" in keys else 420
            mx = int(updates["default_max_goals_per_team"]) if "default_max_goals_per_team" in keys else 2
            tc = int(updates["team_count"]) if "team_count" in keys else 2
            ppt = int(updates["players_per_team"]) if "players_per_team" in keys else 5
            fge = bool(updates["fixed_goalkeepers_enabled"]) if "fixed_goalkeepers_enabled" in keys else False
            g1 = updates["fixed_goalkeeper_player_id_1"] if "fixed_goalkeeper_player_id_1" in keys else None
            g2 = updates["fixed_goalkeeper_player_id_2"] if "fixed_goalkeeper_player_id_2" in keys else None
        else:
            dur = (
                int(updates["default_match_duration_seconds"])
                if "default_match_duration_seconds" in keys
                else s.default_match_duration_seconds
            )
            mx = (
                int(updates["default_max_goals_per_team"])
                if "default_max_goals_per_team" in keys
                else s.default_max_goals_per_team
            )
            tc = int(updates["team_count"]) if "team_count" in keys else s.team_count
            ppt = int(updates["players_per_team"]) if "players_per_team" in keys else s.players_per_team
            fge = (
                bool(updates["fixed_goalkeepers_enabled"])
                if "fixed_goalkeepers_enabled" in keys
                else s.fixed_goalkeepers_enabled
            )
            g1 = (
                updates["fixed_goalkeeper_player_id_1"]
                if "fixed_goalkeeper_player_id_1" in keys
                else s.fixed_goalkeeper_player_id_1
            )
            g2 = (
                updates["fixed_goalkeeper_player_id_2"]
                if "fixed_goalkeeper_player_id_2" in keys
                else s.fixed_goalkeeper_player_id_2
            )

        if not fge:
            g1 = None
            g2 = None
        if g1 == "":
            g1 = None
        if g2 == "":
            g2 = None

        if dur < 60 or dur > 3600:
            raise ValidationError("match_day_bad_duration", "Match duration must be between 60 and 3600 seconds.")
        if mx < 0 or mx > 20:
            raise ValidationError("match_day_bad_max_goals", "Max goals per team must be between 0 and 20.")
        if tc < 2 or tc > 12:
            raise ValidationError("match_day_bad_team_count", "Número de equipas deve estar entre 2 e 12.")
        if ppt < 1 or ppt > 20:
            raise ValidationError("match_day_bad_roster_size", "Jogadores por equipa deve estar entre 1 e 20.")

        ph = phase if phase is not None else (s.phase if s else MatchDayPhase.PRE_MATCH)

        draw_shape_keys = {
            "team_count",
            "players_per_team",
            "fixed_goalkeepers_enabled",
            "fixed_goalkeeper_player_id_1",
            "fixed_goalkeeper_player_id_2",
        }

        if not s:
            sid = str(uuid.uuid4())
            ns = MatchDaySession(
                id=sid,
                session_date=d,
                timezone=self._settings.app_timezone,
                phase=ph,
                default_match_duration_seconds=dur,
                default_max_goals_per_team=mx,
                reference_start_time=time(8, 30),
                team_count=tc,
                players_per_team=ppt,
                fixed_goalkeepers_enabled=fge,
                fixed_goalkeeper_player_id_1=g1,
                fixed_goalkeeper_player_id_2=g2,
                created_at=now,
                updated_at=now,
                draft_teams_json=None,
                lineup_committed_at=None,
                draw_signatures_json=None,
            )
            self._match_days.save_session(ns)
        else:
            draft_j = s.draft_teams_json
            sig_j = s.draw_signatures_json
            committed = s.lineup_committed_at
            if committed is None and keys & draw_shape_keys:
                draft_j = None
                sig_j = None
                _log.info(
                    "settings_clear_draft_and_draw_signature session_id=%s keys=%s "
                    "(rascunho + assinatura do último sorteio zerados; precisa sortear de novo)",
                    s.id,
                    sorted(keys & draw_shape_keys),
                )
            ns = MatchDaySession(
                id=s.id,
                session_date=s.session_date,
                timezone=s.timezone,
                phase=ph,
                default_match_duration_seconds=dur,
                default_max_goals_per_team=mx,
                reference_start_time=s.reference_start_time,
                team_count=tc,
                players_per_team=ppt,
                fixed_goalkeepers_enabled=fge,
                fixed_goalkeeper_player_id_1=g1,
                fixed_goalkeeper_player_id_2=g2,
                created_at=s.created_at,
                updated_at=now,
                draft_teams_json=draft_j,
                lineup_committed_at=committed,
                draw_signatures_json=sig_j,
            )
            self._match_days.save_session(ns)
            for f in self._match_days.list_fixtures(s.id):
                if f.status is MatchFixtureStatus.PENDING:
                    nf = MatchDayFixture(
                        id=f.id,
                        session_id=f.session_id,
                        order_index=f.order_index,
                        home_team_slot=f.home_team_slot,
                        away_team_slot=f.away_team_slot,
                        status=f.status,
                        started_at=f.started_at,
                        ended_at=f.ended_at,
                        home_goals=f.home_goals,
                        away_goals=f.away_goals,
                        duration_seconds=dur,
                        max_goals_per_team=mx,
                    )
                    self._match_days.save_fixture(nf)
        return self.get_today_view()

    def start_fixture(self, fixture_id: str) -> TodayView:
        fx = self._require_fixture(fixture_id)
        if fx.status is not MatchFixtureStatus.PENDING:
            raise ValidationError("match_day_fixture_bad_state", "Fixture cannot be started.")
        sess = self._match_days.get_session_by_id(fx.session_id)
        if not sess:
            raise ValidationError("match_day_no_session", "Sessão não encontrada.")
        now = datetime.now(timezone.utc)
        if sess.lineup_committed_at is None:
            if not sess.draft_teams_json:
                raise ValidationError(
                    "match_day_no_lineup",
                    "Sorteie as equipas antes de apitar o início.",
                )
            teams = self._parse_draft_teams(sess.id, sess.draft_teams_json)
            _log.info(
                "start_fixture commit_official_lineup session_id=%s fixture_id=%s order_index=%s "
                "teams_slots=%s draft_teams_bytes=%s (grava match_day_teams; limpa rascunho e assinatura do sorteio)",
                sess.id,
                fx.id,
                fx.order_index,
                len(teams),
                len(sess.draft_teams_json or ""),
            )
            self._match_days.replace_teams(sess.id, teams)
            self._match_days.save_session(
                replace(
                    sess,
                    draft_teams_json=None,
                    draw_signatures_json=None,
                    lineup_committed_at=now,
                    updated_at=now,
                )
            )
        else:
            _log.info(
                "start_fixture skip_lineup_commit session_id=%s fixture_id=%s (lineup já oficial)",
                sess.id,
                fx.id,
            )
        nf = MatchDayFixture(
            id=fx.id,
            session_id=fx.session_id,
            order_index=fx.order_index,
            home_team_slot=fx.home_team_slot,
            away_team_slot=fx.away_team_slot,
            status=MatchFixtureStatus.LIVE,
            started_at=now,
            ended_at=None,
            home_goals=fx.home_goals,
            away_goals=fx.away_goals,
            duration_seconds=fx.duration_seconds,
            max_goals_per_team=fx.max_goals_per_team,
        )
        self._match_days.save_fixture(nf)
        self._bump_session_phase_live(fx.session_id)
        return self.get_today_view()

    def finish_fixture(self, fixture_id: str) -> TodayView:
        fx = self._require_fixture(fixture_id)
        if fx.status is not MatchFixtureStatus.LIVE:
            raise ValidationError("match_day_fixture_not_live", "Fixture is not live.")
        now = datetime.now(timezone.utc)
        nf = MatchDayFixture(
            id=fx.id,
            session_id=fx.session_id,
            order_index=fx.order_index,
            home_team_slot=fx.home_team_slot,
            away_team_slot=fx.away_team_slot,
            status=MatchFixtureStatus.FINISHED,
            started_at=fx.started_at,
            ended_at=now,
            home_goals=fx.home_goals,
            away_goals=fx.away_goals,
            duration_seconds=fx.duration_seconds,
            max_goals_per_team=fx.max_goals_per_team,
        )
        self._match_days.save_fixture(nf)
        return self.get_today_view()

    def record_event(
        self,
        *,
        fixture_id: str,
        type: MatchEventType,
        player_id: str | None,
        team_slot: int,
        elapsed_seconds: int | None,
    ) -> TodayView:
        fx = self._require_fixture(fixture_id)
        if fx.status is not MatchFixtureStatus.LIVE:
            raise ValidationError("match_day_fixture_not_live", "Fixture is not live.")
        if team_slot not in (fx.home_team_slot, fx.away_team_slot):
            raise ValidationError("match_day_bad_team_slot", "team_slot must be home or away for this fixture.")
        if player_id:
            p = self._players.get_by_id(player_id)
            if not p:
                raise ValidationError("match_day_unknown_player", "Unknown player.")
        now = datetime.now(timezone.utc)
        nh = fx.home_goals
        na = fx.away_goals
        if type is MatchEventType.GOAL:
            home_inc = 1 if team_slot == fx.home_team_slot else 0
            away_inc = 1 if team_slot == fx.away_team_slot else 0
            nh = fx.home_goals + home_inc
            na = fx.away_goals + away_inc
            if nh > fx.max_goals_per_team or na > fx.max_goals_per_team:
                raise ValidationError("match_day_max_goals", "Max goals per team reached for this fixture.")
        ev = MatchEvent(
            id=str(uuid.uuid4()),
            fixture_id=fx.id,
            type=type,
            player_id=player_id,
            team_slot=team_slot,
            recorded_at=now,
            elapsed_seconds=elapsed_seconds,
        )
        self._match_days.append_event(ev)
        if type is MatchEventType.GOAL:
            nf = MatchDayFixture(
                id=fx.id,
                session_id=fx.session_id,
                order_index=fx.order_index,
                home_team_slot=fx.home_team_slot,
                away_team_slot=fx.away_team_slot,
                status=fx.status,
                started_at=fx.started_at,
                ended_at=fx.ended_at,
                home_goals=nh,
                away_goals=na,
                duration_seconds=fx.duration_seconds,
                max_goals_per_team=fx.max_goals_per_team,
            )
            self._match_days.save_fixture(nf)
        return self.get_today_view()

    def list_fixture_events(self, fixture_id: str) -> list[MatchEvent]:
        self._require_fixture(fixture_id)
        return self._match_days.list_events(fixture_id)

    def _require_fixture(self, fixture_id: str) -> MatchDayFixture:
        fx = self._match_days.get_fixture(fixture_id)
        if not fx:
            raise ValidationError("match_day_unknown_fixture", "Unknown fixture.")
        return fx

    def _bump_session_phase_live(self, session_id: str) -> None:
        s = self._match_days.get_session_by_id(session_id)
        if not s or s.phase is MatchDayPhase.LIVE:
            return
        now = datetime.now(timezone.utc)
        self._match_days.save_session(replace(s, phase=MatchDayPhase.LIVE, updated_at=now))
