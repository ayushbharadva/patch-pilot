#!/usr/bin/env python3
"""Restore demo memory on Render when the ephemeral disk is empty.

Called from scripts/render_start.sh before uvicorn starts. If
.patchpilot_memory/ already has data (persistent disk or prior boot),
this is a no-op. Otherwise downloads SNAPSHOT_URL (if set) or restores
patchpilot_memory.snapshot.tar from the repo root when present.
"""

from __future__ import annotations

import os
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.snapshot_memory import SNAPSHOT_PATH, restore  # noqa: E402

MEMORY_ROOT = Path(
    os.environ.get("SYSTEM_ROOT_DIRECTORY", str(REPO_ROOT / ".patchpilot_memory")),
)

# Canonical public demo snapshot (GitHub release asset). Render dashboard env
# vars are NOT synced from render.yaml — the same failure class that kept the
# stale CORS_ORIGINS live — so SNAPSHOT_URL may be unset/stale in prod. With
# this fallback baked in, every boot on a fresh ephemeral disk (deploys AND
# crash-restarts) self-heals back to the seeded demo memory.
DEFAULT_SNAPSHOT_URL = (
    "https://github.com/ayushbharadva/patch-pilot/releases/download/"
    "memory-snapshot-v1/patchpilot_memory.snapshot.tar"
)


def memory_is_populated() -> bool:
    return MEMORY_ROOT.exists() and any(MEMORY_ROOT.iterdir())


def download_snapshot(url: str) -> None:
    print(f"Downloading memory snapshot from {url} ...")
    urllib.request.urlretrieve(url, SNAPSHOT_PATH)  # noqa: S310
    print(f"Saved snapshot to {SNAPSHOT_PATH}")


def main() -> int:
    if memory_is_populated():
        print(f"Memory already present at {MEMORY_ROOT} — skipping restore.")
        return 0

    snapshot_url = os.environ.get("SNAPSHOT_URL", "").strip() or DEFAULT_SNAPSHOT_URL
    if snapshot_url and not SNAPSHOT_PATH.exists():
        try:
            download_snapshot(snapshot_url)
        except Exception as exc:  # noqa: BLE001
            print(f"WARNING: snapshot download failed: {exc}")

    if not SNAPSHOT_PATH.exists():
        print(
            "WARNING: no snapshot available — API will start with empty memory. "
            "Set SNAPSHOT_URL to a GitHub release asset or run seed after deploy."
        )
        return 0

    try:
        restore()
    except FileNotFoundError as exc:
        print(f"WARNING: snapshot restore failed: {exc}")
        return 0

    print(f"Restored demo memory to {MEMORY_ROOT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
