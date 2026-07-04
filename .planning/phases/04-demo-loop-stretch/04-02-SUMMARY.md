---
phase: 04-demo-loop-stretch
plan: 02
subsystem: infra
tags: [fastapi, cognee, nextjs, react-query, shadcn, radix-dialog, windows-file-locking]

# Dependency graph
requires:
  - phase: 04-demo-loop-stretch
    provides: enriched 11-doc corpus + fresh patchpilot_memory.snapshot.tar (Plan 01) as the restore target
provides:
  - "POST /reset endpoint: Windows-safe engine-handle release (relational dispose + vector/graph cache_clear) then scripts/snapshot_memory.restore()"
  - "One-click modal-guarded Reset Demo button with visible in-flight state, wired into page.tsx"
  - "resetMemory() typed API wrapper in frontend/lib/api.ts"
  - "First shadcn/Radix Dialog primitive in this codebase (frontend/components/ui/dialog.tsx)"
affects: [04-03-memory-graph, demo-script, final-submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reset-endpoint engine-release order: get_relational_engine().engine.dispose() -> create_relational_engine.cache_clear() -> _create_vector_engine.cache_clear() -> _create_graph_engine.cache_clear() -> THEN filesystem swap -- the relational SQLAlchemy engine dispose is the step cognee's own prune_system() omits and Windows requires"
    - "Destructive-action UX now has two coexisting patterns by design: DatasetList's ForgetButton uses an inline two-step confirm (Phase 3); ResetButton uses a shadcn Dialog modal (Phase 4, D-05) -- do not unify them, they are intentionally different weights of action"

key-files:
  created:
    - backend/reset.py
    - frontend/components/ui/dialog.tsx
    - frontend/components/ResetButton.tsx
  modified:
    - backend/main.py
    - frontend/lib/api.ts
    - frontend/app/page.tsx

key-decisions:
  - "Restarted the running uvicorn process (no --reload flag) after creating backend/reset.py, since a new router module is never picked up by an already-running non-reloading process -- confirmed via a 'Not Found' response before restart, 'reset' status after"
  - "Verified the live forget -> reset -> search round trip via direct curl calls against the running backend rather than only static checks, per the plan's human-check requirement -- confirmed no Windows PermissionError and a correct post-reset search answer"
  - "Full interactive browser click-through (modal open/close/confirm animation/toast) could not be automated in this Windows environment -- no headless-browser interaction tooling (chromium-cli/playwright) is installed and none was added, per scope discipline. Verified instead via: tsc --noEmit, a static Chrome headless screenshot confirming clean page render (no B-04 PostCSS crash, Reset Demo button visible), and code review matching 04-PATTERNS.md's verified ResetButton skeleton line-for-line"

requirements-completed: [DEMO-01]

coverage:
  - id: D1
    description: "POST /reset releases relational/vector/graph engine handles in the correct Windows-safe order, then restores the Plan-01 snapshot, returning {status: reset}"
    requirement: "DEMO-01"
    verification:
      - kind: unit
        ref: "backend/reset.py static AST check: dispose() precedes snapshot_memory.restore() -- printed RESET_ORDER_OK"
        status: pass
      - kind: e2e
        ref: "live curl round trip: POST /forget(workarounds_v1_8) -> GET /datasets confirms forgotten -> POST /reset returns {status:reset} with no PermissionError in server log -> GET /datasets confirms workarounds_v1_8 restored -> POST /search(customers double-charged) returns status:ok"
        status: pass
    human_judgment: false
  - id: D2
    description: "One-click modal-guarded Reset Demo button with a visible in-flight (Resetting…) state, cache invalidation, and success toast, wired into page.tsx"
    requirement: "DEMO-01"
    verification:
      - kind: unit
        ref: "tsc --noEmit -- printed TSC_OK; grep-based structural check -- printed RESET_UI_WIRED"
        status: pass
      - kind: automated_ui
        ref: "chrome --headless=new --screenshot of http://localhost:3000 -- page renders cleanly, Reset Demo button visible, no PostCSS/build error (B-04)"
        status: pass
    human_judgment: true
    rationale: "The interactive parts of this deliverable (modal opens on click, Cancel dismisses, Confirm triggers the reset animation + success toast, DatasetList refreshes, button disabled while in flight) require driving real browser click/DOM events. No headless-browser interaction tool (chromium-cli/playwright) is installed in this environment, so only the static render and code-level correctness were automatable here -- a human should click through the flow once at http://localhost:3000 to confirm the modal/animation/toast UX matches the intended design before the demo."

# Metrics
duration: 12min
completed: 2026-07-03
status: complete
---

# Phase 4 Plan 2: One-Click Demo Reset Summary

**POST /reset endpoint (Windows-safe engine-handle release + snapshot restore) plus a modal-guarded "Reset Demo" button (shadcn Dialog, first modal primitive in this codebase) wired into page.tsx — live-verified end-to-end via forget → reset → search round trip with no PermissionError.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-03T07:24:00Z (approx.)
- **Completed:** 2026-07-03T07:36:00Z (approx.)
- **Tasks:** 2 (both complete)
- **Files modified:** 6 (2 created backend, 2 created frontend, 2 modified frontend, 1 modified backend)

## Accomplishments
- `backend/reset.py`: `POST /reset` disposes the relational SQLAlchemy engine, clears the relational/vector/graph engine caches (Windows-safe order per 04-RESEARCH.md Pattern 4), then delegates to the unmodified `scripts/snapshot_memory.restore()` — registered in `backend/main.py`
- Live-verified the full loop against the running backend: forgot `workarounds_v1_8` → confirmed it vanished from `/datasets` → called `/reset` (no PermissionError, `{"status":"reset"}`) → confirmed `workarounds_v1_8` reappeared, still correctly flagged 🔴 drifting → re-ran the canonical `"customers double-charged"` search and got a correct, evidence-grounded `status: ok` answer
- `frontend/components/ui/dialog.tsx`: generated the shadcn/Radix Dialog primitive (`npx shadcn add dialog`) — no new external package, first modal in this codebase
- `resetMemory()` added to `frontend/lib/api.ts`, mirroring `forgetDataset`'s discriminated-union + D-24 fallback-message shape exactly
- `frontend/components/ResetButton.tsx`: destructive "Reset Demo" trigger → modal confirm (Cancel/Confirm Reset) → disables both buttons and shows "Resetting…" while in flight (T-04-03) → invalidates ALL react-query caches and shows a success toast on completion, or an inline error message on failure
- Wired `<ResetButton />` into `frontend/app/page.tsx` as a new top-level "Demo controls" section

## Task Commits

Each task was committed atomically:

1. **Task 1: POST /reset endpoint — engine-handle release + snapshot restore** - `a51dcfd` (feat)
2. **Task 2: Reset button + modal confirm + animation + api wrapper** - `9914fe0` (feat)

**Plan metadata commit:** pending (this commit)

## Files Created/Modified
- `backend/reset.py` - New `POST /reset` route: relational `dispose()` + 3x engine `cache_clear()` + `snapshot_memory.restore()`, D-24 error handling
- `backend/main.py` - Registered `reset_router` (import + `include_router`)
- `frontend/components/ui/dialog.tsx` - shadcn-generated Radix Dialog primitive
- `frontend/lib/api.ts` - Added `resetMemory()` + `ResetResponse` discriminated union
- `frontend/components/ResetButton.tsx` - New modal-guarded reset button component
- `frontend/app/page.tsx` - Added `<ResetButton />` in a new "Demo controls" section

## Decisions Made
- Restarted the already-running (non-`--reload`) uvicorn process after adding `backend/reset.py` — a brand-new router module is never picked up by a live process without a reload mechanism; confirmed via a `404 Not Found` on `/reset` before restart and `{"status":"reset"}` after.
- Chose to live-verify the forget→reset→search round trip via direct `curl` calls against the actually-running backend (not just the plan's static AST check), matching the plan's own `<human-check>` intent, before committing Task 1.
- Documented (see `coverage` D2) that full interactive browser click-through could not be automated in this Windows environment — no `chromium-cli`/`playwright` tooling is installed, and installing one was judged out of scope for this plan. Verified instead via `tsc --noEmit`, a structural grep check, and a static headless-Chrome screenshot confirming no PostCSS crash (B-04) and correct button rendering. This is flagged as `human_judgment: true` in the coverage block so a human clicks through the modal/animation/toast flow once before the demo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restarted the running backend process to load the new /reset router**
- **Found during:** Task 1 (live human-check verification)
- **Issue:** The plan's human-check step assumed `POST /reset` would be reachable immediately after creating `backend/reset.py` and registering it in `main.py`, but the already-running `uvicorn` process (started without `--reload`) had no mechanism to pick up the new module — `curl -X POST http://localhost:8000/reset` returned `{"detail":"Not Found"}`.
- **Fix:** Identified the running process by port (`netstat`) and PID, cross-referenced its command line (`uvicorn main:app --workers 1 --host 127.0.0.1 --port 8000`, matching the project's documented single-worker run command), terminated it, and restarted the identical command from `backend/`.
- **Files modified:** None (process lifecycle only).
- **Verification:** Post-restart, `GET /datasets` immediately returned the correct pre-reset state (confirming persistence survived the restart), and `POST /reset` then returned `{"status":"reset"}` with the full round trip verified as documented above.
- **Committed in:** N/A (no file change; documented here per the orchestrator's note that restarting the backend to release file locks is expected and acceptable in this phase).

---

**Total deviations:** 1 auto-fixed (1 blocking process-lifecycle restart, no code change)
**Impact on plan:** No scope creep — the fix was a necessary operational step (restart a non-reloading dev server after adding a new route module), not a code change. Both tasks' acceptance criteria and live verification passed exactly as specified.

## Issues Encountered
- No headless-browser interaction tooling (`chromium-cli`, `playwright`, `puppeteer`) is available in this project or globally in this Windows environment. A static Chrome headless screenshot (`chrome.exe --headless=new --screenshot`) was used to confirm the page renders cleanly with the Reset Demo button visible and no PostCSS crash (B-04), but the fully interactive modal-open → confirm → animation → toast → cache-refresh flow was verified by code review against 04-PATTERNS.md's verified `ResetButton` skeleton (which the implementation matches near-verbatim) rather than a live click-through. This is flagged in the `coverage` block (`D2`, `human_judgment: true`) for a human to confirm once before the demo.

## User Setup Required

None — no external service configuration required. Note: the project's `uvicorn` backend (port 8000) was stopped and restarted during this plan's execution (to load the new `/reset` route); it is already running again and confirmed healthy (`/health/cognee` → `{"status":"ok"}`, `/datasets` → 3 datasets including the restored `workarounds_v1_8`).

## Next Phase Readiness
- `POST /reset` is live, registered, and proven to restore the Plan-01 snapshot Windows-safely with no PermissionError — the demo can now be re-run from the top after any forget/upload/feedback sequence.
- The `ResetButton` UI is wired and type-checks cleanly; a human should click through the modal → confirm → animation → toast flow once in the browser before the live demo to confirm the UX (flagged as the one open `human_judgment: true` coverage item).
- No blockers for Plan 03 (memory graph) — this plan did not touch `backend/search.py`, `backend/drift.py`, or any dataset/graph-shape code.

---
*Phase: 04-demo-loop-stretch*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: backend/reset.py
- FOUND: frontend/components/ui/dialog.tsx
- FOUND: frontend/components/ResetButton.tsx
- FOUND: .planning/phases/04-demo-loop-stretch/04-02-SUMMARY.md
- FOUND: resetMemory() in frontend/lib/api.ts
- FOUND: reset_router registered in backend/main.py
- FOUND commit: a51dcfd (Task 1)
- FOUND commit: 9914fe0 (Task 2)
- FOUND commit: adaf2d8 (SUMMARY.md)
