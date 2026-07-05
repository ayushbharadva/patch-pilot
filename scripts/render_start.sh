#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python scripts/render_boot.py

exec uvicorn backend.main:app --workers 1 --host 0.0.0.0 --port "${PORT:-8000}"
