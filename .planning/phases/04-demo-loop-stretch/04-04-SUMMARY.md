---
phase: 04-demo-loop-stretch
plan: 04
subsystem: testing
tags: [cognee, fastapi, timing-harness, demo-script, drift, forget, reset]

# Dependency graph
requires:
  - phase: 04-demo-loop-stretch
    provides: POST /reset snapshot restore (Plan 02) + enriched cognified corpus (Plan 01)
  - phase: 04-demo-loop-stretch
    provides: GET /graph real Cognee knowledge graph export (Plan 03)
provides:
  - "scripts/time_demo_loop.py — HTTP-only timing harness + demo script of record; measures the live search -> release upload -> drift badge -> forget -> re-search loop end to end"
  - "A fixed, working POST /reset (backend/reset.py now also closes cognee's session/feedback cache-engine handle before the snapshot filesystem swap)"
  - "Live-measured proof: full loop 57.2s (< 120s budget, DEMO-03); GET /graph confirmed (141 nodes / 272 links) as part of the same gate"
affects: [demo-script, final-submission, stretch-plans-05-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Timing harness stays HTTP-only (requests library against the running :8000 backend) — never imports cognee — so it measures the exact network path a browser demo takes, matching frontend/lib/api.ts's payloads"
    - "cognee's own close_cache_engine() helper (dispose + lru_cache clear) is the sanctioned way to release its session/feedback SQLite cache handle — same shape as the existing relational/vector/graph engine releases in backend/reset.py"

key-files:
  created:
    - scripts/time_demo_loop.py
  modified:
    - backend/reset.py

key-decisions:
  - "backend/reset.py bug (Rule 1, found live before the harness could even take its first reading): POST /reset was returning {\"status\":\"error\"} on every call. cognee's session/feedback cache layer (CACHING=true) opens its own SQLite handle (databases/cache.db) that the existing Windows-safe handle-release sequence never closed, so shutil.rmtree() raised PermissionError: [WinError 32]. Fixed by awaiting cognee's own close_cache_engine() before the relational engine dispose. Verified: /reset now returns {\"status\":\"reset\"} reliably, confirmed across 2 consecutive harness runs plus a standalone curl."
  - "Adapted the harness's release-upload step (Rule 1, not an app bug): 04-01-PLAN.md's enriched seed corpus ingests BOTH workarounds_v1_8 AND workarounds_v1_9 at seed/snapshot time, so immediately after POST /reset, workarounds_v1_8 is ALREADY drifting and /search ALREADY answers with the v1.9 fix — there is no v1_8-only 'before' state reachable over the public HTTP API (POST /forget's CR-02 guard correctly refuses to forget the current non-drifting highest version, and the harness must not import cognee to bypass it). The harness instead drives a LIVE workarounds_v1_9 -> workarounds_v1_10 transition (a fresh, isolated 'hardening' release note, safe per the Cognee #1023 entity-isolation rule), exercising the identical ingest -> drift-classify -> forget-guard -> re-search-survives-forget code paths, then restores the canonical snapshot via a trailing POST /reset regardless of pass/fail (T-04-09)."
  - "Harness treats the setup POST /reset and the trailing GET /graph probe as outside the 120s DEMO-03 budget (matching the plan's framing: reset is demo-operator setup, graph is a separate D-10 gate check, not part of the timed search/drift/forget loop)."

requirements-completed: [DEMO-03]

coverage:
  - id: D1
    description: "scripts/time_demo_loop.py exists, never imports cognee, and drives /reset -> search -> ingest release -> /datasets drift -> /forget -> re-search -> /graph over real HTTP, asserting TOTAL < 120s"
    requirement: "DEMO-03"
    verification:
      - kind: unit
        ref: "static AST + substring check -> printed HARNESS_SHAPE_OK"
        status: pass
      - kind: e2e
        ref: ".venv/Scripts/python.exe scripts/time_demo_loop.py against the live :8000 backend -> exit 0, TOTAL 57.2s, re-search status ok post-forget (B-01 confirmed), workarounds_v1_9 absent, GET /graph 141 nodes / 272 links"
        status: pass
    human_judgment: false
  - id: D2
    description: "The recorded on-screen browser loop (search -> drift badge -> Forget -> re-search) is under 120s with the visible dataset-row-vanish + drift-flip proof; Reset button and Graph tab both work on camera"
    requirement: "DEMO-03"
    verification: []
    human_judgment: true
    rationale: "No headless-browser interaction tooling (playwright/chromium-cli) is installed in this Windows environment (same constraint documented in 04-02-SUMMARY and 04-03-SUMMARY) — recording a real on-screen demo video requires a human operator with a browser and screen-capture tool. The backend-side proof (timed HTTP loop, drift transition, forget-survives-search, graph export) is fully automated and passing (D1); this item is the human capture of that same proof for the submission video."

# Metrics
duration: 25min
completed: 2026-07-03
status: complete
---

# Phase 4 Plan 4: Demo Loop Timing Harness + Reset Fix Summary

**scripts/time_demo_loop.py — an HTTP-only timing harness (and demo script of record) that drives the live backend through search → release upload → drift badge → forget → re-search, measuring 57.2s total (well under the 120s DEMO-03 budget) and confirming GET /graph in the same run; along the way, fixed a real POST /reset regression (cognee's session-cache SQLite handle was never released before the snapshot filesystem swap) that was blocking the very first step of the loop.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-07-03
- **Tasks:** 1 (plus 1 auto-fixed blocking bug found before the task could complete)
- **Files:** 1 created, 1 modified

## Accomplishments

- **Diagnosed and fixed a live `POST /reset` regression** blocking the harness's very first step: cognee's session/feedback cache engine (`CACHING=true`) holds its own SQLite handle (`.patchpilot_memory/databases/cache.db`) that `backend/reset.py`'s existing Windows-safe handle-release sequence never closed, so `shutil.rmtree()` raised `PermissionError: [WinError 32]` on every reset attempt. Root-caused by restarting the backend with output redirected to a log file (no other way to see uvicorn's traceback in this environment) and reading the exact failing path. Fixed with cognee's own `close_cache_engine()` helper, mirroring the existing relational/vector/graph release pattern.
- **Built `scripts/time_demo_loop.py`** — a standalone, dependency-light (`requests` only, no `cognee` import) timing harness that exercises every endpoint a browser demo would: `/reset`, `/search`, `/ingest` + `/ingest/status` polling, `/datasets`, `/forget`, and `/graph`. Prints per-step wall-clock timings and a `TOTAL`, asserting it stays under the 120s DEMO-03 budget, and always ends with a cleanup `/reset` (pass or fail) so memory is never left mutated.
- **Discovered and worked around a corpus-shape mismatch** between the plan's literal script (assumed a v1_8-only "before release" state) and the real, already-enriched seed corpus (both `workarounds_v1_8` and `workarounds_v1_9` are seeded together, so `v1_8` is drifting from the moment of `/reset`). Adapted the harness to drive a genuine live `workarounds_v1_9 -> workarounds_v1_10` transition instead, exercising the exact same ingest→drift→forget→re-search code paths without fighting the `/forget` CR-02 guard or reaching for cognee internals.
- **Measured and recorded the live result:** `TOTAL: 57.2s` (well inside the 120s budget), re-search after forget returns `status: ok` with a new answer (B-01 — re-search survives forget — reconfirmed in the timed HTTP path), `workarounds_v1_9` absent from `/datasets` afterward, and `GET /graph` returns 141 nodes / 272 links in the same run.

## Task Commits

1. **[Deviation, Rule 1] Fix `POST /reset` cache-engine handle leak** — `b979fc7` (fix)
2. **Task 1: Loop timing harness + demo script of record (DEMO-03 / D-01 / D-02)** — `8ac0bde` (feat)

**Plan metadata commit:** pending (this commit).

## Files Created/Modified

- `backend/reset.py` — added `await close_cache_engine()` (imported from `cognee.infrastructure.databases.cache.get_cache_engine`) before the existing relational/vector/graph handle releases, closing the gap that caused `PermissionError: [WinError 32]` on `cache.db`.
- `scripts/time_demo_loop.py` — NEW. HTTP-only timing harness / demo script of record: reset (setup, untimed) → search → ingest release + poll → confirm drift → forget → re-search → assert `TOTAL < 120s` → probe `/graph` (untimed) → cleanup reset (always runs, even on failure).

## Decisions Made

- See `key-decisions` in frontmatter above for the two substantive calls (the `reset.py` bug fix and the v1_9→v1_10 harness adaptation) with full rationale.
- Harness restores the canonical demo snapshot via a trailing `POST /reset` in a `finally` block, regardless of pass/fail, so a failed run never leaves the demo corpus mutated (T-04-09).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `POST /reset` failing on every call — cognee's cache-engine SQLite handle never released**
- **Found during:** Task 1, before the harness could even complete its first `/reset` call.
- **Issue:** `backend/reset.py` disposed the relational engine and cleared the vector/graph engine caches (04-RESEARCH.md Pattern 4), but never closed cognee's separate session/feedback cache engine (`CACHING=true` opens `.patchpilot_memory/databases/cache.db` via `cognee.infrastructure.databases.cache.get_cache_engine`). `shutil.rmtree()` in `scripts/snapshot_memory.restore()` then raised `PermissionError: [WinError 32]` against that still-open file, and `POST /reset` returned `{"status":"error"}` unconditionally. This cache engine wasn't enumerated by 04-RESEARCH.md's original Pattern 4 handle audit.
- **Fix:** Restarted the backend with stdout/stderr redirected to a log file (the only way to see uvicorn's traceback in this non-interactive environment), read the exact failing line, then added `await close_cache_engine()` (cognee's own sanctioned dispose+cache-clear helper) to `backend/reset.py`, called first in the Windows-safe release order.
- **Files modified:** `backend/reset.py`.
- **Verification:** Restarted backend with the fix; `curl -X POST /reset` → `{"status":"reset"}`; ran the harness twice consecutively, both exiting 0 with a clean reset at the start and end of each run.
- **Committed in:** `b979fc7`.

**2. [Rule 1 - Adapted script, not an app bug] Release-upload step rewritten from v1_8/v1_9 to v1_9/v1_10**
- **Found during:** Task 1, while designing the harness's step 2 (release upload) against the live baseline.
- **Issue:** The plan's literal script assumed `POST /reset` restores a state with only `workarounds_v1_8` present, and that uploading a `workarounds_v1_9` release note live during the harness run would be what first triggers `v1_8`'s drift. Live testing showed 04-01's enriched seed corpus already ingests both `workarounds_v1_8` and `workarounds_v1_9` at seed/snapshot time — immediately after `/reset`, `v1_8` is already `"drifting"` and `/search` already answers with the v1.9 fix. There is no v1_8-only "before" state reachable through the public API: `POST /forget`'s CR-02 guard correctly refuses to forget the current non-drifting highest version, and the harness is required to stay HTTP-only (no `cognee` import) so it cannot bypass that guard either.
- **Fix:** Adapted the harness to upload a new, isolated `workarounds_v1_10` "hardening" release note instead, which makes the previously-stable `workarounds_v1_9` become the newly-drifting dataset live during the run. The harness then forgets `workarounds_v1_9` and re-searches — exercising the identical ingest→drift-classify→forget-guard→re-search-survives-forget code paths the plan describes, just shifted one version because the v1_8→v1_9 transition is already baked into the reset snapshot.
- **Files modified:** `scripts/time_demo_loop.py` (this is the file the plan asked for; the adaptation is documented in its own module docstring for future readers).
- **Verification:** Live run: `workarounds_v1_9` correctly flips to `"drifting"` with a real generated `drift_reason` after the v1_10 upload; `/forget` accepts it; re-search returns a new answer sourced from `workarounds_v1_10`; `workarounds_v1_9` is absent from `/datasets` afterward.
- **Committed in:** `8ac0bde`.

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug in previously-shipped code blocking this task, 1 Rule 1 script adaptation to match the real, already-validated corpus shape).
**Impact on plan:** Both were necessary for the harness's core assertions (`POST /reset` succeeding at all; a genuine live drift transition) to be true, not superficially green. No architectural changes, no scope creep — the reset fix is a 4-line addition mirroring an existing pattern, and the harness still measures the exact same conceptual loop (search → release upload → drift → forget → re-search) the plan asked for.

