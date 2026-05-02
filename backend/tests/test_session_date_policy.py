"""Política de janela de datas para sessões recentes."""

from datetime import date, timedelta

import pytest

from app.domain.exceptions import ValidationError
from app.domain.matchday.session_date_policy import (
    assert_session_date_in_recent_window,
    recent_session_date_range,
)


def test_recent_session_date_range_14_days() -> None:
    today = date(2026, 5, 15)
    start, end = recent_session_date_range(today, max_days=14)
    assert end == today
    assert start == today - timedelta(days=13)


def test_assert_session_date_rejects_future() -> None:
    today = date(2026, 5, 15)
    with pytest.raises(ValidationError) as ei:
        assert_session_date_in_recent_window(date(2026, 5, 16), today=today)
    assert ei.value.code == "match_day_session_date_future"


def test_assert_session_date_rejects_too_old() -> None:
    today = date(2026, 5, 15)
    with pytest.raises(ValidationError) as ei:
        assert_session_date_in_recent_window(date(2026, 4, 1), today=today)
    assert ei.value.code == "match_day_session_date_outside_window"


def test_assert_session_date_accepts_today_and_start_of_window() -> None:
    today = date(2026, 5, 15)
    start, _ = recent_session_date_range(today, max_days=14)
    assert_session_date_in_recent_window(today, today=today)
    assert_session_date_in_recent_window(start, today=today)
