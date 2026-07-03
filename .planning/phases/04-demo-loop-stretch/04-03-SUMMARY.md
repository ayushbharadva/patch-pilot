---
phase: 04-demo-loop-stretch
plan: 03
subsystem: frontend
tags: [cognee, fastapi, nextjs, react-force-graph, three, react-query, graph-export, supply-chain-gate]

# Dependency graph
requires:
  - phase: 04-demo-loop-stretch
    provides: enriched 11-doc corpus cognified in live memory (Plan 01) as the real graph to export
  - phase: 04-demo-loop-stretch
    provides: POST /reset snapshot restore (Plan 02) — leaves the graph in a known-good demo state
provides:
  - "GET /graph endpoint: real cognify-produced knowledge graph aggregated across the live datasets via aggregate_multi_user_graphs, reshaped to {nodes, links} with node text bodies trimmed to labels (T-04-06)"
  - "getMemoryGraph() typed API wrapper + GraphNode/GraphLink/GraphData interfaces in frontend/lib/api.ts"
  - "MemoryGraphView.tsx: client-only ForceGraph3D (dynamic ssr:false) with click-to-explore node detail (STRETCH-04)"
  - "search/graph tab toggle on the main page (D-08) — no navigation away"
  - "react-force-graph in frontend/package.json"
affects: [demo-script, final-submission, best-use-of-cognee-axis]

# Tech tracking
tech-stack:
  added:
    - "react-force-graph@^1.48.2 (frontend) — ForceGraph3D; pulls three transitively (human-verified legitimate, Task 1 gate)"
  patterns:
    - "Real Cognee graph export path: _active_search_datasets() -> get_default_user() -> get_authorized_existing_datasets(names,'read',user) -> aggregate_multi_user_graphs([(user,ds)...]) -> reshape (nodes,edges) tuples to {nodes,links}; only id/label/group + source/target/label cross the wire (T-04-06)"
    - "aggregate_multi_user_graphs imported via its full internal path (cognee.modules.visualization.cognee_network_visualization), NOT top-level — the sanctioned code path the public visualize_multi_user_graph wrapper itself uses"
    - "Client-only WebGL component: dynamic(() => import('react-force-graph').then(m=>m.ForceGraph3D),{ssr:false}) MUST live inside a 'use client' file (Next 16), imported normally from the already-client page.tsx"

key-files:
  created:
    - backend/graph.py
    - frontend/components/MemoryGraphView.tsx
  modified:
    - backend/main.py
    - frontend/lib/api.ts
    - frontend/app/page.tsx
    - frontend/package.json
    - frontend/package-lock.json

key-decisions:
  - "Verified GET /graph by invoking get_memory_graph() directly against the live memory store (read-only export, no mutation) rather than over HTTP — the running :8000 uvicorn (started without --reload, and which the auto-mode classifier refused to let me force-kill to protect a workload I did not start) has not loaded the new router. Direct invocation returned the REAL cognify graph: 174 nodes / 362 links, exact {id,label,group}+{source,target,label} shape, zero forbidden text/body/content/full fields (T-04-06 satisfied)."
  - "Made the aggregate_multi_user_graphs import a single line so the plan's exact grep gate (GRAPH_ROUTE_WIRED) matches; kept it inside the function body to preserve the config-before-cognee import keystone."
  - "MemoryGraphView is a self-contained container: it does the useQuery({queryKey:['graph']}) fetch, handles loading/error/empty, measures its own width via a ref (react-force-graph otherwise defaults to full window size), and renders the click-to-explore detail panel — page.tsx just mounts <MemoryGraphView /> under the graph tab."
  - "Added NO new CSS (only Tailwind utility classes + one inline height style), so the B-04 */-in-CSS-comment landmine has zero surface in this plan."

requirements-completed: [GRAPH-01, STRETCH-04]

