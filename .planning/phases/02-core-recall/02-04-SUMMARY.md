---
phase: 02-core-recall
plan: 04
subsystem: api
tags: [cognee, fastapi, feedback, improve, react-query, react, asyncio-gather]

# Dependency graph
requires:
  - phase: 02-01
    provides: "CACHING=true + AUTO_FEEDBACK=false config keystone; fused GRAPH_COMPLETION+CHUNKS /search returning session_id/qa_id/source_dataset"
  - phase: 02-02
    provides: "DiagnosisCard rendering root cause + evidence + version tag; lib/api.ts SearchResponse contract"
  - phase: 02-03
    provides: "Ingest/upload pipeline, dataset routing, /ingest/status polling contract"
provides:
  - "POST /feedback/accept — add_feedback(score=5) + improve(feedback_alpha=1.0) against the exact source_dataset, validated against the live dataset list before writing (Pitfall 2 guard)"
  - "GET /datasets — name + live doc_count for display datasets, throwaway datasets filtered out"
  - "Accept Fix / Dismiss controls on DiagnosisCard — Accept reinforces + re-searches, Dismiss is silent client-only removal"
  - "DatasetList component — mono name · N docs, refetches on upload"
  - "Fix: STATUS_MAP now matches cognee 1.2.2's real PipelineRunStatus enum (DATASET_PROCESSING_* not PipelineRun*) — /ingest/status no longer sticks on 'processing' forever"
  - "Fix: _active_search_datasets() excludes zero-doc datasets — an empty dataset no longer crashes the entire fused /search via asyncio.gather's fail-everything semantics"
  - "Fix: accept-triggered re-search uses its own pending flag so the 'Reinforced ✓' state actually paints before the next diagnosis replaces it"
