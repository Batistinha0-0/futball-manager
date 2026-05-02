"""Assinatura estável de sorteios (SRP: isolado do fluxo do MatchDayService)."""

from __future__ import annotations

import hashlib
import json


def fingerprint_team_slots(slots: list[tuple[int, tuple[str, ...]]]) -> str:
    """Assinatura estável por slot (ordem dos slots + conjuntos ordenados por time)."""
    ordered = sorted(slots, key=lambda x: x[0])
    payload = [[slot, sorted(list(ids))] for slot, ids in ordered]
    raw = json.dumps(payload, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


def load_last_draw_fingerprint(raw: str | None) -> str | None:
    """Última assinatura guardada: JSON string \"<sha256>\" (novo) ou legado lista — usa o último elemento."""
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if isinstance(data, str) and len(data) == 64:
        return data
    if isinstance(data, list):
        for x in reversed(data):
            if isinstance(x, str) and len(x) == 64:
                return x
    return None
