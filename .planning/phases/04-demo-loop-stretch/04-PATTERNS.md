# Phase 4: Demo Loop + Stretch - Pattern Map

**Mapped:** 2026-07-03
**Files analyzed:** 12
**Analogs found:** 10 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `backend/reset.py` | route/service | request-response (destructive/file-I/O) | `backend/forget.py` (router shape) + `scripts/snapshot_memory.py` (restore mechanism) | role-match (composite) |
| `backend/graph.py` | route | request-response (transform) | `backend/datasets_router.py` (GET returning shaped JSON list) | exact |
| `backend/main.py` (modified) | config/router registration | request-response | itself — `app.include_router(...)` block | exact |
| `backend/search.py` (modified, STRETCH-01) | route/service | request-response | itself — `_flatten_and_truncate`/`cognee.search(..., query_type=SearchType.CHUNKS)` call | exact |
| `frontend/lib/api.ts` (modified) | utility (typed fetch wrappers) | request-response | itself — `forgetDataset`/`listDatasets` wrapper pattern | exact |
| `frontend/components/MemoryGraphView.tsx` | component (client, 3D viz) | streaming/render (client-only WebGL) | none in-repo — new pattern; use RESEARCH.md Code Example verbatim | no analog |
| `frontend/components/ui/dialog.tsx` | component (ui primitive) | request-response (UI state) | none in-repo (`npx shadcn add dialog` generates it) | no analog (generated, not hand-authored) |
| `frontend/components/ResetButton.tsx` | component | request-response (destructive action + modal) | `frontend/components/DatasetList.tsx`'s `ForgetButton` (mutation/loading/error local-state shape) + new `ui/dialog.tsx` for the modal wrapper | role-match |
| `frontend/components/DiagnosisCard.tsx` (modified, STRETCH-01) | component | request-response | itself — `VersionTagBadge` (badge-in-card-header pattern) | exact |
| `frontend/components/HealthDashboard.tsx` | component | transform (client-side aggregation) | `frontend/components/DatasetList.tsx` (drift badge color map + `useQuery(listDatasets)` read) | role-match |
| `frontend/components/IncidentTimeline.tsx` | component | transform (chronological render) | `frontend/components/DatasetList.tsx` (Card + list-of-rows shape) — weakest match, no timeline precedent | partial |
| `frontend/app/page.tsx` (modified) | page (client) | request-response (orchestration) | itself — existing tab-less single-page section layout | exact |
| `seed/workarounds_v1_8/*.md`, `seed/workarounds_v1_9/*.md`, `seed/incidents/*.md` (new docs) | seed content | batch/file-I/O | `seed/workarounds_v1_8/nightly-dedup-workaround.md`, `seed/workarounds_v1_9/release-v1.9.md` (existing doc structure/tone) | exact |

## Pattern Assignments

### `backend/reset.py` (route, destructive/file-I/O)

**Analogs:** `backend/forget.py` (router/error-handling shape) + `scripts/snapshot_memory.py` (the restore engine it wraps)

**Imports pattern** — copy `backend/forget.py` lines 1-29 verbatim (config-before-cognee import order):
```python
import logging

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from fastapi import APIRouter  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)

router = APIRouter()
logger = logging.getLogger(__name__)

_MSG_ERROR = "Could not reset memory. Please try again."
```

**Core pattern** — RESEARCH.md's verified skeleton (Pattern 4 / "Reset endpoint skeleton") is the load-bearing code; do not hand-roll the engine-cache-clear sequence:
```python
@router.post("/reset")
async def reset_memory():
    try:
        from cognee.infrastructure.databases.vector.create_vector_engine import _create_vector_engine
        from cognee.infrastructure.databases.graph.get_graph_engine import _create_graph_engine
        from cognee.infrastructure.databases.relational import get_relational_engine
        from cognee.infrastructure.databases.relational.create_relational_engine import create_relational_engine

        db_engine = get_relational_engine()
        await db_engine.engine.dispose()
        create_relational_engine.cache_clear()
        _create_vector_engine.cache_clear()
        _create_graph_engine.cache_clear()

        from scripts import snapshot_memory
        snapshot_memory.restore()
        return {"status": "reset"}
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        logger.exception("reset failed")
        return {"status": "error", "message": _MSG_ERROR}
```

**Error handling pattern** (from `backend/forget.py` lines 88-90) — broad `except Exception`, `logger.exception`, fixed short human message, never raw exception text. Same shape reused verbatim above.

