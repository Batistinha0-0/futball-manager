# Futball Manager — API

FastAPI application with layered architecture (domain, application, ports, infrastructure).

PostgreSQL is used when **`DATABASE_URL`** is set (see `.env.example`). Otherwise the API uses in-memory repositories.

## Local development (recommended)

1. **Postgres in Docker** (from this directory). The database container is named **`futball-postgres`** (Compose project **`futball-manager`**, not the folder name `backend`).

   ```bash
   docker compose up -d
   ```

2. **API on the host** — copy [`.env.example`](.env.example) to `.env` (uncomment or set `DATABASE_URL` for Postgres), then:

   ```bash
   pip install -e ".[dev]"
   python start.py
   ```

   [`start.py`](start.py) fixes the working directory to `backend/`, loads `.env`, checks Python ≥ 3.11, CORS, and (if `DATABASE_URL` is set) connects to Postgres before starting Uvicorn. Alternatively: `uvicorn app.main:app --reload`.

Migrations (**Alembic**) run automatically on startup when `DATABASE_URL` is set.

## Run without Postgres

Omit `DATABASE_URL` in `.env` (or leave it empty) and run `uvicorn` — uses in-memory storage.

## Docker image (Render / production)

The [`Dockerfile`](Dockerfile) builds the API container for platforms like Render; it is **not** used by `docker compose` in this repo (compose only runs **PostgreSQL**).

```bash
docker build -t futball-api .
docker run --rm -e DATABASE_URL=postgresql+psycopg://... -p 8000:8000 futball-api
```

If `docker build` fails with **SSL / self-signed certificate** to PyPI:

```bash
docker build --build-arg PIP_TRUSTED_HOSTS=1 -t futball-api .
```

Open `http://127.0.0.1:8000/docs` for OpenAPI.

## Produção (mesma origem: site no celular)

Se existir a pasta **`static_site/`** ao lado de `app/` (conteúdo de `frontend/dist` após `npm run build`), o FastAPI serve o SPA em `/` e a API continua em `/api/v1/...`. O build de produção do front usa `frontend/.env.production` com `VITE_API_URL` vazio para pedidos relativos. No Render, ver `deploy/render-build.sh` e `deploy/render-backend.env`.

## Migrations (manual)

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
