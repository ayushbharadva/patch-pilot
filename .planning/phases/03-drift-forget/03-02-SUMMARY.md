---
phase: 03-drift-forget
plan: 02
subsystem: api
tags: [cognee, fastapi, forget, react-query, nextjs, tailwind-v4]

# Dependency graph
requires:
  - phase: 03-drift-forget (plan 01)
    provides: "compute_drift_states shared classifier, drift_state on GET /datasets and POST /search, DatasetList badge rendering, restored demo corpus (incidents, workarounds_v1_8 [drifting], workarounds_v1_9 [stable])"
provides:
  - "backend/forget.py — POST /forget, _is_forgettable_workaround durable-dataset guard, ForgetRequest model"
  - "forget_router registered in backend/main.py alongside the other four routers"
  - "frontend/lib/api.ts — forgetDataset() wrapper + ForgetResponse discriminated union"
  - "frontend/components/DatasetList.tsx — ForgetButton sub-component (drifting rows only) with two-step inline confirm, DATASETS_QUERY_KEY invalidation, toast, onForgotten callback"
  - "frontend/app/page.tsx — onForgotten wired to handleReSearch (auto re-search after a successful forget)"
affects: [phase-4-demo-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Validate-before-lifecycle-verb + durable-dataset guard: a single regex+denylist check (backend/forget.py's _is_forgettable_workaround) blocks incidents/healthcheck/canary/forged names before cognee.forget() is ever called, closing the Pitfall 2 AttributeError path entirely"
    - "Two-step inline destructive confirm (Forget -> Confirm forget?/Cancel), no modal component, local useState flags gate which buttons render — mirrors DiagnosisCard.tsx's AcceptDismissControls exactly"
    - "onForgotten/onReSearch callback-prop convention for post-mutation auto-re-search, reused verbatim from Phase 2's Accept->re-search (D-12) pattern"

key-files:
  created:
    - backend/forget.py
  modified:
    - backend/main.py
    - backend/tests/test_drift_forget.py
    - frontend/lib/api.ts
    - frontend/components/DatasetList.tsx
    - frontend/app/page.tsx

key-decisions:
  - "No deviations from the plan's literal action blocks — backend/forget.py, main.py registration, api.ts wrapper, DatasetList.tsx ForgetButton, and page.tsx wiring were all implemented exactly as specified in the plan's PATTERNS-derived code snippets."

requirements-completed: [FORGET-01, FORGET-02]

coverage:
  - id: D1
    description: "_is_forgettable_workaround durable-dataset guard rejects incidents/healthcheck/canary/forged/absent-versioned names, accepts only a live workarounds_v{N}"
    requirement: "FORGET-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_drift_forget.py#test_is_forgettable_workaround_rejects_incidents (+4 related cases)"
        status: pass
    human_judgment: false
  - id: D2
    description: "forget_router exposes exactly POST /forget and is registered in backend/main.py"
    requirement: "FORGET-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_drift_forget.py#test_forget_router_has_forget_route"
        status: pass
      - kind: other
        ref: "grep -c forget_router backend/main.py = 2 (import + include_router)"
        status: pass
    human_judgment: false
  - id: D3
    description: "POST /forget calls cognee.forget(dataset=...) only for a validated live workarounds_v{N} and returns D-24 short human messages on every rejection/error path, matching the UI-SPEC Copywriting Contract verbatim"
    requirement: "FORGET-01"
    verification:
      - kind: other
        ref: "backend/forget.py — _MSG_INVALID_DATASET == \"That dataset can't be forgotten.\", _MSG_ERROR == \"Could not forget dataset. Please try again.\" (matches frontend fallback string exactly)"
        status: pass
    human_judgment: false
  - id: D4
    description: "ForgetButton renders only on drifting rows, uses a two-step inline confirm (Forget -> Confirm forget?/Cancel), and on success invalidates DATASETS_QUERY_KEY, toasts, and calls onForgotten -> handleReSearch"
    requirement: "FORGET-02"
    verification:
      - kind: other
        ref: "cd frontend && npx tsc --noEmit (zero errors); grep -c forgetDataset components/DatasetList.tsx = 2; grep -c 'Confirm forget?' components/DatasetList.tsx = 1; grep -c onForgotten app/page.tsx = 1"
        status: pass
    human_judgment: true
    rationale: "Typecheck and grep confirm the code shape (mutation call, confirm-step labels, callback wiring) but not the actual pixel rendering, the real end-to-end row-removal + re-search visual proof, or the durability guard against a live corpus — the plan's own Post-execution UAT section defers the full search->drift->forget->re-search before/after loop to /gsd-verify-work."

duration: 12min
completed: 2026-07-02
status: complete
---

# Phase 3 Plan 2: Forget Summary

**Guarded `POST /forget` endpoint (durable-dataset regex+denylist guard mirroring `backend/feedback.py`) plus a two-step inline `ForgetButton` on 🔴 drifting dataset rows that invalidates the dataset list, toasts, and auto-re-runs the last search — completing the search → drift-detected → forget → re-search loop.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-02T21:55:39+05:30
- **Completed:** 2026-07-02T21:58:30+05:30
- **Tasks:** 2 (Task 1 TDD with a RED + GREEN commit, Task 2 single commit)
- **Files modified:** 6 (1 new, 5 modified)

## Accomplishments
- `backend/forget.py`: `ForgetRequest`, `_is_forgettable_workaround` (durable `incidents` guard + `workarounds_v{N}` allowlist regex checked before any Cognee call + live-existence check), `POST /forget` calling `cognee.forget(dataset=...)` only on a validated target, D-24 short human error messages matching the UI-SPEC Copywriting Contract verbatim.
- `forget_router` registered in `backend/main.py` alongside the other four routers — no new CORS config needed.
- `frontend/lib/api.ts`: `forgetDataset()` wrapper + `ForgetResponse` discriminated union, mirroring `acceptFeedback`'s try/catch/status-branch shape exactly.
- `frontend/components/DatasetList.tsx`: new `ForgetButton` sub-component rendered only on `drift_state === "drifting"` rows, with a two-step inline confirm (`Forget` → `Confirm forget?` + `Cancel`, no modal) mirroring `DiagnosisCard.tsx`'s `AcceptDismissControls`; on success invalidates `DATASETS_QUERY_KEY`, fires `toast.success("Forgotten — updating results…")`, and calls `onForgotten`.
- `frontend/app/page.tsx`: `<DatasetList onForgotten={() => void handleReSearch()} />` — a successful forget now auto-re-runs the last query, making the before/after memory change visible without a manual re-search step (FORGET-02).
- Full backend suite (`backend/tests/`, 42 tests) and frontend `npx tsc --noEmit` both pass with zero regressions.

## Task Commits

Each task was committed atomically:

1. **Task 1: POST /forget endpoint with durable-dataset guard + router registration** — TDD, two commits:
   - RED: `79e4ad1` (`test(03-02): add failing forget-guard + route-registration tests`)
   - GREEN: `60448eb` (`feat(03-02): POST /forget endpoint with durable-dataset guard`)
2. **Task 2: ForgetButton (drifting rows) with two-step confirm + auto-re-search wiring** — `5f6fc4c` (`feat(03-02): ForgetButton with two-step confirm + auto-re-search wiring`)

## Files Created/Modified
- `backend/forget.py` — `ForgetRequest`, `_is_forgettable_workaround`, `POST /forget` → `forget_dataset`, `_MSG_INVALID_DATASET`/`_MSG_ERROR`
- `backend/main.py` — `forget_router` import + `include_router`, module docstring updated
- `backend/tests/test_drift_forget.py` — 6 new unit tests covering the forget-guard cases and route registration
- `frontend/lib/api.ts` — `ForgetResponse` union, `forgetDataset({ dataset })`
- `frontend/components/DatasetList.tsx` — `ForgetButton` sub-component, `onForgotten` prop threaded through `DatasetList`/`DatasetRow`
- `frontend/app/page.tsx` — `onForgotten={() => void handleReSearch()}` passed to `<DatasetList />`

## Decisions Made
None beyond following the plan's own PATTERNS-derived code shapes exactly — no architectural deviations.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria (`pytest` pass, `grep -c forget_router` ≥ 2, `_is_forgettable_workaround` behavior contract, D-24 message strings, `npx tsc --noEmit` clean, two-step confirm labels, `DATASETS_QUERY_KEY` invalidation + toast + `onForgotten` call, `app/page.tsx` wiring) were met without needing an auto-fix.

## Issues Encountered
None.

## User Setup Required

None — no external service configuration required. No new environment variables or dependencies introduced this plan.

## Next Phase Readiness
- The full search → drift-detected → forget → re-search core loop (PatchPilot's core value, per PROJECT.md) is now wired end-to-end at the code level: `POST /search` returns `drift_state`, `GET /datasets` shows the 🟢/🟡/🔴 badge + reason, and `POST /forget` surgically removes a validated `workarounds_v{N}` dataset with the UI auto-re-searching afterward.
- Per the plan's own Post-execution UAT section, the full before/after visual proof (search "double-charged" → see `workarounds_v1_8` 🔴 → Forget → Confirm forget? → row disappears + toast + auto re-search → re-searched evidence no longer contains `workarounds_v1_8` while `incidents` still returns results) has NOT been exercised live against the running backend/frontend in this plan — that is explicitly deferred to `/gsd-verify-work` per both this plan and 03-01's own SUMMARY (`D4`/`D5` `human_judgment: true`).
- No blockers for Phase 4 (demo polish). Recommend running the full UAT (search → drift → forget → re-search, timed under 120s) before the final demo rehearsal.

---
*Phase: 03-drift-forget*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: backend/forget.py
- FOUND: backend/tests/test_drift_forget.py
- FOUND: frontend/lib/api.ts
- FOUND: frontend/components/DatasetList.tsx
- FOUND: frontend/app/page.tsx
- FOUND: .planning/phases/03-drift-forget/03-02-SUMMARY.md
- FOUND: 79e4ad1 (test commit — RED)
- FOUND: 60448eb (feat commit — backend GREEN)
- FOUND: 5f6fc4c (feat commit — frontend)