**Do NOT** import `cognee` inside `scripts/snapshot_memory.py` — it stays pure-filesystem (module docstring, lines 11-17); do the engine-release dance in `backend/reset.py` and delegate to the unmodified `snapshot_memory.restore()` (lines 58-67).

---

### `backend/graph.py` (route, request-response/transform)

**Analog:** `backend/datasets_router.py` (GET endpoint shaping a live Cognee list into JSON for the frontend)

**Imports pattern** (mirror `backend/datasets_router.py` lines 10-19):
```python
import logging

from backend import cognee_config  # noqa: F401,E402

import cognee  # noqa: E402
from fastapi import APIRouter  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402
from backend.search import _active_search_datasets  # reuse live-dataset discovery, don't re-derive

router = APIRouter()
logger = logging.getLogger(__name__)
```

**Core pattern** — reuse `_active_search_datasets()` (backend/search.py lines 88-117) for the live dataset list (same "don't disagree with /search" discipline `datasets_router.py` already follows at line 52-57), then call cognee's own aggregation per RESEARCH.md Pattern 3:
```python
from cognee.modules.users.methods import get_default_user
from cognee.modules.data.methods import get_authorized_existing_datasets
from cognee.modules.visualization.cognee_network_visualization import aggregate_multi_user_graphs

@router.get("/graph")
async def get_memory_graph():
    try:
        names = await _active_search_datasets()
        user = await get_default_user()
        datasets = await get_authorized_existing_datasets(names, "read", user)
        pairs = [(user, ds) for ds in datasets]
        nodes, edges = await aggregate_multi_user_graphs(pairs)
        return {
            "nodes": [
                {"id": nid, "label": (props.get("name") or props.get("type") or nid)[:80],
                 "group": props.get("type", "unknown")}
                for nid, props in nodes
            ],
            "links": [
                {"source": s, "target": t, "label": rel}
                for s, t, rel, _props in edges
            ],
        }
    except Exception:  # noqa: BLE001 - D-24
        logger.exception("graph export failed")
        return {"status": "error", "message": "Could not load memory graph. Please try again."}
```

**Error handling pattern**: same D-24 broad-except / `logger.exception` / fixed message shape as `datasets_router.py` lines 62-72 (per-item try/except so one bad dataset doesn't break the whole response — consider the same defensive wrapping here for `get_graph_data` per-dataset if aggregation ever partially fails).

**Trim large fields** (RESEARCH.md Pattern 3 note) — do not forward raw `DocumentChunk.text` properties to the browser; only `label`/`group`/`id` survive the reshape above.

---

### `backend/main.py` (modified — router registration)

**Analog:** itself, `app.include_router(...)` block (lines 106-110)

**Core pattern** — add two lines following the exact existing convention:
```python
from backend.reset import router as reset_router  # noqa: E402
from backend.graph import router as graph_router  # noqa: E402
...
app.include_router(reset_router)
app.include_router(graph_router)
```
Import goes in the same alphabetized `from backend.X import router as X_router` block (lines 43-48); registration goes in the same trailing `app.include_router(...)` block (lines 106-110). No new CORS/middleware changes needed — same origin allowlist (line 56) already covers new same-origin routes.

---

### `backend/search.py` (modified — STRETCH-01 confidence score)

**Analog:** itself — the existing CHUNKS call (lines 227-234) and `_flatten_and_truncate` (lines 178-197)

**Core pattern** — per RESEARCH.md Pitfall 5, the score is NOT already in the flat `search_result` shape; must pass `verbose=True` and read the reshaped `objects_result` key:
```python
evidence_results = await cognee.search(
    query_text=query,
    query_type=SearchType.CHUNKS,
    datasets=datasets,
    top_k=5,
    verbose=True,  # NEW: only way to surface ScoredResult.score (Pitfall 5)
)
```
Then `_flatten_and_truncate` needs a corresponding read-path change: iterate `result.get("objects_result")` (list of `ScoredResult`-shaped items exposing `.payload`/`.score`) instead of the current `result.get("search_result")` list-of-dicts (line 185). Keep the same truncate/limit/excerpt shape (lines 190-196) — only the source field name and score extraction changes. Attach the top evidence-item's `.score` (or an aggregate) onto the `/search` response's `"confidence"` key following the same flat top-level key convention as `drift_state` (line 281).

**Error handling**: unchanged — same `try/except` around both `cognee.search()` calls (lines 217-237).

---

### `frontend/lib/api.ts` (modified — new wrappers for `/reset` and `/graph`)

**Analog:** itself — `forgetDataset` (lines 272-298) and `listDatasets` (lines 314-320)

**Core pattern** — mirror `forgetDataset`'s discriminated-union + try/catch-to-error-variant shape exactly for `resetMemory()`:
```typescript
interface ResetOkResponse { status: "reset"; }
interface ResetErrorResponse { status: "error"; message: string; }
export type ResetResponse = ResetOkResponse | ResetErrorResponse;

export async function resetMemory(): Promise<ResetResponse> {
  try {
    const res = await fetch(`${API_BASE}/reset`, { method: "POST" });
    if (!res.ok) {
      return { status: "error", message: "Could not reset memory. Please try again." };
    }
    return (await res.json()) as ResetResponse;
  } catch {
    return { status: "error", message: "Could not reset memory. Please try again." };
  }
}
```
And mirror `listDatasets`'s throw-on-!ok shape (lines 314-320) for `getMemoryGraph()`:
```typescript
export interface GraphNode { id: string; label: string; group: string; }
export interface GraphLink { source: string; target: string; label: string; }
export interface GraphData { nodes: GraphNode[]; links: GraphLink[]; }

export async function getMemoryGraph(): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/graph`);
  if (!res.ok) throw new Error("Could not load memory graph.");
  return (await res.json()) as GraphData;
}
```
D-24 fallback message text for reset must match `backend/reset.py`'s `_MSG_ERROR` verbatim (same discipline as `forgetDataset`'s comment at lines 267-271 matching `backend/forget.py::_MSG_ERROR`).

---

### `frontend/components/MemoryGraphView.tsx` (new — no in-repo analog)

**Source:** RESEARCH.md's own verified Code Example (Next.js 16 App Router `next/dynamic(ssr:false)` boundary) — this IS the pattern to copy, since nothing precedent exists in this codebase:
```tsx
"use client";
import dynamic from "next/dynamic";

