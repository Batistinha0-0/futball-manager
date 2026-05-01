"""Serve o build estático do Vite a partir do mesmo host da API (cookies first-party no mobile)."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse


def _static_root() -> Path:
    return Path(__file__).resolve().parent.parent / "static_site"


def mount_static_spa_if_built(app: FastAPI) -> None:
    root = _static_root()
    index = root / "index.html"
    if not root.is_dir() or not index.is_file():
        return

    root_resolved = root.resolve()

    @app.get("/", include_in_schema=False)
    def spa_index() -> FileResponse:
        return FileResponse(index)

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_asset_or_fallback(full_path: str) -> FileResponse:
        # Não servir rotas da API por aqui (defesa; rotas /api/* têm prioridade se registadas antes).
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="Not Found")
        tentative = (root / full_path).resolve()
        try:
            tentative.relative_to(root_resolved)
        except ValueError:
            raise HTTPException(status_code=404, detail="Not Found") from None
        if tentative.is_file():
            return FileResponse(tentative)
        return FileResponse(index)
