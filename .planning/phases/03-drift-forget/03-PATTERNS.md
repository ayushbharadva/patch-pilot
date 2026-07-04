# Phase 3: Drift + Forget - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 7
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/drift.py` (NEW) | service/utility | transform + event-driven (LLM call) | `backend/search.py` (version parsing) + `backend/feedback.py` (D-24 error wrapping) | role-match (composite) |
| `backend/forget.py` (NEW) | controller/route | request-response (destructive lifecycle verb) | `backend/feedback.py` | exact |
| `backend/search.py` (extend `_pick_primary_result`) | controller/route | request-response | itself (extend in place) | exact |
| `backend/datasets_router.py` (extend `GET /datasets`) | controller/route | CRUD (read) | itself (extend in place) | exact |
| `frontend/components/DatasetList.tsx` (extend) | component | request-response (query + mutation) | itself (extend) + `DiagnosisCard.tsx`'s `AcceptDismissControls` for the new `ForgetButton` sub-component | exact / role-match |
| `frontend/components/DiagnosisCard.tsx` (extend `VersionTagBadge`) | component | request-response | itself (extend) | exact |
| `frontend/lib/api.ts` (extend) | utility (typed fetch wrappers) | request-response | itself (extend) — `acceptFeedback`/`listDatasets` are the exact shape to copy for `forgetDataset`/`DatasetInfo` drift fields | exact |

## Pattern Assignments

### `backend/drift.py` (NEW — service, transform/event-driven)

**Analogs:** `backend/search.py` (version regex/sort-key reuse — do not duplicate), `backend/feedback.py` (D-24 error handling shape)

**Imports pattern** — copy `backend/search.py` lines 13-25 exactly (config-before-cognee-import keystone):
```python
import logging
import re

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from cognee import SearchType  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import INCIDENTS  # noqa: E402
```
Then import the shared regex/sort-key from search.py rather than redefining:
```python
from backend.search import _WORKAROUNDS_VERSION_RE, _version_sort_key
```

**Core pattern — pure classification function** (model on `search.py` lines 122-143, `_version_sort_key`/`_pick_primary_result`):
```python
def compute_drift_states(live_dataset_names: list[str]) -> dict[str, str]:
    versioned = [n for n in live_dataset_names if _WORKAROUNDS_VERSION_RE.match(n)]
    if not versioned:
        return {n: "stable" for n in live_dataset_names}
    highest = max(versioned, key=_version_sort_key)
    states = {}
    for name in live_dataset_names:
        if name == INCIDENTS or not _WORKAROUNDS_VERSION_RE.match(name):
            states[name] = "stable"
        elif name == highest:
            states[name] = "stable"
        else:
            states[name] = "drifting"
    return states
```

**Error handling pattern for the LLM reason call** — copy `backend/search.py` lines 203-205 / `backend/feedback.py` lines 76-83 (D-24: broad `except Exception`, log server-side, short fixed fallback string, never raw exception text):
```python
_FALLBACK_REASON = "A newer release supersedes this workaround."

async def generate_drift_reason(newest_dataset_name: str) -> str:
    try:
        results = await asyncio.wait_for(
            cognee.search(
                query_text="Why does this release make the prior workaround unnecessary?",
                query_type=SearchType.GRAPH_COMPLETION,
                datasets=[newest_dataset_name],
                system_prompt=DRIFT_REASON_PROMPT,
            ),
            timeout=_REASON_TIMEOUT_SECONDS,
        )
        text = " ".join(str(r.get("search_result", "")) for r in results).strip()
        return text or _FALLBACK_REASON
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        return _FALLBACK_REASON
```

**Cache pattern** (module-level dict, single-worker safe — new for this phase, no existing analog needed, but follows the "plain module state" convention already used by `backend/sessions.py`'s in-process session store):
```python
_reason_cache: dict[tuple[str, str], str] = {}

async def get_or_generate_reason(drifting_name: str, current_highest_name: str) -> str:
    key = (drifting_name, current_highest_name)
    if key in _reason_cache:
        return _reason_cache[key]
    reason = await generate_drift_reason(current_highest_name)
    _reason_cache[key] = reason
    return reason
```

---

### `backend/forget.py` (NEW — controller, request-response, destructive)

**Analog:** `backend/feedback.py` (copy structure almost verbatim — this is the closest possible match: single POST route, Pydantic request model, validate-before-lifecycle-verb, D-24 error shape)

**Imports pattern** (copy `backend/feedback.py` lines 12-20):
```python
import logging

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from fastapi import APIRouter  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import INCIDENTS  # noqa: E402
from backend.search import _WORKAROUNDS_VERSION_RE  # noqa: E402

