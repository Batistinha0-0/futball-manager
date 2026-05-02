from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.db_commit_scope import run_with_optional_commit
from app.api.deps import get_db, get_match_day_service, require_players_read, require_players_write
from app.api.routes.matchday_schemas import (
    MatchEventCreateBody,
    MatchEventOut,
    RecentSessionOut,
    TodayOut,
    TodaySettingsPatchBody,
)
from app.application.matchday.match_day_service import MatchDayService
from app.domain.exceptions import ValidationError
from app.domain.matchday.enums import MatchDayPhase, MatchEventType
from app.domain.matchday.entities import MatchEvent
from app.domain.user import User

router = APIRouter()


def _http_for_matchday_validation(exc: ValidationError) -> HTTPException:
    code = exc.code
    if code in ("match_day_unknown_fixture",):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _phase_from_str(value: str | None) -> MatchDayPhase | None:
    if value is None:
        return None
    try:
        return MatchDayPhase(value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid phase: {value}.",
        ) from e


def _event_type_from_str(value: str) -> MatchEventType:
    try:
        return MatchEventType(value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid event type: {value}.",
        ) from e


@router.get("/match-day/recent-sessions", response_model=list[RecentSessionOut])
def get_match_day_recent_sessions(
    _: Annotated[User, Depends(require_players_read)],
    service: Annotated[MatchDayService, Depends(get_match_day_service)],
) -> list[RecentSessionOut]:
    return [RecentSessionOut.from_summary(s) for s in service.list_recent_session_summaries()]


@router.get("/match-day/today", response_model=TodayOut)
def get_match_day_today(
    _: Annotated[User, Depends(require_players_read)],
    service: Annotated[MatchDayService, Depends(get_match_day_service)],
    session_date: Annotated[date | None, Query(description="Data da sessão (YYYY-MM-DD); omitir = hoje no fuso da app.")] = None,
) -> TodayOut:
    try:
        return TodayOut.from_view(service.get_today_view(session_date))
    except ValidationError as exc:
        raise _http_for_matchday_validation(exc) from exc


@router.post("/match-day/today/close-day", response_model=TodayOut)
def post_match_day_close_day(
    __: Annotated[User, Depends(require_players_write)],
    db: Annotated[Session | None, Depends(get_db)],
    service: Annotated[MatchDayService, Depends(get_match_day_service)],
    session_date: Annotated[date | None, Query(description="Data da sessão a encerrar; omitir = hoje.")] = None,
) -> TodayOut:
    try:

        def _close() -> TodayOut:
            return TodayOut.from_view(service.close_today_session(session_date))

        return run_with_optional_commit(db, _close)
    except ValidationError as exc:
        raise _http_for_matchday_validation(exc) from exc


@router.post("/match-day/today/draw", response_model=TodayOut)
def post_match_day_draw(
    __: Annotated[User, Depends(require_players_write)],
    db: Annotated[Session | None, Depends(get_db)],
    service: Annotated[MatchDayService, Depends(get_match_day_service)],
    session_date: Annotated[date | None, Query(description="Data da sessão a sortear; omitir = hoje.")] = None,
) -> TodayOut:
    try:

        def _draw() -> TodayOut:
            return TodayOut.from_view(service.draw_today(session_date))

        return run_with_optional_commit(db, _draw)
    except ValidationError as exc:
        raise _http_for_matchday_validation(exc) from exc


@router.post("/match-day/today/unlock-partida-board", response_model=TodayOut)
def post_unlock_partida_board(
    __: Annotated[User, Depends(require_players_write)],
    db: Annotated[Session | None, Depends(get_db)],
    service: Annotated[MatchDayService, Depends(get_match_day_service)],
    session_date: Annotated[date | None, Query(description="Data da sessão; omitir = hoje.")] = None,
) -> TodayOut:
    try:

        def _unlock() -> TodayOut:
            return TodayOut.from_view(service.unlock_partida_board(session_date))

        return run_with_optional_commit(db, _unlock)
    except ValidationError as exc:
        raise _http_for_matchday_validation(exc) from exc


