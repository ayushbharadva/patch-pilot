---
phase: 04-demo-loop-stretch
plan: 05
subsystem: api
tags: [cognee, chunks-retriever, confidence-score, fastapi, react, shadcn]

# Dependency graph
requires:
  - phase: 04-demo-loop-stretch
    provides: Confirmed working search->drift->forget->re-search loop under 120s (Plan 04) gating STRETCH-01
provides:
  - "backend/search.py: CHUNKS cognee.search() call now passes verbose=True to surface ScoredResult.score (04-RESEARCH.md Pitfall 5)"
  - "_confidence_from_results(): pure helper inverting cognee's raw cosine distance into a clamped [0,1] confidence, best-effort (never raises)"
  - "_flatten_and_truncate() extended to read the verbose objects_result shape (ScoredResult .payload/.score items) with full backward-compat fallback to the legacy search_result shape"
  - "/search 'ok' response carries a flat top-level confidence: number | null key, same convention as drift_state"
  - "DiagnosisCard renders an 'N% confidence' outline badge beside the version tag when confidence is non-null"
affects: [final-submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "verbose=True on a CHUNKS cognee.search() call reshapes the per-dataset result from a flat search_result list-of-dicts into {objects_result, text_result, context_result}; objects_result items are ScoredResult (pydantic) objects exposing .payload/.score, not plain dicts -- code reading them must use getattr/attribute access, not .get()"
    - "cognee's ScoredResult.score is a raw backend DISTANCE (lower = better match), confirmed against the installed package's own docstring -- any confidence/relevance UI built on it must invert (1 - score) and clamp to [0,1], never pass it through directly"

key-files:
  created: []
  modified:
    - backend/search.py
    - backend/tests/test_search_helpers.py
    - frontend/lib/api.ts
    - frontend/components/DiagnosisCard.tsx

key-decisions:
  - "_confidence_from_results() takes the single BEST (lowest-distance) score across every dataset's objects_result items, not just the first result's first item -- the confidence badge represents the strongest evidence anywhere backing the diagnosis, which is more meaningful than an arbitrary per-dataset iteration-order pick"
  - "Confidence extraction wraps its own try/except internally (mirroring qa_id's best-effort pattern) rather than relying on the outer /search try/except, so a malformed score can never propagate past this one nice-to-have field"

patterns-established:
  - "Verbose Cognee search results: always branch on getattr(item, 'payload', None) before assuming dict shape, since verbose=True switches per-dataset items from plain dicts to pydantic ScoredResult objects"

requirements-completed: [STRETCH-01]

coverage:
  - id: D1
    description: "backend/search.py: CHUNKS call uses verbose=True; _flatten_and_truncate reads the new objects_result shape (with search_result backward-compat); _confidence_from_results extracts and normalizes a real [0,1] confidence; /search 'ok' response carries a flat top-level confidence key"
    requirement: "STRETCH-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_search_helpers.py -- 17 tests pass (9 pre-existing + 8 new: verbose objects_result evidence extraction, empty-payload skip, legacy search_result backward compat, confidence best-score inversion, out-of-range clamping, empty-input None, no-objects_result None)"
        status: pass
      - kind: integration
        ref: "grep gate: verbose=True + \"confidence\" present in backend/search.py, _confidence_from_results present in test file -> printed CONFIDENCE_WIRED"
        status: pass
      - kind: e2e
        ref: "Live curl against restarted :8000 backend: POST /search {customers double-charged} -> confidence: 0.7736980319023132 (real, non-stub number); POST /search {off-corpus cake query} -> {status: no_results}, no crash"
        status: pass
    human_judgment: false
  - id: D2
    description: "SearchResponseOk.confidence: number | null added 1:1 to frontend/lib/api.ts; DiagnosisCard renders an outline 'N% confidence' Badge beside VersionTagBadge in the CardHeader when confidence is non-null, renders nothing when null"
    requirement: "STRETCH-01"
    verification:
      - kind: unit
        ref: "grep gate: confidence present in lib/api.ts and DiagnosisCard.tsx; npx tsc --noEmit -> printed CONFIDENCE_UI_OK"
        status: pass
    human_judgment: false
  - id: D3
    description: "Live on-screen browser verification: searching 'customers double-charged' shows the confidence badge beside the version tag; an off-corpus query shows no badge and no crash"
    requirement: "STRETCH-01"
    verification: []
    human_judgment: true
    rationale: "No headless-browser interaction tooling (playwright/chromium-cli) is installed in this Windows environment (same constraint documented in every prior Phase 4 plan's SUMMARY). Backend-side proof is fully automated and passing (D1: live curl confirms the real confidence number and clean no_results fallback); this item is the human's one-time visual confirmation of the badge rendering in the actual browser, consistent with the D2 items carried in 04-02/03/04-SUMMARY."

# Metrics
duration: 15min
completed: 2026-07-03
status: complete
---

# Phase 4 Plan 5: Confidence Score Badge (STRETCH-01) Summary

**Real confidence score on the diagnosis card, extracted from cognee's CHUNKS retriever raw cosine-distance score via `verbose=True` (the score is not present in the default `/search` payload — 04-RESEARCH.md Pitfall 5), inverted/clamped to a `0-1` "N% confidence" badge next to the version tag.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-03
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- **Surfaced Cognee's hidden similarity score.** The CHUNKS `cognee.search()` call now passes `verbose=True`, which reshapes the per-dataset result from a flat `search_result` list-of-dicts into `{objects_result, text_result, context_result}` — `objects_result` items are `ScoredResult` pydantic objects exposing `.payload`/`.score`, confirmed by reading the installed `cognee/infrastructure/databases/vector/models/ScoredResult.py` and `chunks_retriever.py`/`get_retriever_output.py` source directly (per the plan's `read_first` instruction) rather than assuming the shape.
- **Confirmed and handled the distance-vs-similarity direction correctly.** `ScoredResult.score` is documented in cognee's own source as "Raw backend distance score ... where a lower score indicates a better match" — a real pitfall the plan flagged as needing source confirmation before finalizing the normalization direction. `_confidence_from_results()` inverts it (`1 - score`, clamped to `[0, 1]`) and picks the single best (lowest-distance) score across every dataset searched, so the badge reflects the strongest evidence anywhere backing the diagnosis.
- **Kept evidence extraction backward compatible.** `_flatten_and_truncate()` now reads `objects_result` when present (extracting `.payload["text"]` from each `ScoredResult`) and falls back to the legacy `search_result` list-of-dicts shape when absent — all 9 pre-existing tests still pass unmodified, plus 8 new tests covering the verbose path, empty-payload skipping, legacy backward compat, confidence inversion/clamping, and the None-on-empty-input contract (17 total, all green).
- **Wired the badge end-to-end and verified live.** `frontend/lib/api.ts`'s `SearchResponseOk` gained `confidence: number | null` 1:1 with the backend field; `DiagnosisCard.tsx` renders a sibling outline `Badge` ("N% confidence") beside `VersionTagBadge` only when non-null. Restarted the running `:8000` backend to load the `search.py` change (required per orchestrator guidance — the process runs without `--reload`) and confirmed live via `curl`: `POST /search {"query":"customers double-charged"}` returns `"confidence":0.7736980319023132` (a real, non-stub number), and an off-corpus query cleanly returns `{"status":"no_results"}` with no crash.

