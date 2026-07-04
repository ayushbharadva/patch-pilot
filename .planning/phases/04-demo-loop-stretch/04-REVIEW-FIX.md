---
phase: 04-demo-loop-stretch
fixed_at: 2026-07-03T14:00:13Z
review_path: .planning/phases/04-demo-loop-stretch/04-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-07-03T14:00:13Z
**Source review:** .planning/phases/04-demo-loop-stretch/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (2 critical, 4 warning; fix_scope = critical_warning, Info findings excluded)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: `POST /reset` can crash the entire backend process when the demo snapshot is missing

**Files modified:** `scripts/snapshot_memory.py`, `backend/reset.py`
**Commit:** `a5006e3`
**Applied fix:** `snapshot_memory.restore()` now raises `FileNotFoundError` (a normal `Exception` subclass) instead of calling `sys.exit(1)`; `main()` translates that back into `sys.exit(1)` for CLI use. `backend/reset.py`'s guard now also catches `SystemExit` explicitly as defense-in-depth, so any future CLI-style `sys.exit()` reintroduced anywhere in the call chain degrades to the D-24 error response instead of killing the uvicorn worker.

### CR-02: `GET /graph` error response is invisible to the frontend

**Files modified:** `backend/graph.py`, `frontend/lib/api.ts`
**Commit:** `25090c5`
**Applied fix:** `backend/graph.py`'s success path (both the empty-datasets early return and the populated-graph return) now emits `"status": "ok"`, giving it a discriminant against the existing `"status": "error"` error path. `frontend/lib/api.ts`'s `getMemoryGraph()` now parses the response as a `GraphOkResponse | GraphErrorResponse` union and throws on the error shape, mirroring the `resetMemory`/`searchIncident`/`listDatasets` conventions already established elsewhere in the file. `MemoryGraphView.tsx` needed no changes — its `isError` branch was already correct and simply wasn't being reached before this fix.

### WR-01: Graph edge `label` not coerced to string

**Files modified:** `backend/graph.py`
**Commit:** `00a4048`
**Applied fix:** Edge `label` is now `str(edge[2]) if edge[2] is not None else ""`, matching the existing string coercion already applied to node `id`/`label`.

### WR-02: Heavy reliance on private/internal Cognee APIs with zero test coverage

**Files modified:** `backend/tests/test_private_api_imports.py` (new file)
**Commit:** `ba472e3`
**Applied fix:** Added a collection-time smoke test importing every private Cognee symbol `backend/graph.py` and `backend/reset.py` depend on (`aggregate_multi_user_graphs`, `get_authorized_existing_datasets`, `get_default_user`, `close_cache_engine`, `_create_graph_engine`, `_create_vector_engine`, `create_relational_engine`, `get_relational_engine`) and asserts each is callable (and that the two `lru_cache`-wrapped factories still expose `cache_clear`). No live Cognee calls are made — no network, no LLM cost — so a future dependency bump that renames or removes any of these symbols now fails fast in CI. Verified locally: `25 passed` in the full `backend/tests/` pure-unit + new smoke suite via the project venv.

### WR-03: CORS header allowlist broader than necessary

**Files modified:** `backend/main.py`
**Commit:** `7aa7f0c`
**Applied fix:** `allow_headers` narrowed from `["*"]` to `["Content-Type"]` — confirmed via grep that `frontend/lib/api.ts` never sends any other custom header.

### WR-04: Version-parsing regex and drift-label copy duplicated across components

**Files modified:** `frontend/lib/version.ts` (new file), `frontend/components/DiagnosisCard.tsx`, `frontend/components/IncidentTimeline.tsx`, `frontend/components/HealthDashboard.tsx`
**Commit:** `9f280d4`
**Applied fix:** Extracted `WORKAROUNDS_VERSION_RE`, `versionTagFromDataset()`, and `DRIFT_LABEL` into a new `frontend/lib/version.ts` and updated all three components to import from it instead of maintaining independent copies. `backend/search.py`'s Python regex is left as-is (Python/TS can't share source), per the review's own scoping. Full-project `tsc --noEmit` reported zero errors after the refactor.

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-07-03T14:00:13Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
