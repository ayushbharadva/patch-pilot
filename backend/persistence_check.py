"""Restart-persistence proof — PLAT-02.

Two CLI modes, meant to be run as two SEPARATE process invocations against
the same pinned `.patchpilot_memory/`:

    .venv/bin/python backend/persistence_check.py --store    # process 1
    .venv/bin/python backend/persistence_check.py --verify   # process 2 (the "restart")

`--verify` performs ONLY a search — no add(), no cognify() — so a successful
recall proves the canary survived the process death in between, i.e. memory
is durable on disk rather than living in process memory or an ephemeral
filesystem.

Import style matches backend/main.py: package-qualified (`backend.cognee_config`
/ `backend.datasets`), with the repo root pushed onto `sys.path`, so this
script never registers `sys.modules["datasets"]` under our own module (which
would collide with lancedb's optional HuggingFace-datasets integration).
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

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import CANARY  # noqa: E402

CANARY_SENTENCE = "PatchPilot persistence canary: the zephyr-relay-77 sensor reports stale readings after a firmware update."
CANARY_QUERY = "zephyr-relay-77 sensor"


async def store() -> None:
    """Add + cognify the canary, then exit. Simulates state before a restart."""
    await cognee.add(CANARY_SENTENCE, dataset_name=CANARY)
    await cognee.cognify(datasets=[CANARY])
    print("STORE OK")


async def verify() -> bool:
    """Search ONLY (no add/cognify) for the canary in a fresh process.

    Returns True if the canary content is present in the recalled answer.
    """
    results = await cognee.search(
        query_text=CANARY_QUERY,
        query_type=SearchType.GRAPH_COMPLETION,
        datasets=[CANARY],
    )
    answer_text = " ".join(str(r) for r in results)
    return "zephyr-relay-77" in answer_text


def main() -> None:
    parser = argparse.ArgumentParser(description="PatchPilot restart-persistence canary (PLAT-02)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--store", action="store_true", help="Store the canary and exit (run 1)")
    group.add_argument("--verify", action="store_true", help="Verify the canary from a fresh process (run 2)")
    args = parser.parse_args()

    if args.store:
        asyncio.run(store())
        return

    ok = asyncio.run(verify())
    if ok:
        print("PERSIST OK")
        sys.exit(0)
    else:
        print("PERSIST FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
