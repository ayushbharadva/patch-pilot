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


def _answer_text(results) -> str:
    return " ".join(str(r) for r in results).strip()


async def flip() -> bool:
    """Search -> forget(workarounds_v1_8) -> re-search; print an unambiguous diff.

    Proves DEMO-02 / ROADMAP SC3: the same GRAPH_COMPLETION query returns a
    DIFFERENT answer before vs after the surgical forget, and the durable
    incidents dataset still returns results afterward (INGEST-03 isolation).
    """
    print("=" * 72)
    print(f"BEFORE forget(dataset={WORKAROUNDS_V1_8!r}) -- query: {FLIP_QUERY!r}")
    print("=" * 72)
    before_results = await cognee.search(query_text=FLIP_QUERY, query_type=SearchType.GRAPH_COMPLETION)
    before_answer = _answer_text(before_results)
    print(before_answer)

    print()
    print(f"Calling forget(dataset={WORKAROUNDS_V1_8!r}) ...")
    forget_result = await cognee.forget(dataset=WORKAROUNDS_V1_8)
    print(f"forget() returned: {forget_result}")

    print()
    print("=" * 72)
    print(f"AFTER forget(dataset={WORKAROUNDS_V1_8!r}) -- query: {FLIP_QUERY!r}")
    print("=" * 72)
    after_results = await cognee.search(query_text=FLIP_QUERY, query_type=SearchType.GRAPH_COMPLETION)
    after_answer = _answer_text(after_results)
    print(after_answer)

    print()
    print("-" * 72)
    print("SIDE-BY-SIDE (BEFORE vs AFTER)")
    print("-" * 72)
    print(f"BEFORE: {before_answer}")
    print(f"AFTER:  {after_answer}")
    print("-" * 72)

    flip_ok = before_answer != after_answer
    if flip_ok:
        print("FLIP OK")
    else:
        print("FLIP FAILED - BEFORE and AFTER answers are identical")

    # Surgical isolation check (INGEST-03): the durable incidents dataset
    # must still return results after forget(workarounds_v1_8) — the forget
    # must not have leaked into or wiped an unrelated dataset.
    incidents_results = await cognee.search(
        query_text=INCIDENTS_QUERY,
        query_type=SearchType.GRAPH_COMPLETION,
        datasets=[INCIDENTS],
    )
    incidents_answer = _answer_text(incidents_results)
    # Assert on canonical content (mirrors the substring-match pattern used
    # by backend/persistence_check.py's durability check), not just
    # non-emptiness -- a non-empty but generic/off-topic/hallucinated
    # answer would otherwise pass this isolation check by mistake.
    incidents_survived = (
        "double-charged" in incidents_answer.lower() or "stripe" in incidents_answer.lower()
    )
    if incidents_survived:
        print("INCIDENTS SURVIVED")
        print(f"  incidents answer: {incidents_answer}")
    else:
        print("INCIDENTS CHECK FAILED - incidents dataset returned nothing after forget")

    return flip_ok and incidents_survived


async def reset() -> None:
    """Restore from a tar snapshot if one exists, else prune + reseed.

    Restoring a snapshot is $0 (see scripts/snapshot_memory.py's module
    docstring -- only cognify() bills). Falling back to prune + reseed only
    happens the first time, before any snapshot has been saved.
    """
    from scripts import snapshot_memory

    if snapshot_memory.snapshot_exists():
        print("Snapshot found -- restoring instead of re-seeding (zero-cost reset).")
        snapshot_memory.restore()
        return

    print("No snapshot found -- pruning and re-seeding from scratch (Pitfall 4: this bills cognify()).")
    from cognee import prune

    await prune.prune_data()
    await prune.prune_system()
    await seed()


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

    if args.reset and (args.seed or args.flip):
        parser.error("--reset cannot be combined with --seed/--flip")

    if args.reset:
        asyncio.run(reset())
        return 0

    if not args.seed and not args.flip:
        # Default: no flags -> seed then flip, end-to-end.
        return asyncio.run(_run(do_seed=True, do_flip=True))

    return asyncio.run(_run(do_seed=args.seed, do_flip=args.flip))


if __name__ == "__main__":
    sys.exit(main())
