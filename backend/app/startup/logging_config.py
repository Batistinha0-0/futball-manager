"""Configuração de logging via ambiente (corre em qualquer processo Uvicorn, com ou sem --reload)."""

from __future__ import annotations

import logging
import os
import sys


def configure_logging_from_env() -> None:
    """
    LOG_LEVEL — nível geral (default INFO). Também usado pelo Uvicorn em start.py.
    LOG_LEVEL_MATCH_DAY — opcional; nível só para o logger app.match_day (handler próprio, propagate=False).
    """
    root_name = os.environ.get("LOG_LEVEL", "INFO").strip().upper()
    root_level = getattr(logging, root_name, logging.INFO)
    fmt = "%(asctime)s %(levelname)s [%(name)s] %(message)s"
    datefmt = "%H:%M:%S"
    logging.basicConfig(level=root_level, format=fmt, datefmt=datefmt, force=True)

    md_raw = os.environ.get("LOG_LEVEL_MATCH_DAY", "").strip()
    lg = logging.getLogger("app.match_day")
    lg.handlers.clear()
    lg.propagate = True
    lg.setLevel(logging.NOTSET)
    if md_raw:
        md_name = md_raw.upper()
        md_level = getattr(logging, md_name, logging.INFO)
        lg.setLevel(md_level)
        handler = logging.StreamHandler(sys.stderr)
        handler.setLevel(md_level)
        handler.setFormatter(logging.Formatter(fmt, datefmt=datefmt))
        lg.addHandler(handler)
        lg.propagate = False