affects: [Phase 3 drift/forget work reuses the same dataset-list + search-dataset-filtering surface; any future cognee status-mapping code must use the real PipelineRunStatus enum values, not RESEARCH.md's assumed names]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Filter cognee search targets by doc_count > 0, not by pipeline status alone — an empty dataset can report a 'completed' pipeline run with zero documents, and Cognee's per-dataset asyncio.gather has no return_exceptions=True, so one empty dataset fails search for every OTHER dataset too"
    - "Keep an accept/mutate-triggered background refetch on its own pending flag, separate from the primary user-driven action's pending flag, whenever the mutate's success state needs to stay visible while the refetch runs"

key-files:
  created:
    - backend/feedback.py
    - backend/datasets_router.py
    - backend/tests/test_feedback_datasets.py
  modified:
    - backend/main.py
    - backend/ingest.py
    - backend/search.py
    - backend/tests/test_search_helpers.py
    - frontend/lib/api.ts
    - frontend/app/page.tsx
    - frontend/components/DiagnosisCard.tsx
    - frontend/components/DatasetList.tsx
    - frontend/components/SearchBar.tsx
    - frontend/components/UploadPanel.tsx

key-decisions:
  - "Validate source_dataset against cognee.datasets.list_datasets() before every improve() call — a forged/stale dataset name is rejected with a short message rather than silently misdirecting graph-weight writes (T-02-09)"
  - "No /feedback/reject route exists — Reject/Dismiss is a purely client-side state flip, per D-10, verified by grep + a unit test asserting the router has zero reject routes"
  - "_active_search_datasets() filters on doc_count (via list_data length), not pipeline status, since an empty dataset can legitimately report DATASET_PROCESSING_COMPLETED"

patterns-established:
  - "Pattern: any code that reads Cognee's PipelineRunStatus must extract `.value` from the enum member and compare against the real DATASET_PROCESSING_* constants — the enum is not a str subclass"

requirements-completed: [FEEDBACK-01, FEEDBACK-02, RELEASE-01]

coverage:
  - id: D1
    description: "POST /feedback/accept validates source_dataset, calls add_feedback(score=5)+improve(feedback_alpha=1.0), returns {status:reinforced}; rejects unknown datasets; no reject route exists"
    requirement: "FEEDBACK-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_feedback_datasets.py (8 tests: source_dataset validation, no-reject-route assertion)"
        status: pass
      - kind: integration
        ref: "manual curl POST /feedback/accept with real session_id/qa_id/source_dataset from a live search -> {status:reinforced}; backend.log shows add_feedback + improve completed with no errors"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /datasets returns display datasets with live doc_count, filtering HEALTHCHECK/CANARY and uuid-suffixed throwaways"
    requirement: "RELEASE-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_feedback_datasets.py (_is_display_dataset cases)"
        status: pass
      - kind: integration
        ref: "manual curl GET /datasets after a release upload shows the new workarounds_v{N} with correct doc_count"
        status: pass
    human_judgment: false
  - id: D3
    description: "Accept Fix reinforces and flips to an inline 'Reinforced ✓' state; re-search after Accept still returns a grounded answer; Dismiss silently removes the card with no network call"
    requirement: "FEEDBACK-02"
    verification:
      - kind: automated_ui
        ref: "frontend build + tsc clean; 02-UAT.md tests 4-6 (browser, /gsd-verify-work session) all pass after fixing the re-search race condition (commit c276b4e)"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation of an inline state transition and reinforcement timing is a human-judgment concern — confirmed via the completed 02-UAT.md session"
  - id: D4
    description: "Uploading a release note produces a new workarounds_v{N} dataset visible in the dataset list with a correct doc count once ingest completes"
    requirement: "RELEASE-01"
    verification:
      - kind: automated_ui
        ref: "02-UAT.md test 7 (browser, /gsd-verify-work session) — pass"
        status: pass
    human_judgment: true
    rationale: "End-to-end upload-to-visible-dataset timing and rendering is a human-judgment concern — confirmed via the completed 02-UAT.md session"

duration: 1h 15min
completed: 2026-07-02
status: complete
---

# Phase 2: Core Recall Summary (Plan 04)

**Feedback reinforcement (add_feedback+improve against the exact source dataset) and a live dataset list, plus two real bugs the human-verify checkpoint caught: a Cognee enum mismatch that stuck every ingest status on "processing" forever, and an empty dataset that silently broke the entire fused search for every query.**

## Performance

- **Duration:** 1h 15min (across two sessions: initial build + checkpoint fix cycle)
- **Started:** 2026-07-02T11:21:28Z
- **Completed:** 2026-07-02T12:51:18Z
- **Tasks:** 3 (2 code tasks + 1 human-verify checkpoint)
- **Files modified:** 15

## Accomplishments
- `/feedback/accept` reinforces the exact source dataset an answer came from (add_feedback score=5, improve feedback_alpha=1.0), rejecting forged/unknown dataset names before ever calling improve()
- `/datasets` exposes name + live document count for every durable dataset, filtering internal healthcheck/canary throwaways
- DiagnosisCard gained Accept Fix (reinforces, flips to "Reinforced ✓", triggers a re-search) and Dismiss (silent, client-only, no network call) controls
- DatasetList renders `name · N docs` in mono and refetches automatically after an upload
- Found and fixed two live-only bugs during the Task 3 human-verify checkpoint that no unit test (all mocked) could have caught — see Deviations

## Task Commits

1. **Task 1: Feedback-accept endpoint + dataset-list endpoint** - `2338dd6` (feat)
2. **Task 2: Accept/Dismiss controls + re-search proof + dataset list UI** - `b7d7941` (feat)
3. **Task 3: Human-verify checkpoint** - approved via `.planning/phases/02-core-recall/02-UAT.md` (`/gsd-verify-work 2`, 12/12 tests passed) after two live-bug fixes below

## Files Created/Modified
- `backend/feedback.py` - POST /feedback/accept: validate source_dataset, add_feedback + improve
- `backend/datasets_router.py` - GET /datasets: display datasets with live doc counts
- `backend/tests/test_feedback_datasets.py` - unit tests for both routers
- `backend/main.py` - registers feedback + datasets routers
- `backend/ingest.py` - **fixed**: STATUS_MAP now matches cognee 1.2.2's real enum
- `backend/search.py` - **fixed**: excludes zero-doc datasets from the search set
- `backend/tests/test_search_helpers.py` - regression test locking in the empty-dataset exclusion
- `frontend/lib/api.ts` - acceptFeedback(), listDatasets(), DatasetInfo type
- `frontend/app/page.tsx` - Accept/Dismiss wiring; **fixed**: separate re-search pending state
- `frontend/components/DiagnosisCard.tsx` - Accept Fix / Dismiss controls, Reinforced state
- `frontend/components/DatasetList.tsx` - dataset list UI
- `frontend/components/SearchBar.tsx` - reports submitted query text for re-search
- `frontend/components/UploadPanel.tsx` - invalidates datasets query on upload

## Decisions Made
- Filter search-eligible datasets by `doc_count > 0` (reusing the same `list_data()`-length check as the dataset list), not by Cognee's pipeline status — an empty dataset can report `DATASET_PROCESSING_COMPLETED` with zero documents, which would otherwise still crash the fused search
- Give the accept-triggered re-search its own React state (`isReSearching`) instead of sharing the SearchBar's `isPending`, so the "Reinforced ✓" state has a chance to actually paint

## Deviations from Plan

### Auto-fixed Issues

**1. [Live-testing bug, not caught by unit tests] STATUS_MAP keyed on wrong Cognee enum values**
- **Found during:** Task 3 human-verify checkpoint — user reported ingest status rows stuck on "processing"
- **Issue:** `backend/ingest.py`'s `STATUS_MAP` assumed string values `PipelineRunStarted`/`PipelineRunCompleted`/`PipelineRunAlreadyCompleted`/`PipelineRunErrored` (per 02-RESEARCH.md Pattern 2), but cognee 1.2.2's actual `PipelineRunStatus` enum uses `DATASET_PROCESSING_{INITIATED,STARTED,COMPLETED,ERRORED}` and is not a str subclass — the comparison never matched, so every dataset's status silently defaulted to "processing" forever
- **Fix:** Corrected `STATUS_MAP` to the real enum values; extract `.value` from the enum member before mapping
- **Files modified:** `backend/ingest.py`
- **Verification:** Live-verified via direct API polling — a fresh release upload correctly transitions processing → ready
- **Committed in:** `5cccfc4`

**2. [Live-testing bug, not caught by unit tests] Empty dataset crashed the entire fused search**
- **Found during:** Task 3 human-verify checkpoint — user reported Accept Fix never showing "Reinforced" (root cause traced to `/search` silently failing for every query)
- **Issue:** A dataset with zero documents (e.g. an upload whose `add()` never landed) still reports a "completed" pipeline status, but Cognee's `CHUNKS` retriever raises `NoDataError` for it. `search_in_datasets_context` fans out via `asyncio.gather()` without `return_exceptions=True`, so that one empty dataset failed the entire fused search across every other healthy dataset too — masked by the endpoint's own broad `except` as a generic "Search failed" response
- **Fix:** `_active_search_datasets()` now filters to `doc_count > 0` before ever calling `cognee.search()`; added an early `no_results` return when the filtered set is empty
- **Files modified:** `backend/search.py`, `backend/tests/test_search_helpers.py` (added a regression test)
- **Verification:** Full backend suite (27/27) passes; live-verified end-to-end via curl (search → accept → re-search → release upload → dataset list)
- **Committed in:** `5cccfc4`

**3. [Live-testing bug, not caught by build/tsc] "Reinforced ✓" never painted before being replaced**
- **Found during:** Task 3 human-verify checkpoint, second retest — user reported "can't see Reinforced" even after bug #2 was fixed and the backend confirmed successful reinforcement
- **Issue:** `frontend/app/page.tsx`'s `handleReSearch()` (triggered by `onReSearch` after a successful Accept) set the same `isPending` flag the SearchBar's own search mutation uses. React 18 batched `DiagnosisCard`'s `setAccepted(true)` with the page's `setIsPending(true)` into one render pass, so `<DiagnosisCardSkeleton />` replaced the just-accepted card before "Reinforced ✓" ever painted
- **Fix:** Gave the accept-triggered re-search its own `isReSearching` state, separate from `isPending` — the accepted card now stays mounted (still showing "Reinforced ✓") for the duration of the re-search, swapping directly to the new diagnosis once it resolves
- **Files modified:** `frontend/app/page.tsx`
- **Verification:** Retested via `/gsd-verify-work 2` (test 4 retest) — confirmed passing
- **Committed in:** `c276b4e`

---

**Total deviations:** 3 auto-fixed, all found live during the Task 3 checkpoint (none caught by mocked unit tests or type-checking)
**Impact on plan:** All three fixes were necessary for the plan's own success criteria (FEEDBACK-02's visible reinforcement, RELEASE-01's status visibility). No scope creep — no unrelated refactoring was bundled in.

## Issues Encountered
- The `/gsd-verify-work` mvp-mode gate blocked on ROADMAP.md's Phase 2 Goal not being in strict user-story format (`^As a .+, I want to .+, so that .+\.$` — literally "As a", not "As an"). Fixed by syncing ROADMAP.md's Goal line to the user-story already written in this plan's own Phase Goal section (commit `f9c5593`, phase-level doc fix, not part of this plan's own deliverables).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2's full core loop (ingest → search → diagnose → reinforce → re-search → release upload → dataset list) is verified working end-to-end in the browser via a completed UAT session (`.planning/phases/02-core-recall/02-UAT.md`, 12/12 passed)
- Phase 3 (Drift + Forget) can build on the now-correct dataset-list and search-filtering surface without re-discovering the STATUS_MAP/asyncio.gather pitfalls documented here

---
*Phase: 02-core-recall*
*Completed: 2026-07-02*