router = APIRouter()
logger = logging.getLogger(__name__)
```

**Validation pattern** (copy `backend/feedback.py`'s `_is_known_dataset`, lines 36-43, extended with the durable-dataset guard called out in RESEARCH.md Pattern 5):
```python
async def _is_forgettable_workaround(name: str) -> bool:
    if name == INCIDENTS or not _WORKAROUNDS_VERSION_RE.match(name):
        return False
    all_datasets = await cognee.datasets.list_datasets()
    return any(ds.name == name for ds in all_datasets)
```

**Core request-response pattern + error handling** (copy `backend/feedback.py` lines 46-83 almost verbatim, swapping `improve()`/`add_feedback()` for `cognee.forget(dataset=...)`):
```python
class ForgetRequest(BaseModel):
    dataset: str = Field(..., min_length=1)

_MSG_INVALID_DATASET = "That dataset can't be forgotten."
_MSG_ERROR = "Could not forget dataset. Please try again."

@router.post("/forget")
async def forget_dataset(request: ForgetRequest):
    try:
        if not await _is_forgettable_workaround(request.dataset):
            logger.warning("forget blocked: invalid target dataset=%r", request.dataset)
            return {"status": "error", "message": _MSG_INVALID_DATASET}

        await cognee.forget(dataset=request.dataset)
        return {"status": "forgotten", "dataset": request.dataset}
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        logger.exception("forget failed for dataset=%s", request.dataset)
        return {"status": "error", "message": _MSG_ERROR}
```

**Registration:** register `router` in `backend/main.py` next to the other four routers (`search.router`, `feedback.router`, `datasets_router.router`, `ingest.router`) — same include pattern, no new CORS config.

---

### `backend/search.py` (extend `_pick_primary_result`)

**Analog:** itself — extend in place, do not rewrite (RESEARCH.md Pattern 2)

**Current code to extend** (lines 135-143):
```python
def _pick_primary_result(results: list[dict]) -> dict | None:
    candidates = [r for r in results if _result_text(r.get("search_result"))]
    if not candidates:
        return None
    candidates.sort(key=lambda r: _version_sort_key(r.get("dataset_name")), reverse=True)
    return candidates[0]
```

**New signature/filter** — add a `drift_states` param and a second candidate condition, computed once per `/search` call from `_active_search_datasets()`'s own return value via `backend.drift.compute_drift_states`:
```python
def _pick_primary_result(results: list[dict], drift_states: dict[str, str]) -> dict | None:
    candidates = [
        r for r in results
        if _result_text(r.get("search_result"))
        and drift_states.get(r.get("dataset_name"), "stable") != "drifting"
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda r: _version_sort_key(r.get("dataset_name")), reverse=True)
    return candidates[0]
```
Call site in `search()` (currently line 207: `primary = _pick_primary_result(root_cause_results)`) must compute `drift_states = compute_drift_states(datasets)` from the already-fetched `datasets` list (line 177) before calling. The `/search` response dict (lines 228-235) also needs a `drift_state` field for the winning `source_dataset`, per UI-SPEC's Interaction Contract point 6 — add `"drift_state": drift_states.get(primary.get("dataset_name")) if primary else None`.

**Error handling** — unchanged, still the existing `except Exception` block at lines 203-205 wraps the whole `cognee.search()` pair; no new try/except needed since `compute_drift_states` is pure/local.

---

### `backend/datasets_router.py` (extend `GET /datasets`)

**Analog:** itself — extend in place

**Current code to extend** (lines 41-55):
```python
@router.get("/datasets")
async def list_datasets():
    all_datasets = await cognee.datasets.list_datasets()
    display_datasets = [ds for ds in all_datasets if _is_display_dataset(ds.name)]
    result = []
    for ds in display_datasets:
        try:
            doc_count = len(await cognee.datasets.list_data(ds.id))
        except Exception:  # noqa: BLE001 - D-24: one bad dataset must not break the whole list
            logger.exception("could not resolve doc count for dataset=%s", ds.name)
            doc_count = 0
        result.append({"name": ds.name, "doc_count": doc_count})
    return result
```

**Extension pattern** — import `compute_drift_states`/`get_or_generate_reason` from `backend/drift.py`, compute states once over all display dataset names, and for any `"drifting"` dataset call the cached reason getter (passing the current highest-version dataset name as the second cache-key component). Preserve the existing per-dataset `try/except` isolation (D-24: "one bad dataset must not break the whole list") — wrap the new reason-generation call the same defensive way:
```python
from backend.drift import compute_drift_states, get_or_generate_reason