@router.patch("/match-day/today/settings", response_model=TodayOut)
def patch_match_day_today_settings(
    body: TodaySettingsPatchBody,
    __: Annotated[User, Depends(require_players_write)],
    db: Annotated[Session | None, Depends(get_db)],
    service: Annotated[MatchDayService, Depends(get_match_day_service)],
    session_date: Annotated[date | None, Query(description="Data da sessão a alterar; omitir = hoje.")] = None,
) -> TodayOut:
    raw = body.model_dump(exclude_unset=True)
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one field must be provided.",
        )
    phase = None
    if "phase" in raw:
        phase = _phase_from_str(raw["phase"])
    updates = {k: v for k, v in raw.items() if k != "phase"}
    if not updates and phase is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one field must be provided.",
        )
    try:

        def _patch() -> TodayOut:
            return TodayOut.from_view(service.patch_today_settings(updates, phase=phase, session_date=session_date))

        return run_with_optional_commit(db, _patch)
    except ValidationError as exc:
        raise _http_for_matchday_validation(exc) from exc


@router.post("/match-day/today/fixtures/{fixture_id}/start", response_model=TodayOut)
def post_fixture_start(
    fixture_id: str,
    __: Annotated[User, Depends(require_players_write)],
    db: Annotated[Session | None, Depends(get_db)],
    service: Annotated[MatchDayService, Depends(get_match_day_service)],
) -> TodayOut:
    try:

        def _start() -> TodayOut:
            return TodayOut.from_view(service.start_fixture(fixture_id))

        return run_with_optional_commit(db, _start)
    except ValidationError as exc:
        raise _http_for_matchday_validation(exc) from exc


@router.post("/match-day/today/fixtures/{fixture_id}/time-expired", response_model=TodayOut)
def post_fixture_time_expired(
    fixture_id: str,
    __: Annotated[User, Depends(require_players_write)],
    db: Annotated[Session | None, Depends(get_db)],
    service: Annotated[MatchDayService, Depends(get_match_day_service)],
) -> TodayOut:
    try:

        def _te() -> TodayOut:
            return TodayOut.from_view(service.finish_fixture_time_expired(fixture_id))

        return run_with_optional_commit(db, _te)
    except ValidationError as exc:
        raise _http_for_matchday_validation(exc) from exc


@router.post("/match-day/today/fixtures/{fixture_id}/finish", response_model=TodayOut)
def post_fixture_finish(
    fixture_id: str,
    __: Annotated[User, Depends(require_players_write)],
    db: Annotated[Session | None, Depends(get_db)],
    service: Annotated[MatchDayService, Depends(get_match_day_service)],
) -> TodayOut:
    try:

        def _finish() -> TodayOut:
            return TodayOut.from_view(service.finish_fixture(fixture_id))

        return run_with_optional_commit(db, _finish)
    except ValidationError as exc:
        raise _http_for_matchday_validation(exc) from exc


@router.post("/match-day/today/fixtures/{fixture_id}/events", response_model=TodayOut)
def post_fixture_event(
    fixture_id: str,
    body: MatchEventCreateBody,
    __: Annotated[User, Depends(require_players_write)],
    db: Annotated[Session | None, Depends(get_db)],
    service: Annotated[MatchDayService, Depends(get_match_day_service)],
) -> TodayOut:
    et = _event_type_from_str(body.type)
    try:

        def _ev() -> TodayOut:
            return TodayOut.from_view(
                service.record_event(
                    fixture_id=fixture_id,
                    type=et,
                    player_id=body.player_id,
                    team_slot=body.team_slot,
                    elapsed_seconds=body.elapsed_seconds,
                )
            )

        return run_with_optional_commit(db, _ev)
    except ValidationError as exc:
        raise _http_for_matchday_validation(exc) from exc


def _event_to_out(e: MatchEvent) -> MatchEventOut:
    return MatchEventOut(
        id=e.id,
        fixture_id=e.fixture_id,
        type=e.type.value,
        player_id=e.player_id,
        team_slot=e.team_slot,
        recorded_at=e.recorded_at,
        elapsed_seconds=e.elapsed_seconds,
    )


@router.get("/match-day/today/fixtures/{fixture_id}/events", response_model=list[MatchEventOut])
def list_fixture_events(
    fixture_id: str,
    _: Annotated[User, Depends(require_players_read)],
    service: Annotated[MatchDayService, Depends(get_match_day_service)],
) -> list[MatchEventOut]:
    try:
        events = service.list_fixture_events(fixture_id)
    except ValidationError as exc:
        raise _http_for_matchday_validation(exc) from exc
    return [_event_to_out(e) for e in events]