const ForceGraph3D = dynamic(
  () => import("react-force-graph").then((mod) => mod.ForceGraph3D),
  { ssr: false },
);

export function MemoryGraphView({ graphData }: { graphData: { nodes: unknown[]; links: unknown[] } }) {
  return (
    <ForceGraph3D
      graphData={graphData}
      nodeLabel="label"
      nodeAutoColorBy="group"
      linkLabel="label"
      onNodeClick={(node: { id: string }) => { /* STRETCH-04 click-to-explore hook */ }}
    />
  );
}
```
**Data-fetch wrapper**: follow `DatasetList.tsx`'s `useQuery({ queryKey, queryFn })` pattern (lines 155-158) with `queryFn: getMemoryGraph` for the page-level container that feeds `graphData` into this component.

**Anti-pattern to avoid** (Pitfall 3 / D-08): do not put the `dynamic(..., {ssr:false})` call in a Server Component — this file must keep its own `"use client"` directive even though it's imported from the already-client `page.tsx`.

---

### `frontend/components/ResetButton.tsx` (new)

**Analogs:** `DatasetList.tsx`'s `ForgetButton` (lines 39-111, local-state mutation/loading/error shape) for the mutation plumbing + new `ui/dialog.tsx` (shadcn-generated) for the modal wrapper D-05 requires instead of Phase 3's inline two-step confirm.

**Core pattern** — reuse `ForgetButton`'s state shape (`isResetting`/`error`) and toast-on-success convention (`toast.success(...)`, line 59), but swap the inline `confirming` boolean's two-button row for the new `Dialog`/`DialogContent`/`DialogFooter` primitives:
```tsx
"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { resetMemory } from "@/lib/api";

const RESET_ERROR_FALLBACK = "Could not reset memory. Please try again.";

