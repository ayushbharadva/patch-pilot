---
phase: 03-drift-forget
plan: 01
subsystem: api
tags: [cognee, fastapi, graph-completion, drift-detection, nextjs, tailwind-v4, react-query]

# Dependency graph
requires:
  - phase: 02-core-recall
    provides: "_pick_primary_result/_version_sort_key/_active_search_datasets in backend/search.py; DiagnosisCard's reserved HealthState/VersionTagBadge slot; DatasetList's reserved drift-dot slot; GET /datasets and POST /search contracts"
provides:
  - "backend/drift.py — compute_drift_states (shared classifier), generate_drift_reason (live GRAPH_COMPLETION), get_or_generate_reason (in-process cache)"
  - "_pick_primary_result drift-exclusion filter; /search response drift_state field"
  - "GET /datasets drift_state + drift_reason per row"
  - "DatasetList 🟢/🟡/🔴 badge + text label + reason caption; DiagnosisCard VersionTagBadge healthState wired + colored"
  - "Restored demo corpus (workarounds_v1_8 + workarounds_v1_9 both live, Phase 2 UAT debris cleared)"
affects: [03-02-forget-plan, phase-4-demo-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared pure classifier (compute_drift_states) consumed by both /search and /datasets so the two endpoints can never disagree about which dataset is drifting"
    - "Lazy (function-body) import to break a circular dependency between backend/search.py and backend/drift.py, since drift.py imports the shared version regex/sort-key FROM search.py"
    - "In-process dict cache keyed on (drifting_name, current_highest_name) for live LLM-generated reason strings — single-worker-safe per CLAUDE.md's --workers 1 constraint"
    - "Tailwind v4 data-[attr=value]: variants to drive color from a data-* attribute instead of JSX conditional className branching"

key-files:
  created:
    - backend/drift.py
    - backend/tests/test_drift_forget.py
  modified:
    - backend/search.py
    - backend/datasets_router.py
    - frontend/app/globals.css
    - frontend/lib/api.ts
    - frontend/components/DatasetList.tsx
    - frontend/components/DiagnosisCard.tsx

key-decisions:
  - "RESEARCH.md Assumption A1 (snapshot predates the Phase 1 flip) was FALSE when re-verified live — the tarball's own workarounds_v1_8 was already forgotten. Fell back to the plan's documented --seed path (bills cognify() on Mistral's free tier, still low cost) to rebuild all three datasets."
  - "A stray 'spike_incident' dataset survived both --reset and --seed (present in the snapshot itself, unrelated to the v1.8/v1.9 flip debris) — forgotten directly via cognee.forget() to satisfy the corpus-cleanliness acceptance criterion."
  - "_pick_primary_result's new drift_states param defaults to None (treated as empty/all-stable) so the existing test_search_helpers.py suite's single-arg call sites kept working unmodified."
  - "compute_drift_states is imported lazily inside search()'s function body rather than at backend/search.py's module top, to avoid a circular import: backend/drift.py imports _WORKAROUNDS_VERSION_RE/_version_sort_key FROM backend.search at its own module top."

requirements-completed: [DRIFT-01, DRIFT-02, DRIFT-03]

coverage:
  - id: D1
    description: "Demo corpus restored — both workarounds_v1_8 and workarounds_v1_9 live, Phase 2 UAT debris (spike_incident/workarounds_v2_*) cleared"
    verification:
      - kind: other
        ref: "live cognee.datasets.list_datasets() assertion (plan's own verify command) — printed 'CORPUS OK ['incidents', 'workarounds_v1_8', 'workarounds_v1_9']'"
        status: pass
    human_judgment: false
  - id: D2
    description: "compute_drift_states classifies the Stripe arc correctly (v1.8 drifting, v1.9 stable, incidents stable) plus lone-version/no-version/aging-branch edge cases"
    requirement: "DRIFT-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_drift_forget.py#test_compute_drift_states_stripe_arc_highest_stable_others_drifting (+ 4 related cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "_pick_primary_result excludes a drift-flagged dataset from the primary answer even when it is the highest version"
    requirement: "DRIFT-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_drift_forget.py#test_pick_primary_result_excludes_drifting_even_if_highest_version"
        status: pass
      - kind: other
        ref: "live backend.search.search() call against restored corpus — query 'What is the fix for customers being double-charged?' returned source_dataset=workarounds_v1_9, drift_state=stable"
        status: pass
    human_judgment: false
  - id: D4
    description: "GET /datasets returns drift_state + a live, human-readable drift_reason for the drifting workaround; /search response carries drift_state for the winner"
    requirement: "DRIFT-02"
    verification:
      - kind: other
        ref: "live backend.datasets_router.list_datasets() call — workarounds_v1_8 returned drift_state=drifting with a real GRAPH_COMPLETION-generated reason sentence; workarounds_v1_9/incidents returned drift_state=stable, drift_reason=None"
        status: pass
    human_judgment: true
    rationale: "The live LLM reason call and its rendering weren't captured as a stored/repeatable pytest — verified once interactively against the live Mistral-backed corpus. Per the plan's own Post-execution UAT note, full search->drift-badge->reason visual confirmation belongs to /gsd-verify-work."
  - id: D5
    description: "DatasetList renders the three-state badge (dot + text label, color never the only signal) and a reason caption on drifting rows; DiagnosisCard's VersionTagBadge reflects the search response's drift_state with real border/text color"
    requirement: "DRIFT-03"
    verification:
      - kind: other
        ref: "cd frontend && npx tsc --noEmit (types compile); grep -c drift app/globals.css = 11; grep -Ec 'Stable|Aging|Drifting' components/DatasetList.tsx = 5"
        status: pass
    human_judgment: true
    rationale: "Typecheck and grep confirm the code shape but not actual pixel rendering in a browser — visual confirmation belongs to /gsd-verify-work per this plan's own Post-execution UAT section."

duration: 27min
completed: 2026-07-02
status: complete
---

# Phase 3 Plan 1: Drift Detection Summary

**Version-based drift classifier (`compute_drift_states`) shared by `/search` and `GET /datasets`, a live Mistral GRAPH_COMPLETION reason generator with a 10s timeout + cached fallback, `_pick_primary_result` now excludes drifting datasets from the primary answer, and the dataset-list/diagnosis-card UI renders the three-state 🟢/🟡/🔴 badge with a reason caption.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-07-02T15:49:21Z
- **Completed:** 2026-07-02T16:16:00Z
- **Tasks:** 3 (Task 1 operational-only, Task 2 TDD with a RED + GREEN commit, Task 3 single commit)
- **Files modified:** 8 (2 new, 6 modified)

## Accomplishments
- Restored the demo corpus (`incidents`, `workarounds_v1_8`, `workarounds_v1_9` all live) via the `--seed` fallback after the zero-cost `--reset` snapshot turned out to already be post-flip (RESEARCH Assumption A1 falsified live) — also cleared a leftover `spike_incident` stray dataset.
- Built `backend/drift.py`: `compute_drift_states()` (pure, version-based 🔴 trigger + an injectable 🟡 aging branch), `generate_drift_reason()` (single-dataset GRAPH_COMPLETION call, 10s timeout, deterministic fallback), `get_or_generate_reason()` (in-process cache).
- Extended `_pick_primary_result` with a `drift_states` filter (backward-compatible default) so `/search` never returns a drifting dataset as the primary root cause; `/search`'s ok response now carries `drift_state` for the winner.
- Extended `GET /datasets` to return `drift_state` + `drift_reason` per row, with per-dataset defensive error handling so one bad reason call can't break the whole list.
- Wired the frontend: `DatasetList.tsx` fills the reserved dot slot with drift color + text label + reason caption; `DiagnosisCard.tsx`'s `VersionTagBadge` now receives `healthState` from the search response and actually renders it in color via new Tailwind `data-[health-state=*]` variants (the attribute was reserved in Phase 2 but no CSS ever consumed it).
- Live-verified end-to-end against the restored corpus: `workarounds_v1_8` → 🔴 drifting with a real Mistral-generated reason ("This release adds `idempotency_guard`, which prevents duplicate orders by keying Stripe webhook events before processing, making the old nightly dedup sweep unnecessary."); `/search` for the canonical query now returns `workarounds_v1_9` as the primary answer with `drift_state: "stable"`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Restore the demo corpus** — no tracked file changes (operational only; mutates `.patchpilot_memory/` only). Verified via the plan's own `CORPUS OK` assertion.
2. **Task 2: Backend drift engine + search exclusion + /datasets fields** — TDD, two commits:
   - RED: `d520343` (`test(03-01): add failing drift-classification + exclusion tests`)
   - GREEN: `9ba4ef0` (`feat(03-01): drift classification engine, search exclusion, dataset drift fields`)
3. **Task 3: Frontend drift badges, reason caption, and diagnosis-card badge wiring** — `27a6c8e` (`feat(03-01): drift badges, reason caption, diagnosis-card health-state wiring`)

## Files Created/Modified
- `backend/drift.py` — `compute_drift_states`, `generate_drift_reason`, `get_or_generate_reason`, `DRIFT_REASON_PROMPT`, `_FALLBACK_REASON`, `_REASON_TIMEOUT_SECONDS`, `_reason_cache`
- `backend/tests/test_drift_forget.py` — 9 unit tests covering classification, exclusion, and backward compatibility
- `backend/search.py` — `_pick_primary_result(results, drift_states=None)`; `search()` computes `drift_states` (lazy import) and adds `drift_state` to the ok response
- `backend/datasets_router.py` — `GET /datasets` rows gain `drift_state` + `drift_reason`
- `frontend/app/globals.css` — `--color-drift-stable/-aging/-drifting` registered inside `@theme inline`
- `frontend/lib/api.ts` — new `DriftState` type; `DatasetInfo`/`SearchResponseOk` extended
- `frontend/components/DatasetList.tsx` — `DatasetRow` sub-component renders badge dot + text label + reason caption
- `frontend/components/DiagnosisCard.tsx` — `VersionTagBadge` call site wired + colored via `data-[health-state=*]` Tailwind variants

## Decisions Made
- Fell back to `--seed` (bills `cognify()`, low cost on Mistral free tier) after re-verifying live that the `--reset` snapshot was already post-flip — RESEARCH's own Assumption A1 was explicitly flagged as needing re-verification and turned out false.
- `_pick_primary_result`'s new `drift_states` parameter defaults to `None` rather than being required, preserving `test_search_helpers.py`'s existing single-argument call sites unmodified.
- `compute_drift_states` is imported lazily inside `search()`'s function body (not at module top) to avoid a circular import, since `backend/drift.py` imports the shared version regex/sort-key from `backend/search.py` at its own module top.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed pytest/pytest-asyncio to match already-declared requirements.txt**
- **Found during:** Task 2 (running the RED test)
- **Issue:** `.venv` was missing `pytest`/`pytest-asyncio` even though both are already pinned in `requirements.txt` (Phase 2's own test infra) — `pytest` command failed with `No module named pytest`.
- **Fix:** `.venv/bin/pip install -r requirements.txt` (already-declared, already-vetted packages — not a new/different dependency).
- **Files modified:** none (venv-only; requirements.txt unchanged).
- **Verification:** `pytest backend/tests/` ran successfully afterward.

**2. [Rule 3 - Blocking] Ran `npm install` to materialize frontend node_modules**
- **Found during:** Task 3 (running `npx tsc --noEmit`)
- **Issue:** `frontend/node_modules` didn't exist yet in this environment; `npx tsc` downloaded an unrelated `tsc` npm package instead of the project's own TypeScript compiler.
- **Fix:** `npm install` using the existing `package-lock.json` (no dependency versions changed).
- **Files modified:** none tracked (package-lock.json unchanged; node_modules is gitignored).
- **Verification:** `npx tsc --noEmit` then ran the project's real TypeScript compiler with zero errors.

**3. [Rule 1 - Bug] Fixed drift-reason text rendering as a Python list repr**
- **Found during:** Task 2 (live smoke-test of `GET /datasets` before committing)
- **Issue:** `generate_drift_reason` naively did `str(r.get("search_result", ""))` per result; when Cognee's GRAPH_COMPLETION returned a list-shaped completion (`["sentence"]` rather than a bare string), this rendered the literal Python repr `"['sentence']"` as the drift reason instead of clean text.
- **Fix:** Reused `backend/search.py`'s existing `_result_text()` normalizer (already handles both str and list-of-str/dict completions) instead of a raw `str()` call.
- **Files modified:** `backend/drift.py`
- **Verification:** Re-ran the live `GET /datasets` smoke test — reason now renders as clean prose.
- **Committed in:** `9ba4ef0` (part of Task 2's GREEN commit, since the bug was caught before that commit was made)

**4. [Rule 2 - Missing Critical] Wired `data-[health-state=*]` CSS so VersionTagBadge's color actually follows the drift state**
- **Found during:** Task 3
- **Issue:** 03-UI-SPEC.md and 03-PATTERNS.md both assert "color already follows `data-health-state`" as an existing fact from Phase 2, but no CSS in the codebase actually consumed that attribute — Phase 2 only wired the DOM attribute itself, not any styling. Without this, passing `healthState` into `VersionTagBadge` (the plan's literal Task 3 instruction) would have had zero visible effect, silently failing DRIFT-01's "diagnosis card badge reflects drift state" success criterion.
- **Fix:** Added Tailwind v4 `data-[health-state=stable]:border-drift-stable` (and `aging`/`drifting` equivalents) to `VersionTagBadge`'s className, per the plan's own instruction not to add JSX color-branching.
- **Files modified:** `frontend/components/DiagnosisCard.tsx`
- **Verification:** `npx tsc --noEmit` passes; the Badge's `data-health-state` attribute now has a matching CSS rule for every literal value the type allows.
- **Committed in:** `27a6c8e` (Task 3 commit)

**5. [Rule 1 - Bug] Cleared a stray `spike_incident` dataset the snapshot restore/reseed didn't remove**
- **Found during:** Task 1
- **Issue:** After the `--seed` fallback, `list_datasets()` still showed a `spike_incident` dataset (present in the snapshot tarball itself, unrelated to the v1.8/v1.9 flip) — the plan's acceptance criteria explicitly required no such strays remain (B-01 debris cleared).
- **Fix:** `cognee.forget(dataset="spike_incident")` — a one-off cleanup call, not part of the tracked codebase.
- **Files modified:** none (operational only).
- **Verification:** `list_datasets()` re-run afterward showed exactly `['incidents', 'workarounds_v1_8', 'workarounds_v1_9']`.

---

**Total deviations:** 5 auto-fixed (2 blocking-dependency installs, 2 bugs, 1 missing-critical-functionality)
**Impact on plan:** All five were necessary for correctness (drift-reason text quality, actually-visible badge color) or to unblock verification (missing test/build tooling, stray demo data) — no scope creep beyond what the plan's own acceptance criteria required.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required. (LLM/embedding provider is already configured from Phase 1's Mistral pivot; this phase adds no new environment variables.)

## Next Phase Readiness
- The drift-detection half of the core loop (search → drift-detected) is fully wired and live-verified against the restored Stripe demo arc.
- Plan 03-02 (Forget) can now build directly on `compute_drift_states`/`get_or_generate_reason` and the corpus's current live state (`incidents`, `workarounds_v1_8` [drifting], `workarounds_v1_9` [stable]) without any additional setup.
- No blockers. One open item for Plan 03-02 or later UAT: the live GRAPH_COMPLETION reason call and the frontend's actual pixel rendering are not covered by automated tests (see `coverage: D4/D5` `human_judgment: true`) — recommend a manual pass through `/gsd-verify-work` before the final demo rehearsal.

---
*Phase: 03-drift-forget*
*Completed: 2026-07-02*
