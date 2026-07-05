#!/usr/bin/env python3
"""Loop timing harness + demo script of record (DEMO-03 / D-01 / D-02).

This is the demo script of record. It drives the RUNNING backend over real
HTTP (the cognee package is never imported here — this measures the real
network path a browser takes, per `frontend/lib/api.ts`'s exact endpoint
payloads), timing the full search -> release upload -> drift badge ->
forget -> re-search loop and asserting it lands under 120 seconds
(DEMO-03).

Canonical query: the SendGrid/forgot-password arc's flip query
(seed/README.md B-02).

SNAPSHOT REDESIGN (Jul 5, demo-dataset validation): the reset snapshot is
now the PRE-RELEASE state — `incidents` (🟢) + `workarounds_v1_8` (🟢)
only, `workarounds_v1_9` absent. This makes the timed loop the *literal*
Core Value arc with a TRUE answer flip: the initial search answers with the
old `flush_mail_queue` workaround (v1_8 is the highest live version, so it
is stable and wins as primary); uploading the real
`seed/workarounds_v1_9/sendgrid-release.md` as release 1.9 flips v1_8 to
drifting live; forgetting v1_8 flips the re-search answer to the SendGrid
API fix. No fabricated release note is needed anymore — the harness drives
the exact same documents and datasets the recorded demo uses. The trailing
`POST /reset` restores the canonical pre-release snapshot regardless of
what this run created.

NINTH DEVIATION (Rule 1 bug, fixed in `backend/reset.py`, not this script):
`POST /reset` was failing with `{"status":"error"}` before this harness
could even take its first `/reset` reading — cognee's session/feedback
cache layer (`CACHING=true`) holds its own SQLite handle
(`.patchpilot_memory/databases/cache.db`) that `backend/reset.py`'s
Windows-safe handle-release sequence never closed, so
`scripts/snapshot_memory.restore()`'s `shutil.rmtree()` raised
`PermissionError: [WinError 32]`. Fixed by awaiting cognee's own
`close_cache_engine()` helper alongside the existing relational/vector/graph
releases. See `backend/reset.py`'s module docstring for the full trace.

Usage:
    .venv/Scripts/python.exe scripts/time_demo_loop.py
"""

import sys
import time

import requests

BASE_URL = "http://localhost:8000"
QUERY = "What is the fix for forgot password emails not sending?"
BUDGET_SECONDS = 120.0

# The REAL v1.9 release note (seed/README.md's before/after arc) — uploaded
# live so the harness exercises the exact ingest -> drift -> forget ->
# re-search loop the recorded demo performs, with the same document.
from pathlib import Path  # noqa: E402

_RELEASE_1_9_PATH = (
    Path(__file__).resolve().parent.parent / "seed" / "workarounds_v1_9" / "sendgrid-release.md"
)
RELEASE_1_9_CONTENT = _RELEASE_1_9_PATH.read_text()

INGEST_POLL_INTERVAL_SECONDS = 1.0
INGEST_POLL_TIMEOUT_SECONDS = 90.0


class LoopFailure(RuntimeError):
    """Raised with the failing step name so failures are unambiguous."""


