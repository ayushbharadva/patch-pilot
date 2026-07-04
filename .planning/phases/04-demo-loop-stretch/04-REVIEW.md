---
phase: 04-demo-loop-stretch
reviewed: 2026-07-03T13:37:25Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - backend/graph.py
  - backend/main.py
  - backend/reset.py
  - backend/search.py
  - backend/tests/test_search_helpers.py
  - frontend/app/page.tsx
  - frontend/components/DiagnosisCard.tsx
  - frontend/components/HealthDashboard.tsx
  - frontend/components/IncidentTimeline.tsx
  - frontend/components/MemoryGraphView.tsx
  - frontend/components/ResetButton.tsx
  - frontend/components/ui/dialog.tsx
  - frontend/lib/api.ts
  - frontend/package.json
  - scripts/time_demo_loop.py
  - seed/incidents/queue-backlog-incident.md
  - seed/workarounds_v1_8/dedup-monitoring-note.md
  - seed/workarounds_v1_9/idempotency-rollout-note.md
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-07-03T13:37:25Z
**Depth:** standard
**Files Reviewed:** 18 (`frontend/package-lock.json` excluded per lock-file filtering rule; scanned only for the version-consistency spot check noted below)
**Status:** issues_found

## Summary

Reviewed the demo-loop/stretch phase: `GET /graph` (new memory-graph export + aggregation), `POST /reset` (snapshot restore + Windows-safe handle release), the fused `/search` endpoint's STRETCH-01 confidence/verbose-evidence additions, the new `HealthDashboard`/`IncidentTimeline`/`MemoryGraphView`/`ResetButton` frontend components, `lib/api.ts`'s new `getMemoryGraph`/`resetMemory` wrappers, the timing harness script, and the seed content/tests.

The search-fusion logic (`_pick_primary_result`, `_flatten_and_truncate`, `_confidence_from_results`, `_is_ungrounded_answer`) is well covered by unit tests and traced cleanly through several edge cases (empty chunks, legacy vs. verbose evidence shape, out-of-range confidence scores). However, two reachable defects were found that can take down or visibly break the demo this phase exists to make bulletproof:

1. `POST /reset` can crash the entire backend process (not just fail the request) when the demo snapshot tarball is missing, because `scripts/snapshot_memory.restore()` calls `sys.exit(1)` in that case and `SystemExit` is not caught by `backend/reset.py`'s `except Exception:` guard — and `SystemExit`/`BaseException` are specifically *not* swallowed by asyncio's task machinery, so they propagate and kill the running event loop / uvicorn worker.
2. `GET /graph`'s success and error response shapes are asymmetric (success omits `status`, error uses `status: "error"` with HTTP 200), and `frontend/lib/api.ts`'s `getMemoryGraph()` never checks for the error shape — so any backend exception during graph aggregation renders as a client-side crash (`data.nodes` is `undefined`) instead of the intended graceful error state.

## Critical Issues

### CR-01: `POST /reset` can crash the entire backend process when the demo snapshot is missing

**File:** `backend/reset.py:95-101` (in combination with `scripts/snapshot_memory.py:58-62`)

**Issue:** `reset_memory()` wraps its whole body in `try/except Exception:` (the documented D-24 "never leak raw exception text" pattern) and then calls `snapshot_memory.restore()` unguarded:

```python
from scripts import snapshot_memory

snapshot_memory.restore()
return {"status": "reset"}
except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
```

`snapshot_memory.restore()` (`scripts/snapshot_memory.py:58-62`) is written as a CLI script and calls `sys.exit(1)` — not `raise` — when no snapshot tarball exists yet:

```python
def restore() -> None:
    if not snapshot_exists():
        print(f"No snapshot found at {SNAPSHOT_PATH}. Run --save first (after a successful --seed).")
        sys.exit(1)
```

`sys.exit()` raises `SystemExit`, which subclasses `BaseException`, **not** `Exception`. `except Exception:` in `reset.py` therefore does not catch it. Because this runs inside an `asyncio`-driven request handler under uvicorn, `SystemExit`/`KeyboardInterrupt` are deliberately *not* swallowed by asyncio's exception handling (this is intentional asyncio behavior so that a genuine interpreter shutdown signal isn't silently absorbed) — the exception propagates out of the task and terminates the running event loop, i.e. the entire single-worker backend process goes down. Starlette's own `ServerErrorMiddleware` also only catches `Exception`, so nothing upstream of `reset.py` catches this either.

This is directly reachable any time `patchpilot_memory.snapshot.tar` doesn't exist yet — a fresh clone before the first `--seed && --save`, a CI environment, or any setup where the gitignored snapshot file was deleted or never created. Clicking "Reset Demo" in that state doesn't just fail gracefully with `_MSG_ERROR`; it kills the whole server, requiring a manual `uvicorn` restart mid-demo.

