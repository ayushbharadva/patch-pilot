#!/usr/bin/env python3
"""Zero-cost reseed snapshot — tar save/restore of .patchpilot_memory/ (Pitfall 4).

Only `cognify()` incurs meaningful LLM cost (graph extraction); `add()`,
`search()`, and `forget()` are cheap or free. Re-running the full seed CLI
from scratch on every demo rehearsal re-bills `cognify()` for all three
datasets every time. Snapshotting `.patchpilot_memory/` AFTER the first
successful `--seed` lets `seed/seed_cli.py --reset` restore a fully
cognified, demo-ready state for $0 instead of re-cognifying.

This module is pure filesystem tar work — it deliberately does NOT import
`cognee` or `backend.cognee_config`, since a tarball save/restore never
needs to resolve Cognee's LLM/embedding provider. It does, however, need to
resolve the same storage-root override convention `backend/cognee_config.py`
uses (`SYSTEM_ROOT_DIRECTORY` in `.env`), so it re-reads that one env var
directly instead of hardcoding the default path.

The resulting `*.snapshot.tar` is gitignored (Plan 01) — it may contain
cognified seed content and must never be committed (see 01-04-PLAN.md
threat T-01-02).

Usage:
    .venv/bin/python scripts/snapshot_memory.py --save     # tar current .patchpilot_memory/
    .venv/bin/python scripts/snapshot_memory.py --restore  # untar, replacing the live tree
"""

import argparse
import os
import shutil
import sys
import tarfile
from pathlib import Path

from dotenv import load_dotenv

# Resolve the same SYSTEM_ROOT_DIRECTORY override backend/cognee_config.py
# supports, without importing cognee itself (see module docstring).
load_dotenv()
REPO_ROOT = Path(__file__).resolve().parent.parent
MEMORY_ROOT = Path(os.environ.get("SYSTEM_ROOT_DIRECTORY", str(REPO_ROOT / ".patchpilot_memory")))
SNAPSHOT_PATH = REPO_ROOT / "patchpilot_memory.snapshot.tar"


def snapshot_exists() -> bool:
    return SNAPSHOT_PATH.exists()


def save() -> None:
    """Tar the entire .patchpilot_memory/ tree into a gitignored *.snapshot.tar."""
    if not MEMORY_ROOT.exists() or not any(MEMORY_ROOT.iterdir()):
        print(f"Nothing to save -- {MEMORY_ROOT} does not exist or is empty. Run --seed first.")
        sys.exit(1)
    with tarfile.open(SNAPSHOT_PATH, "w") as tar:
        tar.add(MEMORY_ROOT, arcname=MEMORY_ROOT.name)
    print(f"Saved snapshot: {SNAPSHOT_PATH}")


def restore() -> None:
    """Extract the tarball back, replacing the live .patchpilot_memory/ tree."""
    if not snapshot_exists():
        print(f"No snapshot found at {SNAPSHOT_PATH}. Run --save first (after a successful --seed).")
        sys.exit(1)
    if MEMORY_ROOT.exists():
        shutil.rmtree(MEMORY_ROOT)
    with tarfile.open(SNAPSHOT_PATH, "r") as tar:
        tar.extractall(REPO_ROOT, filter="data")
    print(f"Restored {MEMORY_ROOT} from {SNAPSHOT_PATH}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Save/restore .patchpilot_memory/ for zero-cost reseeds")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--save", action="store_true", help="Tar the current .patchpilot_memory/ tree")
    group.add_argument("--restore", action="store_true", help="Restore .patchpilot_memory/ from the tarball")
    args = parser.parse_args()

    if args.save:
        save()
    else:
        restore()
    return 0


if __name__ == "__main__":
    sys.exit(main())