def _post_json(path: str, payload: dict) -> dict:
    resp = requests.post(f"{BASE_URL}{path}", json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


def _get_json(path: str, params: dict | None = None) -> dict | list:
    resp = requests.get(f"{BASE_URL}{path}", params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def _timed_step(name: str, fn):
    start = time.perf_counter()
    result = fn()
    elapsed = time.perf_counter() - start
    print(f"{name}: {elapsed:.1f}s")
    return result, elapsed


def step_reset() -> None:
    data = _post_json("/reset", {})
    if data.get("status") != "reset":
        raise LoopFailure(f"reset: expected status=reset, got {data!r}")


def step_search_initial() -> dict:
    data = _post_json("/search", {"query": QUERY})
    if data.get("status") != "ok":
        raise LoopFailure(f"search (initial): expected status=ok, got {data!r}")
    return data


def step_upload_release() -> None:
    files = [("files", ("sendgrid-release.md", RELEASE_1_9_CONTENT, "text/markdown"))]
    form = {"content_type": "release_note", "release_version": "1_9"}
    resp = requests.post(f"{BASE_URL}/ingest", files=files, data=form, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "accepted":
        raise LoopFailure(f"ingest: expected status=accepted, got {data!r}")

    deadline = time.perf_counter() + INGEST_POLL_TIMEOUT_SECONDS
    while time.perf_counter() < deadline:
        status_data = _get_json("/ingest/status", {"dataset": "workarounds_v1_9"})
        if status_data.get("status") == "ready":
            return
        if status_data.get("status") == "failed":
            raise LoopFailure(f"ingest/status: dataset failed to process: {status_data!r}")
        time.sleep(INGEST_POLL_INTERVAL_SECONDS)
    raise LoopFailure("ingest/status: timed out waiting for workarounds_v1_9 to become ready")


def step_confirm_drift() -> None:
    datasets = _get_json("/datasets")
    by_name = {d["name"]: d for d in datasets}
    v1_8 = by_name.get("workarounds_v1_8")
    if v1_8 is None:
        raise LoopFailure("datasets: workarounds_v1_8 missing after release upload")
    if v1_8.get("drift_state") != "drifting":
        raise LoopFailure(
            f"datasets: expected workarounds_v1_8 drift_state=drifting after v1_9 "
            f"upload, got {v1_8.get('drift_state')!r}"
        )
    if not v1_8.get("drift_reason"):
        raise LoopFailure("datasets: workarounds_v1_8 is drifting but has no drift_reason")


def step_forget() -> None:
    data = _post_json("/forget", {"dataset": "workarounds_v1_8"})
    if data.get("status") != "forgotten":
        raise LoopFailure(f"forget: expected status=forgotten, got {data!r}")


def step_search_after_forget() -> dict:
    data = _post_json("/search", {"query": QUERY})
    if data.get("status") != "ok":
        raise LoopFailure(
            f"search (after forget): expected status=ok (B-01 -- re-search must survive "
            f"forget), got {data!r}"
        )
    datasets = _get_json("/datasets")
    names = {d["name"] for d in datasets}
    if "workarounds_v1_8" in names:
        raise LoopFailure("datasets: workarounds_v1_8 still present after forget")
    return data


def step_confirm_graph() -> dict:
    data = _get_json("/graph")
    nodes = data.get("nodes") if isinstance(data, dict) else None
    if not nodes:
        raise LoopFailure(f"graph: expected non-empty nodes, got {data!r}")
    return data


def main() -> int:
    print(f"PatchPilot demo loop timing harness -- query: {QUERY!r}")

    try:
        # Setup -- not counted in the DEMO-03 loop budget (demo operator's
        # one-click reset before the timed run starts).
        _, reset_elapsed = _timed_step("setup: reset", step_reset)
        print(f"  (setup reset not counted toward the {BUDGET_SECONDS:.0f}s budget)")

        loop_start = time.perf_counter()

        before, t1 = _timed_step("1: search (before release)", step_search_initial)
        print(f"  root_cause[:80]={before.get('root_cause', '')[:80]!r} "
              f"source_dataset={before.get('source_dataset')!r}")

        _, t2 = _timed_step("2: ingest release + poll until ready", step_upload_release)

        _, t3 = _timed_step("3: confirm drift badge", step_confirm_drift)

        _, t4 = _timed_step("4: forget", step_forget)

        after, t5 = _timed_step("5: re-search (after forget)", step_search_after_forget)
        print(f"  root_cause[:80]={after.get('root_cause', '')[:80]!r} "
              f"source_dataset={after.get('source_dataset')!r}")

        loop_total = time.perf_counter() - loop_start
        print(f"TOTAL: {loop_total:.1f}s (budget {BUDGET_SECONDS:.0f}s)")

        # Graph probe -- confirms Plan 03's GET /graph works too (the D-10
        # gate covers reset + graph, not just the search/drift/forget loop).
        # Not part of the timed loop budget.
        graph_data, t6 = _timed_step("6: confirm graph (not in budget)", step_confirm_graph)
        print(f"  graph nodes={len(graph_data['nodes'])} links={len(graph_data.get('links', []))}")

        if loop_total >= BUDGET_SECONDS:
            print(f"FAIL: loop took {loop_total:.1f}s, exceeding the {BUDGET_SECONDS:.0f}s budget")
            return 1

        if before.get("root_cause") == after.get("root_cause"):
            print("FAIL: root_cause did not change after the release upload + forget")
            return 1

        print(f"PASS: loop finished in {loop_total:.1f}s (< {BUDGET_SECONDS:.0f}s budget)")
        return 0

    except LoopFailure as exc:
        print(f"FAIL at step: {exc}")
        return 1
    except requests.RequestException as exc:
        print(f"FAIL: HTTP error talking to the backend at {BASE_URL}: {exc}")
        return 1
    finally:
        # Always leave memory in the canonical demo-ready state, regardless
        # of pass/fail (T-04-09 -- never leave memory in a forgotten/mutated
        # state).
        try:
            step_reset()
            print("cleanup: reset -> canonical demo snapshot restored")
        except Exception as exc:  # noqa: BLE001 - best-effort cleanup only
            print(f"WARNING: cleanup reset failed: {exc}")


if __name__ == "__main__":
    sys.exit(main())