@router.get("/datasets")
async def list_datasets():
    all_datasets = await cognee.datasets.list_datasets()
    display_datasets = [ds for ds in all_datasets if _is_display_dataset(ds.name)]
    names = [ds.name for ds in display_datasets]
    drift_states = compute_drift_states(names)
    highest = max((n for n in names if drift_states.get(n) != "drifting"), default=None, key=_version_sort_key)
    result = []
    for ds in display_datasets:
        try:
            doc_count = len(await cognee.datasets.list_data(ds.id))
        except Exception:  # noqa: BLE001
            logger.exception("could not resolve doc count for dataset=%s", ds.name)
            doc_count = 0
        state = drift_states.get(ds.name, "stable")
        reason = None
        if state == "drifting" and highest:
            reason = await get_or_generate_reason(ds.name, highest)
        result.append({"name": ds.name, "doc_count": doc_count, "drift_state": state, "drift_reason": reason})
    return result
```
(Planner should verify exact `highest`-name resolution logic against `backend/drift.py`'s actual implementation once written — the shape above illustrates the extension point, not a mandated exact line.)

---

### `frontend/components/DatasetList.tsx` (extend)

**Analog:** itself (row shape/reserved slot) + `DiagnosisCard.tsx`'s `AcceptDismissControls` (lines 119-193) for the new `ForgetButton` sub-component's two-step confirm/mutation/error pattern

**Current reserved slot to fill** (lines 41-51):
```tsx
<div
  key={dataset.name}
  className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
>
  {/* Reserved slot: Phase 3's 🟢/🟡/🔴 drift badge lands here,
      same row, no layout change. */}
  <span className="size-2 shrink-0 rounded-full bg-transparent" aria-hidden="true" />
  <span className="font-mono text-sm text-foreground">
    {dataset.name} · {dataset.doc_count} docs
  </span>
</div>
```
Fill the dot with `bg-drift-{state}` (once `app/globals.css`'s `@theme inline` block registers the three drift color vars per UI-SPEC), add a text label, a reason `<p>` beneath for `drifting` rows, and a `ForgetButton` rendered only when `drift_state === "drifting"`.

**Mutation + two-step confirm pattern to copy** — mirror `AcceptDismissControls`'s `useState` flags (`isAccepting`/`accepted`/`error`) and its `handleAccept` async-call-then-branch-on-`result.status` shape (lines 128-154), swapping in `forgetDataset()` and a `confirming` boolean instead of `accepted`:
```tsx
const [confirming, setConfirming] = useState(false);
const [isForgetting, setIsForgetting] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handleForget() {
  setIsForgetting(true);
  setError(null);
  const result = await forgetDataset({ dataset: dataset.name });
  setIsForgetting(false);
  if (result.status === "forgotten") {
    queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
    onForgotten?.(); // triggers re-search per UI-SPEC Interaction Contract point 4
  } else {
    setError(result.message);
    setConfirming(false);
  }
}
```
**Query invalidation pattern** — copy the existing `DATASETS_QUERY_KEY` export (line 13) and its `queryClient.invalidateQueries` usage convention already established in `UploadPanel.tsx` (per this file's own docstring, lines 8-11).

---

### `frontend/components/DiagnosisCard.tsx` (extend `VersionTagBadge`)

**Analog:** itself — the `healthState` prop and `data-health-state` attribute are already wired (lines 41-62), reserved exactly for this phase

**Current code** (lines 52-62):
```tsx
function VersionTagBadge({ dataset, healthState }: VersionTagBadgeProps) {
  return (
    <Badge
      variant="outline"
      data-health-state={healthState ?? "neutral"}
      className="shrink-0 font-mono text-xs font-normal text-muted-foreground"
    >
      {versionTagFromDataset(dataset)}
    </Badge>
  );
}
```
**Extension:** wire the real `healthState` value from `response.drift_state` (new field on `SearchResponseOk`) at the call site (line 217: `<VersionTagBadge dataset={response.source_dataset} />` → `<VersionTagBadge dataset={response.source_dataset} healthState={response.drift_state ?? undefined} />`). Apply border/text color per `data-health-state` via CSS (already anticipated by the attribute selector approach) — no JSX color-branching needed inside the component itself, matching the existing "color follows the attribute, not conditional className logic" pattern.

---

### `frontend/lib/api.ts` (extend)

**Analog:** itself — `acceptFeedback` (lines 210-240) is the exact shape for `forgetDataset`; `DatasetInfo`/`listDatasets` (lines 242-259) is the exact shape to extend for drift fields

**New `forgetDataset` wrapper** (copy `acceptFeedback`'s try/catch/status-branch shape exactly, lines 210-240):
```typescript
interface ForgetForgottenResponse {
  status: "forgotten";
  dataset: string;
}