## Task Commits

1. **Task 1: Backend confidence extraction — verbose CHUNKS + score normalization** — `cd5bc12` (feat)
2. **Task 2: Confidence badge on the diagnosis card** — `675b41a` (feat)

**Plan metadata commit:** pending (this commit).

## Files Created/Modified

- `backend/search.py` — CHUNKS `cognee.search()` call now passes `verbose=True`; `_flatten_and_truncate()` reads `objects_result` (ScoredResult `.payload`/`.score` items) with fallback to the legacy `search_result` key; new `_confidence_from_results()` helper extracts and normalizes a best-effort `[0,1]` confidence; `/search` "ok" response gained a flat top-level `confidence` key. `_pick_primary_result` and the GRAPH_COMPLETION call are untouched.
- `backend/tests/test_search_helpers.py` — added a `_FakeScoredResult` test double (attribute-only, matching the real pydantic model's shape) and 8 new tests: verbose `objects_result` evidence extraction, empty-payload-text skip, legacy `search_result` backward compat, confidence best-score inversion across multiple datasets, out-of-range score clamping, and None-on-empty/absent-objects_result.
- `frontend/lib/api.ts` — `SearchResponseOk.confidence: number | null` added 1:1 with the backend field, same discipline as `drift_state`.
- `frontend/components/DiagnosisCard.tsx` — `CardHeader` now wraps `VersionTagBadge` and a conditional confidence `Badge` in a shared flex row; the confidence badge renders `{Math.round(response.confidence * 100)}% confidence` only when `response.confidence != null`.

## Decisions Made

- `_confidence_from_results()` picks the single BEST (lowest-distance) score across every searched dataset's `objects_result`, not merely the first result's first item — see `key-decisions` in frontmatter for full rationale.
- Confidence extraction wraps its own internal try/except (mirroring the existing `qa_id` best-effort pattern at lines 264-270) rather than depending on the outer `/search` try/except, so a malformed or missing score can never fail the search — only ever degrades to `confidence: null`.

## Deviations from Plan

None — plan executed exactly as written. The one piece of genuine investigation (confirming `ScoredResult.score` is a distance, not a similarity, by reading the installed cognee source) was explicitly called for in the plan's own `read_first` instructions, not a deviation from it.

## Issues Encountered

None. The Windows single-writer constraint on `.patchpilot_memory/` was respected throughout: no in-process cognee import was used for verification — only unit tests against fakes (no live memory touch) and live HTTP calls (`curl`) against the restarted backend process, per the orchestrator's guidance to prefer option (b) (pure unit tests) over any in-process live-store access.

## User Setup Required

None — no external service configuration. Operational note: the `:8000` backend was intentionally restarted once during this plan (killed the old non-reload uvicorn process by PID, relaunched `python -m uvicorn main:app --workers 1 --host 127.0.0.1 --port 8000` from `backend/` with output redirected to a scratch log file) to load the `search.py` change; confirmed healthy afterward (`GET /health/cognee` → `{"status":"ok","results":1}`, `POST /search` returns a live `confidence` field, `GET /` on `:3000` → 200, no PostCSS crash). The `:3000` frontend dev server was left running untouched (Next.js Fast Refresh picks up the `lib/api.ts`/`DiagnosisCard.tsx` changes automatically).

## Next Phase Readiness

- STRETCH-01 is shipped and live-verified end-to-end (unit tests, static grep gates, and a real `curl` round trip against the restarted backend all pass).
- One `human_judgment: true` item remains (D3, coverage above): a human should do a single on-screen browser check of the confidence badge alongside the other carried-forward `human_judgment: true` items from 04-02/03/04 (Reset button click-through, Graph tab, full on-screen demo recording) before final submission — no automation gap specific to this plan, same standing Windows headless-browser-tooling constraint as every prior Phase 4 plan.
- Backend and frontend dev servers are both left running and healthy for Plan 06 (or final demo recording) to pick up immediately.

---
*Phase: 04-demo-loop-stretch*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: backend/search.py
- FOUND: backend/tests/test_search_helpers.py
- FOUND: frontend/lib/api.ts
- FOUND: frontend/components/DiagnosisCard.tsx
- FOUND: .planning/phases/04-demo-loop-stretch/04-05-SUMMARY.md
- FOUND commit: cd5bc12 (feat — Task 1 backend confidence extraction)
- FOUND commit: 675b41a (feat — Task 2 frontend confidence badge)
- FOUND commit: 6e889fa (docs — plan summary)