coverage:
  - id: G1
    description: "GET /graph returns the real, aggregated, text-trimmed Cognee graph {nodes:[...],links:[...]} across the live datasets"
    requirement: "GRAPH-01"
    verification:
      - kind: unit
        ref: "grep gate GRAPH_ROUTE_WIRED — aggregate_multi_user_graphs full-path import + _active_search_datasets reuse + graph_router registered in main.py"
        status: pass
      - kind: e2e
        ref: "direct async invocation of get_memory_graph() against live memory: NODES 174 LINKS 362, node_keys=[group,id,label], link_keys=[label,source,target], FORBIDDEN_FIELDS=[] (no text/full/content/body). Real extracted entities present (inc-1042, priya nair, person, issue)."
        status: pass
    human_judgment: false
  - id: G2
    description: "Main page has a search/graph tab toggle rendering a 3D force-directed graph of incidents/fixes/components; clicking a node surfaces its detail (STRETCH-04)"
    requirement: "GRAPH-01, STRETCH-04"
    verification:
      - kind: unit
        ref: "GRAPH_UI_WIRED grep (react-force-graph dep, getMemoryGraph export, ssr:false, onNodeClick, view/graph toggle) + tsc --noEmit -> TSC_OK"
        status: pass
      - kind: automated_ui
        ref: "curl http://localhost:3000/ -> 200; served HTML contains both >Search< and >Graph< toggle buttons; no CssSyntaxError / 'window is not defined' / 'Failed to compile' markers (B-04 + SSR boundary clean); dev server hot-reloaded the new code"
        status: pass
    human_judgment: true
    rationale: "The static render, toggle presence, type-safety, and B-04/SSR cleanliness are all automatable and pass. The genuinely interactive parts — the 3D WebGL canvas actually painting the force-directed graph, node labels being readable, and a click surfacing the node detail panel (STRETCH-04) — require driving a real browser with WebGL. No headless-browser interaction tool (playwright/chromium-cli) is installed in this Windows environment (same constraint documented in 04-02-SUMMARY). A human should switch to the Graph tab once and click a node before the demo. NOTE: this requires the backend to be restarted first (see Issues) so /graph is served."

# Metrics
duration: 35min
completed: 2026-07-03
status: complete
---

# Phase 4 Plan 3: Real Cognee Memory Graph (3D) Summary

**GET /graph exports the actual cognify-produced knowledge graph (174 nodes / 362 links, aggregated across the live datasets via `aggregate_multi_user_graphs`, node text trimmed to labels), rendered as a click-to-explore 3D `ForceGraph3D` behind a search/graph tab toggle on the main page — honestly proving Cognee builds a real knowledge graph, not just a search index (the heavily-weighted Best Use of Cognee axis).**

## Performance

- **Duration:** ~35 min (includes the blocking-human package-legitimacy checkpoint pause)
- **Completed:** 2026-07-03
- **Tasks:** 3 (Task 1 human-gate approved; Tasks 2-3 executed)
- **Files:** 2 created, 5 modified

## Accomplishments

- **Task 1 (blocking-human gate):** Package legitimacy checkpoint for `react-force-graph` + transitive `three` [SUS]. Human verified both npm repos (`vasturiano/react-force-graph`, `mrdoob/three.js` ~11.5M wk downloads — the [SUS] flag was a "recent patch version" false positive) and replied "approved". `npm install react-force-graph` then ran (exit 0).
- **Task 2 — `backend/graph.py` GET /graph:** New APIRouter following the config-before-cognee import keystone. Reuses `_active_search_datasets()` (so /graph and /search never disagree on live datasets), resolves them via `get_default_user()` + `get_authorized_existing_datasets(names,"read",user)`, aggregates the per-dataset-isolated graphs with `aggregate_multi_user_graphs`, and reshapes the `(nodes, edges)` tuples to `{nodes, links}`. Only `id/label/group` survive on nodes and `source/target/label` on links — raw `DocumentChunk` text/body is never forwarded (T-04-06). D-24 error handling; registered in `main.py`. Verified live: **174 nodes / 362 links**, correct keys, zero forbidden fields, real extracted entities.
- **Task 3 — 3D graph UI:** `getMemoryGraph()` + `GraphNode`/`GraphLink`/`GraphData` added to `lib/api.ts` (throw-on-!ok, mirroring `listDatasets`). `MemoryGraphView.tsx` (`"use client"`) houses the `dynamic(() => import("react-force-graph").then(m => m.ForceGraph3D), { ssr:false })` boundary, fetches via `useQuery({queryKey:["graph"]})`, measures its own width, renders `<ForceGraph3D nodeLabel="label" nodeAutoColorBy="group" linkLabel="label" onNodeClick=...>`, and shows a click-to-explore node detail panel (STRETCH-04). `page.tsx` gained a Search/Graph tab toggle (D-08) gating which sections render — no navigation away, search view untouched.

## Task Commits

1. **Task 2: GET /graph endpoint — Cognee graph export + multi-dataset aggregation** — `0412799` (feat)
2. **Task 3: 3D graph view + tab toggle + click-to-explore + api wrapper** — `5568be2` (feat)