## Issues Encountered

- No log file existed for the running backend, and the harness's first HTTP call to `/reset` returned only a generic `{"status":"error"}` per the D-24 no-raw-exception-text convention — had to restart the backend with stdout/stderr redirected to a scratch log file to see the actual traceback and pin down the cache-engine handle. Backend was restarted twice total during this plan (once to capture the traceback, once to load the fix); left running and healthy both times, `.patchpilot_memory/` never touched directly.
- No headless-browser interaction tooling (playwright/chromium-cli) is installed in this Windows environment (same constraint as every prior Phase 4 plan) — the human-facing "record the on-screen browser loop" verification step (D2 in coverage above) could not be automated and is flagged `human_judgment: true`.

## User Setup Required

None — no external service configuration. Operational note: both dev servers (`:8000`, `:3000`) were left running and healthy after this plan; `:8000` was restarted twice during this plan's execution (to diagnose, then to load, the `backend/reset.py` fix) and is confirmed healthy (`GET /health/cognee` → `{"status":"ok"}`, `GET /datasets` → 3 datasets in the canonical demo state, `GET /graph` → 200).

## Next Phase Readiness

- **D-10 gate is GREEN:** the full search→drift→forget→re-search loop is automated-and-measured at 57.2s (well under the 120s DEMO-03 budget), `POST /reset` works reliably (after the fix), and `GET /graph` is confirmed live in the same run — Plans 05 and 06 (stretch) are unblocked.
- Before the final submission video: a human should record the on-screen browser loop once (search → drift badge → Forget → re-search), click through the Reset button, and switch to the Graph tab — the one open `human_judgment: true` item (D2), consistent with the same open item carried from 04-02-SUMMARY and 04-03-SUMMARY.
- `backend/reset.py`'s cache-engine fix benefits every future plan that calls `/reset` (Plans 05/06 stretch features, and the eventual submission demo itself) — this was a real, previously-undetected regression, not specific to the harness.

---
*Phase: 04-demo-loop-stretch*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: scripts/time_demo_loop.py
- FOUND: .planning/phases/04-demo-loop-stretch/04-04-SUMMARY.md
- FOUND commit: b979fc7 (fix — reset.py cache-engine fix)
- FOUND commit: 8ac0bde (feat — Task 1 harness)
- FOUND commit: 22f5ffe (docs — summary)
