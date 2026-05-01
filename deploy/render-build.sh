#!/usr/bin/env bash
# Build usado no Render (Web Service único): front + cópia para backend/static_site + install da API.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"
npm ci
npm run build
rm -rf "$ROOT/backend/static_site"
cp -r "$ROOT/frontend/dist" "$ROOT/backend/static_site"
cd "$ROOT/backend"
pip install .
