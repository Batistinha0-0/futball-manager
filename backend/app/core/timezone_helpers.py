"""Datas/horas no fuso configurado da app (domingo, janelas do dia de jogo)."""

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from app.core.config import Settings


def app_zoneinfo(settings: Settings) -> ZoneInfo:
    return ZoneInfo(settings.app_timezone)


def now_in_app_tz(settings: Settings) -> datetime:
    return datetime.now(app_zoneinfo(settings))


def today_date_in_app_tz(settings: Settings) -> date:
    return now_in_app_tz(settings).date()


def is_sunday_match_layout_active(settings: Settings, at: datetime | None = None) -> bool:
    """Domingo a partir das 06:00 no fuso da app: UI de 'dia de jogo'."""
    dt = at or now_in_app_tz(settings)
    local = dt.astimezone(app_zoneinfo(settings)) if dt.tzinfo else dt.replace(tzinfo=ZoneInfo("UTC")).astimezone(
        app_zoneinfo(settings)
    )
    if local.weekday() != 6:
        return False
    return local.time() >= time(6, 0)
