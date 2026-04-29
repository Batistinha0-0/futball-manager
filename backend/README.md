# Futball Manager — API

FastAPI application with layered architecture (domain, application, ports, infrastructure).

PostgreSQL is used when **`DATABASE_URL`** is set (see `.env.example`). Otherwise the API uses in-memory repositories.

## Run (local)

From the `backend/` directory, using your system Python (no venv required by this repo):

```bash
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

With Postgres (from this folder: `docker compose up db`), set `DATABASE_URL` in `.env` — migrations run on startup.

## Docker Compose (Postgres + API)

From **`backend/`** (where [`docker-compose.yml`](docker-compose.yml) lives):

```bash
docker compose up --build
```

Copy [`.env.example`](.env.example) to `.env` here if you want to override ports, `PIP_TRUSTED_HOSTS`, etc.

## Run (Docker image only)

Build context is this folder (`backend/`). Used by `docker compose` above and by Render.

```bash
docker build -t futball-api .
docker run --rm -e DATABASE_URL=postgresql+psycopg://... -p 8000:8000 futball-api
```

Open `http://127.0.0.1:8000/docs` for OpenAPI.

## Migrations (manual)

Migrations also run automatically when the app starts with `DATABASE_URL` set. To run only Alembic:

```bash
# Windows (cmd)
set DATABASE_URL=postgresql+psycopg://futball:futball@127.0.0.1:5432/futball

# Linux / macOS
export DATABASE_URL=postgresql+psycopg://futball:futball@127.0.0.1:5432/futball

alembic upgrade head
```

## Tests

```bash
pytest
```

Tests clear `DATABASE_URL` so no database is required.
