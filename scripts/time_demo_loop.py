#!/usr/bin/env python3
"""Loop timing harness + demo script of record (DEMO-03 / D-01 / D-02).

This is the demo script of record. It drives the RUNNING backend over real
HTTP (the cognee package is never imported here — this measures the real
network path a browser takes, per `frontend/lib/api.ts`'s exact endpoint
payloads), timing the full search -> release upload -> drift badge ->
forget -> re-search loop and asserting it lands under 120 seconds
(DEMO-03).

Canonical query: "customers double-charged" (locked in 01-03-PLAN.md; the
Stripe arc, absent from decoy incidents).

DEVIATION FROM THE PLAN'S LITERAL v1_8 -> v1_9 SCRIPT (Rule 1 — found
live-testing this task): 04-01-PLAN.md enriched the seed corpus so
`seed_cli.py --seed` ingests BOTH `workarounds_v1_8` AND `workarounds_v1_9`
from the start (not just v1_8) — verified live: immediately after a fresh
`POST /reset`, `GET /datasets` already shows `workarounds_v1_8` as
`"drifting"` and `workarounds_v1_9` as `"stable"`, and `POST /search`
already answers with the v1.9 `idempotency_guard` fix. The release-upload
step this plan's task description imagined (a fresh `workarounds_v1_9`
being created live, flipping v1_8 to drifting for the first time) already
happened at seed/snapshot time, not during the timed demo — this matches
`.planning/STATE.md`'s Key Decisions ("root-cause flip happens at
drift-detection/release-upload time, not forget time"), which Phase 3
already validated live with exactly this baked-in-corpus shape. There is no
way to reach a genuine "before v1_9 exists" state through the public HTTP
API: `POST /forget` refuses to forget the current non-drifting highest
version by design (CR-02 guard, `backend/forget.py`), and this harness
deliberately stays HTTP-only rather than reaching for cognee's internals to
bypass that guard.

To still genuinely exercise EVERY piece of the named loop — a LIVE release
upload that flips a dataset from stable to drifting, not just a rehash of a
transition that already happened — this harness uploads a NEW release,
`workarounds_v1_10` (a distinct, isolated fabricated "hardening" note, safe
per the Cognee #1023 entity-isolation rule), which makes the *previously
stable* `workarounds_v1_9` become the newly-drifting dataset the moment it
finishes cognifying. The harness then forgets `workarounds_v1_9` and
re-searches, proving the exact same code paths (ingest -> drift
classification -> forget guard -> re-search-survives-forget) the plan's
v1_8/v1_9 narrative describes, just shifted one version up because v1_8's
transition is already baked into the reset snapshot. `workarounds_v1_8`
itself is left untouched throughout (still drifting throughout, as it is at
every reset) — the harness's own trailing `POST /reset` restores the
canonical demo snapshot regardless of what this run created.

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
QUERY = "customers double-charged"
BUDGET_SECONDS = 120.0

# A fresh, isolated "hardening" release — distinct entity name
# (webhook_dedup_lock) from every existing seed doc, so it cannot leak
# across datasets or collide with the incidents/workarounds_v1_8/
# workarounds_v1_9 corpus (Cognee #1023 mitigation, 01-03-PLAN.md rule).
RELEASE_1_10_CONTENT = """# Release 1.10 -- idempotency_guard hardening

The v1.9 idempotency_guard fix for duplicate Stripe webhook charges has been
hardened in this release. A new distributed lock, webhook_dedup_lock, now
guarantees exactly-once order creation even under concurrent webhook
retries across multiple app instances, closing a narrow race window
idempotency_guard alone could not cover. idempotency_guard is superseded by
webhook_dedup_lock; no manual workaround is required.
"""

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
    files = [("files", ("release-1_10.md", RELEASE_1_10_CONTENT, "text/markdown"))]
    form = {"content_type": "release_note", "release_version": "1_10"}
    resp = requests.post(f"{BASE_URL}/ingest", files=files, data=form, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "accepted":
        raise LoopFailure(f"ingest: expected status=accepted, got {data!r}")

    deadline = time.perf_counter() + INGEST_POLL_TIMEOUT_SECONDS
    while time.perf_counter() < deadline:
        status_data = _get_json("/ingest/status", {"dataset": "workarounds_v1_10"})
        if status_data.get("status") == "ready":
            return
        if status_data.get("status") == "failed":
            raise LoopFailure(f"ingest/status: dataset failed to process: {status_data!r}")
        time.sleep(INGEST_POLL_INTERVAL_SECONDS)
    raise LoopFailure("ingest/status: timed out waiting for workarounds_v1_10 to become ready")


def step_confirm_drift() -> None:
    datasets = _get_json("/datasets")
    by_name = {d["name"]: d for d in datasets}
    v1_9 = by_name.get("workarounds_v1_9")
    if v1_9 is None:
        raise LoopFailure("datasets: workarounds_v1_9 missing after release upload")
    if v1_9.get("drift_state") != "drifting":
        raise LoopFailure(
            f"datasets: expected workarounds_v1_9 drift_state=drifting after v1_10 "
            f"upload, got {v1_9.get('drift_state')!r}"
        )
    if not v1_9.get("drift_reason"):
        raise LoopFailure("datasets: workarounds_v1_9 is drifting but has no drift_reason")


def step_forget() -> None:
    data = _post_json("/forget", {"dataset": "workarounds_v1_9"})
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
    if "workarounds_v1_9" in names:
        raise LoopFailure("datasets: workarounds_v1_9 still present after forget")
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
