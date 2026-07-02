---
phase: 03-drift-forget
reviewed: 2026-07-02T16:45:42Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - backend/datasets_router.py
  - backend/drift.py
  - backend/forget.py
  - backend/main.py
  - backend/search.py
  - backend/tests/test_drift_forget.py
  - frontend/app/globals.css
  - frontend/app/page.tsx
  - frontend/components/DatasetList.tsx
  - frontend/components/DiagnosisCard.tsx
  - frontend/lib/api.ts
findings:
  critical: 2
  warning: 2
  info: 3
  total: 7
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-07-02T16:45:42Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Reviewed the Drift + Forget phase (DRIFT-01/02/03, FORGET-01/02): the shared
`compute_drift_states` classifier in `backend/drift.py`, its two call sites
(`backend/datasets_router.py` GET `/datasets`, `backend/search.py` POST
`/search`), the surgical-forget route in `backend/forget.py`, and the
matching frontend (`DatasetList.tsx`, `DiagnosisCard.tsx`, `page.tsx`,
`lib/api.ts`, `globals.css`).

Two Critical-severity issues were found, both of which strike at the
project's stated core value ("search → drift-detected → forget → re-search
loop must work ... visibly"):

1. `/datasets` and `/search` feed **different candidate-dataset lists** into
   the shared `compute_drift_states()` classifier, which can make the two
   endpoints visibly disagree about which dataset is drifting — directly
   contradicting the explicit design invariant documented in both files'
   docstrings ("the two endpoints can never disagree").
2. `backend/forget.py`'s `_is_forgettable_workaround` never checks drift
   state, so the backend will forget the **current, non-drifting, best**
   `workarounds_v{N}` dataset if asked to — the UI only hides the Forget
   button on non-drifting rows, but nothing enforces this server-side. The
   test suite itself asserts this behavior as correct, confirming it is not
   an oversight caught by tests.

Warnings and info items cover a stale-reason-cache edge case around forget,
duplicated highest-version logic, and minor consistency nits.

## Critical Issues

### CR-01: `/datasets` and `/search` can disagree about which dataset is drifting

**File:** `backend/search.py:88-117, 197, 229-231` and `backend/datasets_router.py:51-59`

