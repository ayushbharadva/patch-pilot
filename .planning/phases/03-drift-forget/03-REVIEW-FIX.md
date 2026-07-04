---
phase: 03-drift-forget
fixed_at: 2026-07-02T16:54:14Z
review_path: .planning/phases/03-drift-forget/03-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-07-02T16:54:14Z
**Source review:** .planning/phases/03-drift-forget/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (CR-01, CR-02, WR-01, WR-02 — Info items IN-01/IN-02/IN-03 excluded per fix_scope=critical_warning)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: `/datasets` and `/search` can disagree about which dataset is drifting

**Files modified:** `backend/search.py`
**Commit:** `19344ed`
**Applied fix:** Added `_all_workaround_dataset_names()` — a new helper that
lists every live `incidents`/`workarounds_v{N}` dataset name regardless of
`doc_count`. `POST /search` now calls this helper to build the candidate
list passed to `compute_drift_states()`, instead of reusing the
`doc_count > 0`-filtered `_active_search_datasets()` list. `_active_search_datasets()`
is still used (unchanged) for the actual `cognee.search()` calls. This
matches `GET /datasets`'s classification input (every live display dataset),
so a just-uploaded, still-cognifying `workarounds_v{N+1}` is now visible to
both endpoints' drift classification during the transient "just released,
still cognifying" window — closing the disagreement window described in the
finding.

### CR-02: Forget endpoint has no server-side check that a dataset is actually drifting

**Files modified:** `backend/forget.py`, `backend/tests/test_drift_forget.py`
**Commit:** `dedc271`
**Applied fix:** `_is_forgettable_workaround` now additionally requires
`compute_drift_states(names).get(name) == "drifting"` before allowing forget
— a name must be shaped like `workarounds_v{N}`, present in the live dataset
list, AND classified `"drifting"` by the same shared classifier `/search`
and `/datasets` use. The pre-existing test
`test_is_forgettable_workaround_accepts_live_workaround` (which asserted the
highest/stable `workarounds_v1_9` was forgettable — the exact buggy
behavior CR-02 flags) was renamed to
`test_is_forgettable_workaround_accepts_live_drifting_workaround` and now
adds a `workarounds_v1_10` so `v1_9` is genuinely drifting before asserting
forgettability. A new test,
`test_is_forgettable_workaround_rejects_current_highest_version`, asserts
the corrected (safe) behavior directly: the current, non-drifting, highest
version (`v1_9` with only `v1_8`/`v1_9` present) is now rejected. Full
backend test suite (43 tests) passes after this change.

### WR-01: Drift-reason cache is never invalidated on forget

**Files modified:** `backend/forget.py`
**Commit:** `5b69fc4`
**Applied fix:** After a successful `cognee.forget(dataset=...)` call in
`POST /forget`, any `_reason_cache` entries whose key's `drifting_name`
matches the forgotten dataset are now purged, so a same-named dataset
re-ingested later (while the current highest is unchanged, keeping the
cache key identical) will trigger a fresh live reason generation instead of
serving the stale pre-forget cached string.

### WR-02: `datasets_router.py` re-derives "highest" instead of reusing `compute_drift_states`'s internal notion of it

**Files modified:** `backend/drift.py`, `backend/datasets_router.py`
**Commit:** `913fa63`
**Applied fix:** Adopted the "sibling helper" option from the finding's Fix
section (rather than changing `compute_drift_states`'s return type to a
tuple, which would have required updating every existing caller and test
that expects a plain dict). Extracted a new `highest_live_version()`
function in `backend/drift.py` that contains the exact "highest" computation
`compute_drift_states` uses internally; `compute_drift_states` now calls
this helper instead of inlining the `max()` logic. `datasets_router.py` now
imports and calls `highest_live_version(names)` directly instead of
re-deriving the highest name via its own
`max((n for n in names if drift_states.get(n) != "drifting"), ...)`
expression, eliminating the duplicated (and only implicitly-correct) logic.
The now-unused `_version_sort_key` import was removed from
`datasets_router.py` since `highest_live_version` encapsulates that
comparison internally.

## Skipped Issues

None — all in-scope findings were fixed.

---

**Post-fix verification (full suite, run after all 4 commits):**
- `backend/tests/` — 43 passed (`.venv/bin/python -m pytest backend/tests/ -x -q`)
- `frontend` — `npx tsc --noEmit` clean, no errors (no frontend files were
  touched by this fix pass; run as a regression sanity check per task
  instructions)

_Fixed: 2026-07-02T16:54:14Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
