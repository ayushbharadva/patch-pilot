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
import sqlite3
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
    """Extract the tarball back, replacing the live .patchpilot_memory/ tree.

    Raises FileNotFoundError (a normal Exception subclass) rather than
    calling sys.exit() directly -- this function is called both from the
    CLI (main(), below) and from backend/reset.py's POST /reset handler.
    sys.exit() raises SystemExit, a BaseException that is NOT caught by
    reset.py's `except Exception:` guard nor by asyncio's task machinery,
    which would crash the entire running uvicorn worker (CR-01) instead of
    returning a graceful D-24 error response. main() below translates this
    back into a CLI-appropriate sys.exit(1).
    """
    if not snapshot_exists():
        raise FileNotFoundError(
            f"No snapshot found at {SNAPSHOT_PATH}. Run --save first (after a successful --seed)."
        )
    if MEMORY_ROOT.exists():
        shutil.rmtree(MEMORY_ROOT)
    with tarfile.open(SNAPSHOT_PATH, "r") as tar:
        tar.extractall(REPO_ROOT, filter="data")
    _rewrite_absolute_paths()
    print(f"Restored {MEMORY_ROOT} from {SNAPSHOT_PATH}")


def _rewrite_absolute_paths() -> None:
    """Rewrite machine-specific absolute paths inside the restored sqlite DBs.

    Cognee records absolute paths from the machine that CREATED the snapshot
    (dataset_database.vector_database_url, data.raw_data_location, node
    properties JSON — e.g. /Users/<dev>/.../.patchpilot_memory/databases/...).
    Restored onto a different machine those paths are dead: observed live on
    the HF Space (Jul 6), every search failed with LanceDB "Unable to create
    lance dataset at /Users/... Permission denied (os error 13)" because the
    Linux container obediently tried the Mac path. Replace every occurrence
    of the snapshot's original memory root with THIS machine's MEMORY_ROOT,
    in every text-typed column of every restored sqlite database. No-op when
    the snapshot was created on this machine (old root == new root).
    """
    # The marker is the memory root's directory name as recorded INSIDE the
    # snapshot (save() tars with arcname=MEMORY_ROOT.name, which is
    # .patchpilot_memory everywhere this project runs) — NOT the runtime
    # root's name, which an env override may have pointed elsewhere.
    marker = ".patchpilot_memory"
    for db_path in (MEMORY_ROOT / "databases").glob("*"):
        if not db_path.is_file() or db_path.name.endswith(("-shm", "-wal")):
            continue
        try:
            con = sqlite3.connect(db_path)
        except sqlite3.Error:
            continue
        try:
            tables = [
                r[0]
                for r in con.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            ]
            # Discover every distinct stored prefix ending at the marker —
            # values appear both as plain paths (/Users/.../.patchpilot_memory)
            # and as URIs (file:///Users/.../.patchpilot_memory), and each
            # form must be rewritten while keeping its scheme.
            old_roots: set[str] = set()
            text_cols: dict[str, list[str]] = {}
            for table in tables:
                cols = con.execute(f'PRAGMA table_info("{table}")').fetchall()
                text_cols[table] = [
                    c[1]
                    for c in cols
                    if any(t in (c[2] or "").upper() for t in ("CHAR", "TEXT", "JSON", "CLOB"))
                ]
                for col in text_cols[table]:
                    for (value,) in con.execute(
                        f'SELECT "{col}" FROM "{table}" WHERE "{col}" LIKE ?',
                        (f"%{marker}%",),
                    ).fetchall():
                        if isinstance(value, str):
                            start = 0
                            while (idx := value.find(marker, start)) != -1:
                                # Prefix runs from the start of the embedded
                                # path/URI; for JSON blobs fall back to the
                                # nearest quote boundary.
                                boundary = max(
                                    value.rfind('"', 0, idx), value.rfind(" ", 0, idx)
                                )
                                old_roots.add(value[boundary + 1 : idx + len(marker)])
                                start = idx + len(marker)
            old_roots.discard(str(MEMORY_ROOT))
            rewritten = 0
            # Longest first so URI forms never get half-eaten by their plain
            # substring form.
            for old_root in sorted(old_roots, key=len, reverse=True):
                if "://" in old_root:
                    new_root = old_root.split("://", 1)[0] + "://" + str(MEMORY_ROOT)
                else:
                    new_root = str(MEMORY_ROOT)
                if old_root == new_root:
                    continue
                for table, cols in text_cols.items():
                    for col in cols:
                        cur = con.execute(
                            f'UPDATE "{table}" SET "{col}" = REPLACE("{col}", ?, ?) '
                            f'WHERE "{col}" LIKE ?',
                            (old_root, new_root, f"%{old_root}%"),
                        )
                        rewritten += cur.rowcount
                print(f"Path rewrite in {db_path.name}: {old_root} -> {new_root}")
            con.commit()
            if rewritten:
                print(f"Rewrote {rewritten} row(s) in {db_path.name}")
        except sqlite3.Error as exc:
            print(f"WARNING: path rewrite skipped for {db_path.name}: {exc}")
        finally:
            con.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Save/restore .patchpilot_memory/ for zero-cost reseeds")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--save", action="store_true", help="Tar the current .patchpilot_memory/ tree")
    group.add_argument("--restore", action="store_true", help="Restore .patchpilot_memory/ from the tarball")
    args = parser.parse_args()

    try:
        if args.save:
            save()
        else:
            restore()
    except FileNotFoundError as exc:
        print(exc)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
