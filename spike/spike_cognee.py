#!/usr/bin/env python3
"""
Throwaway Wave-0 spike (Phase 1, Plan 01, Task 3).

Proves, against the INSTALLED cognee 1.2.2 on this machine:
  1. FLIP    - forget(dataset=...) surgically removes one dataset's contribution
               to GRAPH_COMPLETION recall, without destroying a durable dataset.
  2. PERSIST - the durable dataset's content survives a fresh-process read
               (no re-add/re-cognify) once SYSTEM_ROOT_DIRECTORY/DATA_ROOT_DIRECTORY
               are pinned to absolute paths under .patchpilot_memory/.

This is a throwaway harness - NOT project code. It intentionally does not
import a `cognee_config` module (doesn't exist yet); this file sets its own
env before `import cognee`, mirroring the config-before-import pattern every
real entrypoint (FastAPI main.py, seed_cli.py) will use later.

Usage:
    .venv/bin/python spike/spike_cognee.py                  # main spike run
    .venv/bin/python spike/spike_cognee.py --persist-check   # internal: invoked
                                                               # as a subprocess by
                                                               # the main run to
                                                               # prove restart
                                                               # persistence
"""

import asyncio
import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

# --- Pattern 1 (config-before-import): resolve env BEFORE `import cognee` ---
load_dotenv()  # honors whatever provider .env configures (OpenAI primary or Gemini fallback)

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ROOT = REPO_ROOT / ".patchpilot_memory"

os.environ.setdefault("SYSTEM_ROOT_DIRECTORY", str(DEFAULT_ROOT))
os.environ.setdefault("DATA_ROOT_DIRECTORY", str(DEFAULT_ROOT / "data"))
# Last-resort defaults ONLY - .env's provider choice always wins via setdefault
# (never hard assignment), so the Gemini fallback path is honored untouched.
os.environ.setdefault("LLM_PROVIDER", "openai")
os.environ.setdefault("LLM_MODEL", "openai/gpt-4o-mini")

import cognee  # noqa: E402  (must follow env setup above)
from cognee import SearchType, prune  # noqa: E402

INCIDENT_DATASET = "spike_incident"
WORKAROUND_DATASET = "spike_workaround"

# Isolated-entity authoring (Pattern 4 / B-01): the workaround's artifact name
# (spike_dedupe_windmill) appears in NO other doc, so forget() cleanly removes
# it from recall instead of surviving via entity dedup.
INCIDENT_TEXT = (
    "SPIKE-INC-001: Customers were charged twice for a single purchase due to a "
    "checkout-service retry bug that resent the payment webhook on timeout."
)
WORKAROUND_TEXT = (
    "The temporary fix for duplicate charges was the spike_dedupe_windmill script, "
    "a nightly cron job that manually reconciled duplicate Stripe charges."
)

FLIP_QUERY = "What is the fix for customers being charged twice for one purchase?"
PERSIST_QUERY = "What incident involved customers being charged twice for one purchase?"


def print_header(title: str) -> None:
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)


def print_resolved_config() -> None:
    print_header("RESOLVED PROVIDER CONFIG")
    for key in ("LLM_PROVIDER", "LLM_MODEL", "EMBEDDING_PROVIDER", "EMBEDDING_MODEL"):
        print(f"{key} = {os.environ.get(key, '(unset)')}")
    print(f"SYSTEM_ROOT_DIRECTORY = {os.environ.get('SYSTEM_ROOT_DIRECTORY')}")
    print(f"DATA_ROOT_DIRECTORY = {os.environ.get('DATA_ROOT_DIRECTORY')}")
    key_present = bool(os.environ.get("LLM_API_KEY"))
    print(f"LLM_API_KEY set = {key_present} (value never printed)")


def print_runtime_contract() -> None:
    print_header("RUNTIME CONTRACT: help(cognee.add)")
    help(cognee.add)
    print_header("RUNTIME CONTRACT: help(cognee.cognify)")
    help(cognee.cognify)
    print_header("RUNTIME CONTRACT: help(cognee.search)")
    help(cognee.search)
    print_header("RUNTIME CONTRACT: help(cognee.forget)")
    help(cognee.forget)
    print_header("SearchType import path")
    print("from cognee import SearchType  ->", SearchType)
    print("members:", list(SearchType))


async def run_persist_check() -> int:
    """Subprocess-only mode: fresh process, NO add()/cognify(), just search."""
    print_resolved_config()
    print_header("PERSIST CHECK (fresh process, no re-add/re-cognify)")
    results = await cognee.search(
        query_text=PERSIST_QUERY,
        query_type=SearchType.GRAPH_COMPLETION,
        datasets=[INCIDENT_DATASET],
    )
    text = str(results)
    print("Fresh-process search result:", text)
    if (
        "SPIKE-INC-001" in text
        or "checkout-service" in text
        or "charged twice" in text.lower()
        or "double" in text.lower()
    ):
        print("PERSIST OK")
        return 0
    print("PERSIST FAILED - durable incident not found in fresh-process search")
    return 1


async def run_main_spike() -> int:
    print_resolved_config()
    print_runtime_contract()

    print_header("SEEDING: per-dataset add() + cognify() (Pattern 2 - never bare cognify())")
    await cognee.add(INCIDENT_TEXT, dataset_name=INCIDENT_DATASET)
    await cognee.add(WORKAROUND_TEXT, dataset_name=WORKAROUND_DATASET)
    await cognee.cognify(datasets=[INCIDENT_DATASET])
    await cognee.cognify(datasets=[WORKAROUND_DATASET])
    print("Seeded + cognified both datasets.")

    print_header("FLIP PROOF: GRAPH_COMPLETION BEFORE forget")
    before = await cognee.search(query_text=FLIP_QUERY, query_type=SearchType.GRAPH_COMPLETION)
    print("BEFORE:", before)

    print_header(f"forget(dataset={WORKAROUND_DATASET!r})")
    forget_result = await cognee.forget(dataset=WORKAROUND_DATASET)
    print("forget() returned:", forget_result)

    print_header("FLIP PROOF: GRAPH_COMPLETION AFTER forget")
    after = await cognee.search(query_text=FLIP_QUERY, query_type=SearchType.GRAPH_COMPLETION)
    print("AFTER:", after)

    flip_ok = str(before) != str(after)
    print("FLIP OK" if flip_ok else "FLIP FAILED - before/after answers identical")

    print_header("PERSISTENCE PROOF: spawning fresh subprocess (same root dirs, no re-cognify)")
    proc = subprocess.run(
        [sys.executable, str(Path(__file__).resolve()), "--persist-check"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=120,
    )
    print(proc.stdout)
    if proc.stderr:
        print("--- subprocess stderr ---")
        print(proc.stderr)
    persist_ok = proc.returncode == 0 and "PERSIST OK" in proc.stdout
    if not persist_ok:
        print("PERSIST FAILED - subprocess did not confirm durable incident survived")

    print_header("CLEANUP: prune_data() + prune_system() (leave .patchpilot_memory/ clean)")
    await prune.prune_data()
    await prune.prune_system()
    print("Pruned .patchpilot_memory/ clean.")

    return 0 if (flip_ok and persist_ok) else 1


def main() -> int:
    if "--persist-check" in sys.argv:
        return asyncio.run(run_persist_check())
    return asyncio.run(run_main_spike())


if __name__ == "__main__":
    sys.exit(main())
