FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

# Set PIP_TRUSTED_HOSTS=1 if pip fails with SSLCertVerificationError / self-signed certificate
# (common behind corporate TLS inspection). Leave unset or 0 for normal PyPI verification (e.g. Render).
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

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