**Issue:**
Both endpoints call the same `compute_drift_states()` function (by design,
per both modules' docstrings: "computed via the same shared classifier
`/search` uses so the two endpoints can never disagree"), but they pass it
**different input lists**:

- `datasets_router.py:51-54` computes drift over **every live display
  dataset**, regardless of whether it has any documents yet:
  ```python
  all_datasets = await cognee.datasets.list_datasets()
  display_datasets = [ds for ds in all_datasets if _is_display_dataset(ds.name)]
  names = [ds.name for ds in display_datasets]
  drift_states = compute_drift_states(names)
  ```
- `search.py:197` computes drift over only the **"active" subset that has
  `doc_count > 0`** (via `_active_search_datasets()`, `search.py:88-117`),
  then reuses that filtered list for drift classification at `search.py:231`:
  ```python
  datasets = await _active_search_datasets()   # doc_count > 0 only
  ...
  drift_states = compute_drift_states(datasets)  # same filtered list
  ```

`compute_drift_states` determines the "highest" version purely from its
input list (`drift.py:81`, `max(versioned, key=_version_sort_key)`). If a
new `workarounds_v{N+1}` dataset exists but hasn't finished `cognify()` yet
(doc_count still 0 — exactly the state right after a release upload, which
is the phase's headline demo scenario), then:

- `GET /datasets` includes the new, still-empty `v{N+1}` in its list, so it
  becomes the "highest" and `v{N}` is marked `"drifting"` (🔴, with a
  generated reason).
- `POST /search` excludes the still-empty `v{N+1}` from its active list, so
  `v{N}` is the only versioned dataset present and is computed as
  `"stable"` — it is used as the primary diagnosis and its
  `VersionTagBadge` renders as non-drifting.

The dataset list and the diagnosis card will show contradictory health
states for the same dataset during exactly the transient "just uploaded a
release, still cognifying" window that the product's core demo is built
around.

**Fix:** Compute drift state from the same *full* candidate list in both
places — do not reuse the "has documents" filtered list for classification.
For example, expose a name-only listing helper and use it in both routes:

```python
# search.py
async def _all_workaround_dataset_names() -> list[str]:
    """Every live incidents/workarounds_v{N} name, regardless of doc_count —
    used for drift classification so /search and /datasets never disagree."""
    all_datasets = await cognee.datasets.list_datasets()
    return [d.name for d in all_datasets if d.name == INCIDENTS or d.name.startswith("workarounds_v")]

@router.post("/search")
async def search(request: SearchRequest):
    ...
    datasets = await _active_search_datasets()       # for the actual cognee.search() calls
    if not datasets:
        return {"status": "no_results"}
    ...
    from backend.drift import compute_drift_states
    all_names = await _all_workaround_dataset_names()  # for classification
    drift_states = compute_drift_states(all_names)
    primary = _pick_primary_result(root_cause_results, drift_states)
```

### CR-02: Forget endpoint has no server-side check that a dataset is actually drifting

**File:** `backend/forget.py:41-52`, confirmed by `backend/tests/test_drift_forget.py:140-155`

**Issue:**
`_is_forgettable_workaround` only rejects (a) the `incidents` dataset and
(b) names that don't match `workarounds_v{N}` or don't exist. It never
checks `compute_drift_states()` to require the target actually be
`"drifting"`:

```python
async def _is_forgettable_workaround(name: str) -> bool:
    if name == INCIDENTS or not _WORKAROUNDS_VERSION_RE.match(name):
        return False
    all_datasets = await cognee.datasets.list_datasets()
    return any(ds.name == name for ds in all_datasets)
```

The frontend only renders the Forget button on 🔴 rows
(`DatasetList.tsx:131-133`, `isDrifting ? <ForgetButton .../> : null`), but
that is a **client-side-only** restriction — any direct `POST /forget` call
(curl, devtools, a future client) can forget the current, non-drifting,
highest-version `workarounds_v{N}` dataset — i.e. the one workaround that is
actually correct and in active use — with no server-side guard against it.
This is an irrecoverable data-loss path for the app's core memory.

This is not an oversight missed by tests — the test suite explicitly
codifies the buggy behavior as correct:

```python
# backend/tests/test_drift_forget.py:140-155
async def test_is_forgettable_workaround_accepts_live_workaround(monkeypatch):
    """A live workarounds_v{N} present in list_datasets() is forgettable."""
    fake_datasets = [
        _FakeDataset(INCIDENTS),
        _FakeDataset("workarounds_v1_8"),
        _FakeDataset("workarounds_v1_9"),
    ]
    ...
    assert await _is_forgettable_workaround("workarounds_v1_9")
```

Given only `v1_8` and `v1_9` exist, `v1_9` is the highest version and is
therefore `"stable"` under `compute_drift_states` — yet the test asserts it
is forgettable, matching the current (buggy) implementation.

**Fix:** Require `compute_drift_states` to classify the target as
`"drifting"` before allowing forget:

```python
async def _is_forgettable_workaround(name: str) -> bool:
    if name == INCIDENTS or not _WORKAROUNDS_VERSION_RE.match(name):
        return False
    all_datasets = await cognee.datasets.list_datasets()
    names = [ds.name for ds in all_datasets if ds.name == INCIDENTS or ds.name.startswith("workarounds_v")]
    if name not in names:
        return False
    from backend.drift import compute_drift_states
    return compute_drift_states(names).get(name) == "drifting"
```

and update `test_is_forgettable_workaround_accepts_live_workaround` to use a
genuinely drifting dataset (e.g. add a `workarounds_v1_10` so `v1_9` is
drifting) rather than asserting the highest/stable version is forgettable.

## Warnings

### WR-01: Drift-reason cache is never invalidated on forget

**File:** `backend/drift.py:56, 125-134`; `backend/forget.py:55-71`

**Issue:** `_reason_cache` (`drift.py:56`) is keyed on
`(drifting_name, current_highest_name)` and is explicitly documented as
"intentionally unbounded" (size), but it is also never pruned or
invalidated on `/forget`. If a `workarounds_v{N}` dataset is forgotten and a
dataset with the exact same name is later re-ingested while the current
highest is unchanged, `get_or_generate_reason` (`drift.py:125-134`) will
serve the stale, pre-forget cached reason string instead of generating a
fresh one for the new content.

**Fix:** On successful forget, purge any cache entries whose
`drifting_name` matches the forgotten dataset:

```python
# forget.py, after a successful cognee.forget(dataset=request.dataset)
from backend.drift import _reason_cache
for key in [k for k in _reason_cache if k[0] == request.dataset]:
    del _reason_cache[key]
```

### WR-02: `datasets_router.py` re-derives "highest" instead of reusing `compute_drift_states`'s internal notion of it

**File:** `backend/datasets_router.py:55-59`

**Issue:** `list_datasets()` independently recomputes the highest live
version via `max((n for n in names if drift_states.get(n) != "drifting"), ...)`
to pass into `get_or_generate_reason`, duplicating logic that
`compute_drift_states` (`backend/drift.py:80-81`) already computes
internally to decide `"drifting"` vs `"stable"`. The two computations
currently agree only because of an implicit invariant (the max versioned
name can never itself be classified `"drifting"`) that isn't enforced by a
shared interface — a future change to `compute_drift_states`'s precedence
rules (e.g. adding a new state) could silently desync this call site.

**Fix:** Have `compute_drift_states` optionally return (or have a sibling
helper return) the winning highest-version name directly, so callers never
re-derive it:

```python
def compute_drift_states(...) -> tuple[dict[str, str], str | None]:
    ...
    return states, highest
```

## Info

### IN-01: `listDatasets` uses a different error-handling convention than every other API wrapper

**File:** `frontend/lib/api.ts:314-320`

**Issue:** Every other wrapper in this file (`searchIncident`, `uploadFiles`,
`pollIngestStatus`, `loadSampleData`, `acceptFeedback`, `forgetDataset`)
catches network/parse failures and normalizes them into a typed
`{status: "error", ...}` value, per the file's own stated convention
("Network/parse failures are normalized into the `error` variant"). `listDatasets`
instead throws on a non-OK response and lets `res.json()` failures propagate
uncaught:

```ts
export async function listDatasets(): Promise<DatasetInfo[]> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) {
    throw new Error("Could not load datasets.");
  }
  return (await res.json()) as DatasetInfo[];
}
```

This works today because `DatasetList.tsx` consumes it via
`useQuery`/`isError`, but it breaks the file's documented convention and
would silently stop working (unhandled rejection) if ever called outside a
React Query context.

**Fix:** Either keep it consistent with the rest of the file (return a
typed error/empty-array result and let the caller check it) or add an
explicit comment noting `listDatasets` intentionally deviates because it's
always driven by `useQuery`.

### IN-02: Version-tag regex duplicated across the language boundary

**File:** `backend/search.py:47` (`_WORKAROUNDS_VERSION_RE`) and
`frontend/components/DiagnosisCard.tsx:30-39` (`versionTagFromDataset`)

**Issue:** Both files independently hardcode
`^workarounds_v(\d+)(?:_(\d+))?$`. They agree today, but nothing enforces
that they stay in sync if the naming convention ever changes — a change to
the backend regex alone would silently break version-tag rendering on the
frontend without any test catching it.

**Fix:** No cross-language shared source is practical here, but consider
adding a contract test (e.g. a snapshot fixture asserting a handful of
dataset names produce matching results on both sides) or at least a
`// keep in sync with backend/search.py:_WORKAROUNDS_VERSION_RE` comment on
both definitions (only the frontend currently lacks this cross-reference).

### IN-03: Magic number `feedback_influence=0.5` not named as a constant

**File:** `backend/search.py:213`

**Issue:** The module already defines named constants for other tunables
(`MAX_QUERY_LENGTH`, `EVIDENCE_LIMIT`, `EXCERPT_LENGTH`,
`_REASON_TIMEOUT_SECONDS` in `drift.py`), but `feedback_influence=0.5` is
inlined at the call site with only a comment explaining why it must be
non-zero.

**Fix:**
```python
# Library default is 0.0 — must be explicit or a reinforced fix's
# feedback_weight has zero effect on ranking (Pitfall 3).
FEEDBACK_INFLUENCE = 0.5
...
feedback_influence=FEEDBACK_INFLUENCE,
```

---

_Reviewed: 2026-07-02T16:45:42Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