interface ForgetErrorResponse {
  status: "error";
  message: string;
}

export type ForgetResponse = ForgetForgottenResponse | ForgetErrorResponse;

export async function forgetDataset({
  dataset,
}: {
  dataset: string;
}): Promise<ForgetResponse> {
  try {
    const res = await fetch(`${API_BASE}/forget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset }),
    });

    if (!res.ok) {
      return {
        status: "error",
        message: "Could not forget dataset. Please try again.",
      };
    }

    return (await res.json()) as ForgetResponse;
  } catch {
    return {
      status: "error",
      message: "Could not forget dataset. Please try again.",
    };
  }
}
```

**Extend `DatasetInfo`** (currently lines 243-246):
```typescript
export interface DatasetInfo {
  name: string;
  doc_count: number;
  drift_state: "stable" | "aging" | "drifting";
  drift_reason: string | null;
}
```

**Extend `SearchResponseOk`** (currently lines 17-24) with the new field per UI-SPEC Interaction Contract point 6:
```typescript
interface SearchResponseOk {
  status: "ok";
  root_cause: string;
  evidence: EvidenceSnippet[];
  source_dataset: string | null;
  session_id: string;
  qa_id: string | null;
  drift_state: "stable" | "aging" | "drifting" | null;
}
```
`listDatasets()` itself (lines 253-259) needs no structural change — same fetch shape, just a wider response type.

---

## Shared Patterns

### Config-before-Cognee-import keystone
**Source:** `backend/search.py` lines 8-25, `backend/feedback.py` lines 7-21, `backend/datasets_router.py` lines 4-17
**Apply to:** `backend/drift.py`, `backend/forget.py` (both new modules)
```python
from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)
import cognee  # noqa: E402
from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
```

### D-24 error handling — short human message, never raw exception text
**Source:** `backend/feedback.py` lines 76-83, `backend/search.py` lines 203-205, `backend/datasets_router.py` lines 49-53
**Apply to:** `backend/forget.py`, `backend/drift.py`'s LLM call, and all new frontend fetch wrappers in `frontend/lib/api.ts`
```python
except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
    logger.exception("...")
    return {"status": "error", "message": "<short fixed message>"}
```

### Validate-before-lifecycle-verb
**Source:** `backend/feedback.py` lines 36-43 (`_is_known_dataset`)
**Apply to:** `backend/forget.py`'s `_is_forgettable_workaround` — same pattern plus an extra durable-dataset denylist (`incidents`, `healthcheck`, `canary`)

### Shared version-parsing (do not duplicate)
**Source:** `backend/search.py` lines 39, 122-132 (`_WORKAROUNDS_VERSION_RE`, `_version_sort_key`)
**Apply to:** `backend/drift.py` must import these, never redefine them

### React Query invalidation on mutation success
**Source:** `frontend/components/DatasetList.tsx` lines 8-13 (`DATASETS_QUERY_KEY` export + docstring convention), `DiagnosisCard.tsx`'s `onReSearch` callback prop pattern (lines 150, 195-201)
**Apply to:** The new `ForgetButton`'s success path — invalidate `DATASETS_QUERY_KEY` and call an `onForgotten`/`onReSearch`-style callback prop, mirroring Accept's `onReSearch?.()` call exactly (D-12 pattern reused per CONTEXT.md/UI-SPEC)

### Two-step inline destructive confirm (no modal)
**Source:** `frontend/components/DiagnosisCard.tsx`'s `AcceptDismissControls` (lines 119-193) — local `useState` flags gate which buttons render, no `alert-dialog` component
**Apply to:** `ForgetButton` sub-component in `DatasetList.tsx` — `Forget` → `Confirm forget?` + `Cancel` in place, per UI-SPEC Interaction Contract point 3

## No Analog Found

None — every file in this phase has a strong existing analog (Phase 2's `feedback.py` and `search.py`/`datasets_router.py`/`DiagnosisCard.tsx`/`DatasetList.tsx`/`api.ts` cover all seven files with exact or role-match quality).

## Metadata

**Analog search scope:** `backend/` (search.py, feedback.py, datasets_router.py, datasets.py, main.py, sessions.py, ingest.py), `frontend/components/` (DatasetList.tsx, DiagnosisCard.tsx), `frontend/lib/api.ts`
**Files scanned:** 9
**Pattern extraction date:** 2026-07-02
