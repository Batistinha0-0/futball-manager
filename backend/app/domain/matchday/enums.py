from enum import Enum


class MatchDayPhase(str, Enum):
    PRE_MATCH = "pre_match"
    LIVE = "live"
    CLOSED = "closed"


class MatchFixtureStatus(str, Enum):
    PENDING = "pending"
    LIVE = "live"
    FINISHED = "finished"


class MatchEventType(str, Enum):
    GOAL = "goal"
    GOALKEEPER_SAVE = "goalkeeper_save"
    ASSIST = "assist"
    YELLOW_CARD = "yellow_card"
    RED_CARD = "red_card"