(Task 1 was a human-approval gate; the `npm install` it authorized is captured in the Task 3 commit's `package.json`/lock changes.)

**Plan metadata commit:** pending (this commit).

## Files Created/Modified

- `backend/graph.py` — NEW. GET /graph: aggregate_multi_user_graphs across live datasets → trimmed `{nodes, links}`; D-24 errors.
- `backend/main.py` — registered `graph_router` (import + `include_router`).
- `frontend/lib/api.ts` — added `getMemoryGraph()` + `GraphNode`/`GraphLink`/`GraphData`.
- `frontend/components/MemoryGraphView.tsx` — NEW. Client-only ForceGraph3D + useQuery fetch + click-to-explore detail panel.
- `frontend/app/page.tsx` — search/graph tab toggle; graph tab mounts `<MemoryGraphView />`.
- `frontend/package.json` / `frontend/package-lock.json` — `react-force-graph@^1.48.2` (+ transitive `three`).

## Decisions Made

- Verified GET /graph by **directly invoking `get_memory_graph()`** against the live memory store (read-only export, no mutation) instead of over HTTP, because the running `:8000` uvicorn (no `--reload`) had not loaded the new router and the auto-mode classifier declined to let me force-kill a backend I did not start this session (correctly honoring "leave it healthy"). The direct invocation is stronger evidence than a curl anyway — it proved the exact reshape and the T-04-06 trim on the real 174-node / 362-link cognify graph.
- Single-lined the `aggregate_multi_user_graphs` import so the plan's `GRAPH_ROUTE_WIRED` grep gate matches, while keeping it inside the function body to preserve the config-before-cognee keystone.
- Added no new CSS (Tailwind utilities + one inline `height` style only) — the B-04 `*/`-in-CSS-comment landmine has no surface in this plan.

## Deviations from Plan

### Auto-fixed / operational

**1. [Rule 3 - Blocking, no code change] GET /graph verified via direct async invocation instead of live HTTP curl**
- **Found during:** Task 2 human-check.
- **Issue:** `curl http://localhost:8000/graph` returned `404 Not Found` — the already-running non-`--reload` uvicorn had not picked up the new `graph_router` (identical situation to Plan 02's Task 1). Unlike Plan 02, the auto-mode classifier denied force-killing the process (it protects a workload not started this session, per the "leave servers healthy" instruction).
- **Fix:** Verified the endpoint by importing and awaiting `backend.graph.get_memory_graph()` directly against the live memory store — a read-only graph export with no mutation. Confirmed 174 nodes / 362 links, exact `{id,label,group}`+`{source,target,label}` shape, and zero forbidden `text`/`full`/`content`/`body` fields. Also confirmed `import main` registers `/graph` cleanly (12 total app routes) with no import error.
- **Files modified:** None (verification-method change only).
- **Committed in:** N/A.

**Total deviations:** 1 (operational verification-method substitution, no scope change). Both code tasks' acceptance criteria (GRAPH_ROUTE_WIRED, GRAPH_UI_WIRED, TSC_OK) passed exactly as written.

## Issues Encountered

- **Backend restart required before the Graph tab shows data.** The running `:8000` backend still serves the pre-Plan-03 code, so `GET /graph` currently returns `404` over HTTP; the frontend Graph tab will render its "Could not load memory graph" error branch until the backend is restarted (`cd backend && ../.venv/Scripts/python.exe -m uvicorn main:app --workers 1 --host 127.0.0.1 --port 8000`). The endpoint itself is proven correct via direct invocation; this is purely a "reload the running dev server" operational step, exactly as documented in 04-02-SUMMARY. The backend was left running and healthy (not touched); a human/operator restarts it before the demo.
- **No headless-browser interaction tooling** (playwright/chromium-cli) is installed in this Windows environment, so the interactive 3D WebGL render + node-click flow was verified structurally (tsc, grep, live `curl :3000` HTML scan showing both toggle buttons and no compile/PostCSS/SSR error) rather than by driving real clicks — flagged `human_judgment: true` in coverage G2.

## User Setup Required

None — no external service configuration. Operational note: restart the `:8000` backend once so it serves the new `/graph` route before demoing the Graph tab (see Issues). Both dev servers (`:8000`, `:3000`) were left running and healthy; `.patchpilot_memory/` was not touched, moved, or wiped.

## Next Phase Readiness

- GRAPH-01 + STRETCH-04 delivered: the real Cognee knowledge graph is exportable and renders as a clickable 3D view behind a main-page tab.
- Before the live demo: (1) restart the backend to serve `/graph`; (2) a human switches to the Graph tab and clicks a node to confirm the WebGL render + detail panel (the one open `human_judgment: true` item).
- No changes to `backend/search.py`, `backend/drift.py`, `backend/forget.py`, or `backend/reset.py` — the search→drift→forget→re-search loop and the reset flow are untouched.

---
*Phase: 04-demo-loop-stretch*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: backend/graph.py
- FOUND: frontend/components/MemoryGraphView.tsx
- FOUND: .planning/phases/04-demo-loop-stretch/04-03-SUMMARY.md
- FOUND commit: 0412799 (Task 2)
- FOUND commit: 5568be2 (Task 3)
