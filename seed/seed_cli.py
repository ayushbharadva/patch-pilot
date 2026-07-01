#!/usr/bin/env python3
"""PatchPilot seed CLI — the Phase-1 headline proof (DEMO-02, INGEST-02, INGEST-03).

Ingests the 8-doc seed corpus (seed/README.md) into the three locked
datasets from backend/datasets.py, then runs the before/after forget-flip
demo that is the whole point of Phase 1: the same query returns a DIFFERENT
GRAPH_COMPLETION answer before vs after a surgical forget(workarounds_v1_8),
while the durable incidents dataset survives untouched.

Import order follows the config-before-import keystone established in
backend/cognee_config.py (see its module docstring) and used identically by
backend/main.py and backend/persistence_check.py:

    backend.cognee_config  (sets env before cognee is touched)
    -> import cognee
    -> backend.cognee_patches  (monkeypatches already-loaded classes)
    -> everything else

Skipping this order — or skipping cognee_patches — breaks the Mistral
provider (AttributeError on '.choices', tokenizer errors, or
UnsupportedParamsError on embeddings) and/or CACHING=false (without which
cognee's session layer can short-circuit a repeat search with a canned
"Got it." instead of a real answer — exactly the failure mode that would
silently break this CLI's flip demo).

Usage:
    .venv/bin/python seed/seed_cli.py --seed    # ingest all 8 docs, per-dataset scoped cognify
    .venv/bin/python seed/seed_cli.py --flip    # search -> forget(workarounds_v1_8) -> re-search
    .venv/bin/python seed/seed_cli.py --reset   # restore from snapshot, or prune + reseed
    .venv/bin/python seed/seed_cli.py           # default: --seed then --flip
"""

import argparse
import asyncio
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from cognee import SearchType  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bugs)
from backend.datasets import INCIDENTS, WORKAROUNDS_V1_8, WORKAROUNDS_V1_9  # noqa: E402

SEED_ROOT = Path(__file__).resolve().parent

# Folder -> dataset mapping, matching seed/README.md exactly. Never merge
# folders into one dataset — that reintroduces the #1023 cross-dataset leak
# (see backend/datasets.py and .planning/phases/01-foundation/01-RESEARCH.md
# Pitfall 3).
DATASET_FOLDERS = {
    INCIDENTS: SEED_ROOT / "incidents",
    WORKAROUNDS_V1_8: SEED_ROOT / "workarounds_v1_8",
    WORKAROUNDS_V1_9: SEED_ROOT / "workarounds_v1_9",
}

# Canonical demo query (seed/README.md B-02) — present only in the Stripe
# arc's docs, absent from both decoy incidents.
FLIP_QUERY = "What is the fix for customers being double-charged?"
INCIDENTS_QUERY = "customers double-charged"


async def seed() -> None:
    """Add + per-dataset scoped cognify() for all 8 seed docs (INGEST-02, INGEST-03).

    Three separate scoped cognify(datasets=[name]) calls — never a bare
    cognify() — so each dataset's knowledge graph is built in isolation.
    """
    for dataset_name, folder in DATASET_FOLDERS.items():
        doc_paths = sorted(folder.glob("*.md"))
        print(f"Seeding {dataset_name!r} from {len(doc_paths)} doc(s) in {folder.relative_to(_REPO_ROOT)}/ ...")
        for doc_path in doc_paths:
            text = doc_path.read_text()
            await cognee.add(text, dataset_name=dataset_name)
            print(f"  added {doc_path.name}")
        await cognee.cognify(datasets=[dataset_name])
        print(f"  cognify(datasets=[{dataset_name!r}]) complete.")
    print("SEED OK")


async def flip() -> bool:
    """Search -> forget(workarounds_v1_8) -> re-search; print an unambiguous diff.

    Implemented in Task 2 of Plan 01-04.
    """
    raise NotImplementedError("flip() is completed in Task 2 of Plan 01-04")


async def reset() -> None:
    """Restore from a tar snapshot if one exists, else prune + reseed.

    Wired to scripts/snapshot_memory.py in Task 3 of Plan 01-04.
    """
    raise NotImplementedError("reset() is wired to scripts/snapshot_memory.py in Task 3 of Plan 01-04")


async def _run(do_seed: bool, do_flip: bool) -> int:
    if do_seed:
        await seed()
    if do_flip:
        ok = await flip()
        return 0 if ok else 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="PatchPilot seed CLI (DEMO-02, INGEST-02, INGEST-03)")
    parser.add_argument(
        "--seed", action="store_true", help="Ingest all 8 seed docs into incidents/workarounds_v1_8/workarounds_v1_9"
    )
    parser.add_argument(
        "--flip", action="store_true", help="Run the before/after forget-flip demo (requires --seed to have run first)"
    )
    parser.add_argument(
        "--reset", action="store_true", help="Restore from snapshot (or prune + reseed) for a clean re-run"
    )
    args = parser.parse_args()

    if args.reset:
        asyncio.run(reset())
        return 0

    if not args.seed and not args.flip:
        # Default: no flags -> seed then flip, end-to-end.
        return asyncio.run(_run(do_seed=True, do_flip=True))

    return asyncio.run(_run(do_seed=args.seed, do_flip=args.flip))


if __name__ == "__main__":
    sys.exit(main())
