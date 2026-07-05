#!/usr/bin/env bash
set -euo pipefail

# Navigate to project root (parent of scripts/)
cd "$(dirname "$0")/.."

# Ensure Python can find the 'backend' package
export PYTHONPATH="$(pwd):${PYTHONPATH:-}"

python scripts/render_boot.py

exec python -m uvicorn backend.main:app --workers 1 --host 0.0.0.0 --port "${PORT:-8000}"`