**Fix:** Either broaden the reset handler's guard to catch `SystemExit` explicitly, or (preferred) stop using a CLI-style `sys.exit()` inside a function that a web server also calls — have `snapshot_memory.restore()` raise a normal exception (e.g. `FileNotFoundError`) instead, and let the CLI entry point (`main()`) translate that into `sys.exit(1)` only when invoked from the command line:

```python
# scripts/snapshot_memory.py
def restore() -> None:
    if not snapshot_exists():
        raise FileNotFoundError(
            f"No snapshot found at {SNAPSHOT_PATH}. Run --save first (after a successful --seed)."
        )
    ...

def main() -> int:
    ...
    try:
        if args.save:
            save()
        else:
            restore()
    except FileNotFoundError as exc:
        print(exc)
        return 1
    return 0
```

```python
# backend/reset.py
    try:
        ...
        snapshot_memory.restore()
        return {"status": "reset"}
    except (Exception, SystemExit):  # noqa: BLE001 - D-24, and never let a CLI-style
        # sys.exit() inside snapshot_memory kill the whole server process.
        logger.exception("reset failed")
        return {"status": "error", "message": _MSG_ERROR}
```

### CR-02: `GET /graph` error response is invisible to the frontend — causes an uncaught crash instead of a graceful error state

**File:** `backend/graph.py:94-96`, `frontend/lib/api.ts:401-407`, `frontend/components/MemoryGraphView.tsx:96`

**Issue:** `get_memory_graph()`'s success path returns `{"nodes": [...], "links": [...]}` with **no** `status` key, but its `except` path returns `{"status": "error", "message": _MSG_ERROR}` — both with HTTP 200:

```python
except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
    logger.exception("graph export failed")
    return {"status": "error", "message": _MSG_ERROR}
```

Unlike `search.py`, `reset.py`, and `forget.py` (whose frontend wrappers all handle a `status: "error"` variant as part of the typed response union), `frontend/lib/api.ts`'s `getMemoryGraph()` has no error variant in `GraphData` and never inspects the parsed body — it only checks `res.ok`:

```ts
export async function getMemoryGraph(): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/graph`);
  if (!res.ok) {
    throw new Error("Could not load memory graph.");
  }
  return (await res.json()) as GraphData;
}
```

Since the backend error path still returns HTTP 200, `res.ok` is `true`, so `getMemoryGraph()` happily returns `{status: "error", message: ...}` cast as `GraphData`. `MemoryGraphView.tsx` then evaluates `data && data.nodes.length > 0` — `data.nodes` is `undefined`, so `.length` throws a `TypeError` during render. `isError` from `useQuery` never fires (the fetch itself "succeeded"), so the component never reaches its intended error branch (`"Could not load memory graph. Please try again."`) — the graph tab crashes instead of degrading gracefully, defeating the entire point of the D-24 short-human-message contract for this endpoint.

This is reachable any time the private-API-heavy aggregation path in `graph.py` (`aggregate_multi_user_graphs`, `get_authorized_existing_datasets`, etc.) throws for any reason.

**Fix:** Make `getMemoryGraph()` detect and normalize the error shape, mirroring `searchIncident`/`resetMemory`:

```ts
export type GraphResponse =
  | { status?: undefined; nodes: GraphNode[]; links: GraphLink[] }
  | { status: "error"; message: string };

export async function getMemoryGraph(): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/graph`);
  if (!res.ok) throw new Error("Could not load memory graph.");
  const data = (await res.json()) as GraphResponse;
  if ("status" in data && data.status === "error") {
    throw new Error(data.message);
  }
  return data;
}
```

or simpler: have `backend/graph.py`'s success path also emit `"status": "ok"` and have `getMemoryGraph()` throw whenever `status === "error"`, exactly like `listDatasets()`/other wrappers already do.

## Warnings

### WR-01: Graph edge `label` not coerced to string, unlike node `id`/`label`

**File:** `backend/graph.py:88-92`

**Issue:** Node fields are explicitly stringified (`"id": str(node_id)`, `_node_label(...)` returns `str(...)`), but edge labels are passed through as-is:

```python
"links": [
    {"source": str(edge[0]), "target": str(edge[1]), "label": edge[2]}
    for edge in edges
    if len(edge) >= 3
],
```

`frontend/lib/api.ts`'s `GraphLink.label` is typed as `string` (non-nullable), and `MemoryGraphView.tsx` passes `linkLabel="label"` straight to `react-force-graph-3d`. If `aggregate_multi_user_graphs` ever returns a non-string third element (e.g. `None`, an enum, or a dict describing the relationship), the TypeScript contract is silently violated and the graph library receives an unexpected value for hover labels.