export function ResetButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setIsResetting(true);
    setError(null);
    const result = await resetMemory();
    setIsResetting(false);
    if (result.status === "reset") {
      setOpen(false);
      await queryClient.invalidateQueries();  // reset invalidates ALL cached reads (datasets, graph, etc.)
      toast.success("Memory reset to demo-ready state");
    } else {
      setError(result.message || RESET_ERROR_FALLBACK);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm">Reset Demo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset memory to demo-ready state?</DialogTitle></DialogHeader>
        {error ? <p className="font-sans text-sm font-semibold text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isResetting}>Cancel</Button>
          <Button variant="destructive" onClick={() => void handleReset()} disabled={isResetting}>
            {isResetting ? "Resetting…" : "Confirm Reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
**D-24 fallback message** must match `backend/reset.py`'s `_MSG_ERROR` verbatim, same discipline as `ForgetButton`'s `FORGET_ERROR_FALLBACK` (DatasetList.tsx line 30).

---

### `frontend/components/DiagnosisCard.tsx` (modified — STRETCH-01 confidence badge)

**Analog:** itself — `VersionTagBadge` (lines 52-62), placed in `CardHeader` (line 213-221)

**Core pattern** — add a sibling `Badge` next to `VersionTagBadge` in the same header row, following the same `Badge variant="outline"` shape:
```tsx
{response.confidence != null ? (
  <Badge variant="outline" className="shrink-0 font-mono text-xs font-normal text-muted-foreground">
    {Math.round(response.confidence * 100)}% confidence
  </Badge>
) : null}
```
Extend `frontend/lib/api.ts`'s `SearchResponseOk` interface (lines 21-31) with `confidence: number | null;` to match the new backend field, following the exact same "backend field -> typed interface field" 1:1 discipline already used for `drift_state`.

---

### `frontend/components/HealthDashboard.tsx` (new — STRETCH-02)

**Analog:** `DatasetList.tsx` — reuse the `DRIFT_BADGE` color/label map (lines 22-26) and the `useQuery({ queryKey: DATASETS_QUERY_KEY, queryFn: listDatasets })` read (lines 155-158); this is pure client-side aggregation, no new backend endpoint (RESEARCH.md Architectural Responsibility Map, "Health dashboard" row).

**Core pattern**:
```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DATASETS_QUERY_KEY } from "@/components/DatasetList";
import { listDatasets, type DriftState } from "@/lib/api";

const DRIFT_BADGE: Record<DriftState, { dot: string; label: string }> = {
  stable: { dot: "bg-drift-stable", label: "🟢 Stable" },
  aging: { dot: "bg-drift-aging", label: "🟡 Aging" },
  drifting: { dot: "bg-drift-drifting", label: "🔴 Drifting" },
};  // duplicate the exact same map, or export+import it from DatasetList.tsx

export function HealthDashboard() {
  const { data } = useQuery({ queryKey: DATASETS_QUERY_KEY, queryFn: listDatasets });
  const counts = { stable: 0, aging: 0, drifting: 0 };
  for (const ds of data ?? []) counts[ds.drift_state]++;
  return (
    <Card className="gap-4 p-6">
      <CardHeader className="p-0"><h2 className="font-display text-xl font-semibold text-foreground">Memory Health</h2></CardHeader>
      <CardContent className="flex gap-4 p-0">
        {(Object.keys(counts) as DriftState[]).map((state) => (
          <span key={state} className="font-sans text-sm font-semibold text-foreground">
            {DRIFT_BADGE[state].label}: {counts[state]}
          </span>
        ))}
      </CardContent>
    </Card>
  );
}
```
Sharing the `DATASETS_QUERY_KEY` (exported by `DatasetList.tsx` line 17) means this component's data always agrees with the dataset list and never issues a redundant fetch — same react-query cache-sharing discipline `UploadPanel` already uses per the `DatasetList.tsx` docstring (lines 12-16).

---

### `frontend/components/IncidentTimeline.tsx` (new — STRETCH-03, weakest analog, first to cut per D-10)

**Analog:** `DatasetList.tsx`'s overall `Card` + row-list shape (lines 160-184) — no timeline-specific precedent exists in this codebase.

**Core pattern** — reuse the same `Card`/`CardHeader`/`CardContent` shell and loading/error/empty states (lines 160-181), replacing dataset rows with chronologically-sorted incident entries (sourced from `GET /datasets` doc metadata per RESEARCH.md's Architectural Responsibility Map — no new backend endpoint needed). Lowest priority per D-10 (cut first if time runs short); if built, keep the same skeleton/loading-copy tone as `DiagnosisCardSkeleton`'s "Searching memory…" caption (DiagnosisCard.tsx lines 310-312).

---

### `frontend/app/page.tsx` (modified — D-08 tab/toggle, D-04/D-05 reset button placement)

**Analog:** itself — the existing `<section>`-per-feature layout (lines 79-85)

**Core pattern** — add a tab/toggle state (`const [view, setView] = useState<"search" | "graph">("search")`) gating which `<section>` block renders, following the same pattern as the existing `isPending`/`hasSearched` conditional rendering (lines 54-71); place `<ResetButton />` as a new top-level `<section>` or inline near the header, same `aria-label` convention as existing sections (lines 79, 83).

---

### Seed corpus enrichment (D-09)

**Analogs:** `seed/workarounds_v1_8/nightly-dedup-workaround.md`, `seed/workarounds_v1_9/release-v1.9.md`, `seed/incidents/stripe-double-charge-incident.md` — copy their markdown structure/tone/length (~172-220 words) for new docs. `seed/seed_cli.py`'s `folder.glob("*.md")` auto-discovery means no code change is needed to pick up new files — just drop new `.md` files into the existing three folders.

**Constraint (carry forward from `seed/README.md`'s isolation rule + CLAUDE.md #1023 note):** any new proper noun/entity name introduced in a new `workarounds_v1_8/` or `workarounds_v1_9/` doc must stay exclusive to that one dataset — never reused across datasets — exactly like the existing `dedup_sweeper`/`idempotency_guard` entities. Do not touch the two existing arc-critical docs (`nightly-dedup-workaround.md`, `release-v1.9.md`, `stripe-double-charge-incident.md`, `stripe-double-charge-escalation.md`) — only add new files alongside them.

**Recommended count per RESEARCH.md Open Question 2:** 1 new decoy in `incidents/`, 1 reinforcing doc each in `workarounds_v1_8/` and `workarounds_v1_9/` (3 new docs total, conservative first pass) — re-run `--seed`, inspect `/graph` payload node count, add a second batch only if still sparse.

**Sequencing (B-03):** the D-03 reset snapshot MUST be re-captured (`scripts/snapshot_memory.py --save`) AFTER this enrichment is seeded, and must contain `workarounds_v1_8` (the currently committed `patchpilot_memory.snapshot.tar` predates the Phase-1 flip per STATE.md and is stale).

## Shared Patterns

### Config-before-Cognee import order (ALL new backend modules)
**Source:** `backend/forget.py` lines 16-24, `backend/datasets_router.py` lines 12-17
**Apply to:** `backend/reset.py`, `backend/graph.py`
```python
from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)
import cognee  # noqa: E402
from fastapi import APIRouter  # noqa: E402
from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
```

### D-24 error handling (never leak raw exception text)
**Source:** `backend/forget.py` lines 88-90, `backend/search.py` lines 235-237, `backend/drift.py` lines 133-135
**Apply to:** all new backend routes (`reset.py`, `graph.py`) and all new frontend mutation components (`ResetButton.tsx`)
```python
except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
    logger.exception("<action> failed")
    return {"status": "error", "message": _MSG_ERROR}
```
Frontend mirror: every `lib/api.ts` wrapper normalizes network/parse failures into a typed `{status: "error", message: "<fixed short message>"}` variant (see `forgetDataset`, `listDatasets` throw pattern) — the fixed message text must match the backend's `_MSG_ERROR` string verbatim.

### React Query cache-key sharing across components
**Source:** `frontend/components/DatasetList.tsx` lines 12-17 (`DATASETS_QUERY_KEY` exported for `UploadPanel` to invalidate)
**Apply to:** `HealthDashboard.tsx` (shares `DATASETS_QUERY_KEY` with `DatasetList`), `ResetButton.tsx` (invalidates ALL queries on successful reset, since reset changes every dataset/graph state at once)

### Destructive-action confirm UX (diverging pattern, not shared)
Phase 3's `ForgetButton` (DatasetList.tsx lines 39-111) uses an **inline two-step confirm** (no modal). Phase 4's `ResetButton` deliberately uses a **modal dialog** instead (D-05) — do not copy the inline-confirm UI shape for Reset; do reuse its mutation/loading/error *state management* shape (`isX`/`error` local state + toast-on-success).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/components/MemoryGraphView.tsx` | component | streaming/render (WebGL) | No 3D/graph-rendering component exists yet in this codebase; use RESEARCH.md's verified Code Example directly as the pattern source instead of an in-repo analog |
| `frontend/components/ui/dialog.tsx` | ui primitive | UI state | Not yet installed (`npx shadcn add dialog` generates it, per RESEARCH.md Supporting Libraries) — no hand-authored analog needed, it's a generated shadcn/Radix primitive matching the existing `ui/collapsible.tsx`/`ui/select.tsx` generation convention |
| `frontend/components/IncidentTimeline.tsx` | component | transform (chronological render) | No timeline precedent in this codebase; `DatasetList.tsx`'s Card+row-list shell is the closest available shape but is a weak match (lowest build priority per D-10, first feature to cut) |

## Metadata

**Analog search scope:** `backend/` (all routers: forget.py, datasets_router.py, search.py, drift.py, main.py, ingest.py), `frontend/components/` (DatasetList.tsx, DiagnosisCard.tsx, UploadPanel.tsx, SearchBar.tsx, ui/), `frontend/app/page.tsx`, `frontend/lib/api.ts`, `scripts/snapshot_memory.py`, `seed/`
**Files scanned:** 12 read in full (all ≤320 lines, single-pass reads, no re-reads)
**Pattern extraction date:** 2026-07-03
