# Build na raiz do repo (contexto `.`) — usado pelo Render com runtime "Docker".
# Gera `static_site/` a partir do Vite e sobe FastAPI na mesma origem (cookies no mobile).

# --- Front (produção: VITE_API_URL vazio vem de frontend/.env.production) ---
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /work/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- API + SPA estático ---
FROM python:3.12-slim-bookworm

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    API_HOST=0.0.0.0 \
    API_RELOAD=0

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml backend/README.md ./
COPY backend/start.py ./
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./
COPY --from=frontend-build /work/frontend/dist ./static_site

ARG PIP_TRUSTED_HOSTS=0
RUN set -eux; \
    if [ "$PIP_TRUSTED_HOSTS" = "1" ]; then \
      PIP_EXTRA="--trusted-host pypi.org --trusted-host files.pythonhosted.org"; \
    else \
      PIP_EXTRA=""; \
    fi; \
    pip install --no-cache-dir ${PIP_EXTRA} --upgrade pip setuptools wheel && \
    pip install --no-cache-dir ${PIP_EXTRA} -e .

EXPOSE 8000

# Render define $PORT em runtime.
CMD ["sh", "-c", "export API_PORT=${PORT:-8000}; exec python start.py"]