**Fix:** `"label": str(edge[2]) if edge[2] is not None else ""` for parity with the node-label handling above it.

### WR-02: Heavy reliance on private/internal Cognee APIs with zero test coverage

**File:** `backend/graph.py:62-74`, `backend/reset.py:69-93`

**Issue:** Both modules reach into non-public Cognee internals (`cognee.modules.visualization.cognee_network_visualization.aggregate_multi_user_graphs`, `cognee.modules.data.methods.get_authorized_existing_datasets`, `cognee.infrastructure.databases.graph.get_graph_engine._create_graph_engine`, `cognee.infrastructure.databases.vector.create_vector_engine._create_vector_engine`, `cognee.infrastructure.databases.cache.get_cache_engine.close_cache_engine`). The module docstrings acknowledge this is a deliberate, researched trade-off, but `backend/tests/` only covers `search.py`'s pure helpers — there is no unit or integration test asserting `/graph` or `/reset` still work against the pinned `cognee==1.2.2`, so a future dependency bump (or even a patch release) can silently break either endpoint with no CI signal, only discoverable live during a demo rehearsal.

**Fix:** At minimum, add a smoke test that imports each of these private symbols at collection time (fails fast on an API rename) or a mocked-Cognee integration test that exercises `get_memory_graph()`/`reset_memory()`'s happy path.

### WR-03: `sys.path` / CORS header allowlist broader than necessary

**File:** `backend/main.py:56-62`

**Issue:** `CORSMiddleware` correctly restricts `allow_origins` to a single explicit origin (matches project convention), but pairs it with `allow_headers=["*"]` and `allow_credentials=True`. This is lower risk than a wildcard origin, but it's inconsistent with the project's stated least-privilege posture ("never a wildcard... a real security risk") and allows any request header through for a credentialed cross-origin request.

**Fix:** Restrict to the headers actually sent by the frontend (`Content-Type` is the only custom header used by `frontend/lib/api.ts`): `allow_headers=["Content-Type"]`.

### WR-04: Version-parsing regex and drift-label copy duplicated across three+ locations with no shared source of truth

**File:** `backend/search.py:47` (`_WORKAROUNDS_VERSION_RE`), `frontend/components/DiagnosisCard.tsx:32`, `frontend/components/IncidentTimeline.tsx:12`; `DRIFT_LABEL` duplicated in `frontend/components/HealthDashboard.tsx:12-16` and `frontend/components/IncidentTimeline.tsx:17-21`

**Issue:** The `^workarounds_v(\d+)(?:_(\d+))?$` regex is independently re-implemented in Python (backend) and twice in TypeScript (frontend), and the `DriftState -> emoji label` map is copy-pasted verbatim between `HealthDashboard.tsx` and `IncidentTimeline.tsx`. Each copy is commented as an intentional, acknowledged duplication, but that doesn't remove the maintenance risk: if the version-tag format or drift-state vocabulary ever changes, it's easy to update one copy and miss another, producing a silent display inconsistency between the search result badge, the health dashboard, and the incident timeline.

**Fix:** Extract a single shared `frontend/lib/version.ts` (regex + label helpers) and import it from all three frontend components; the backend regex can stay separate since Python/TS can't share source, but consider a shared test asserting the two patterns stay in sync.

## Info

### IN-01: Truncated node labels have no truncation indicator

**File:** `backend/graph.py:36-43`

**Issue:** `_node_label` truncates to `_LABEL_MAX` (80) characters with a plain slice (`str(raw)[:_LABEL_MAX]`), unlike `backend/search.py`'s `_flatten_and_truncate`, which appends `"…"` when it truncates an evidence excerpt. A long node name silently loses its tail with no visual cue that it was cut off.

**Fix:** `label = str(raw); return label if len(label) <= _LABEL_MAX else label[:_LABEL_MAX].rstrip() + "…"` for consistency with the excerpt-truncation convention already established in `search.py`.

### IN-02: Evidence-limit magic number duplicated between backend and frontend

**File:** `backend/search.py:42` (`EVIDENCE_LIMIT = 3`), `frontend/components/DiagnosisCard.tsx:18` (`EVIDENCE_DISPLAY_LIMIT = 3`)

**Issue:** Both constants are cross-referenced in comments but are two independently maintained literals. Since the backend already caps evidence at 3 server-side, the frontend's `.slice(0, EVIDENCE_DISPLAY_LIMIT)` is currently a no-op safety net; if the two values ever diverge, `DiagnosisCard` would silently truncate evidence the backend intended to show (or vice versa).

**Fix:** No code change strictly required (the frontend clamp is a reasonable defensive default even if backend behavior changes), but worth a shared comment or a documented contract test to keep the two literals honest.

---

_Reviewed: 2026-07-03T13:37:25Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
