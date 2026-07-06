#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# glibc grows one malloc arena per thread by default (8 per core reported),
# which fragments badly in a 512MB container — capping arenas is the standard
# containerized-Python mitigation and typically saves 50-150MB RSS here.
export MALLOC_ARENA_MAX="${MALLOC_ARENA_MAX:-2}"

python scripts/render_boot.py

exec python -m uvicorn backend.main:app --workers 1 --host 0.0.0.0 --port "${PORT:-8000}"