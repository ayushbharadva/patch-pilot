# Phase 4: Demo Loop + Stretch - Research

**Researched:** 2026-07-03
**Domain:** Cognee 1.2.2 lifecycle internals (forget/graph-export/per-dataset isolation), Next.js 16 App Router 3D graph rendering, FastAPI file-lock-safe reset
**Confidence:** HIGH (B-01, B-02, B-03 reconciled against live filesystem + installed package source, not assumption; D-07/frontend stack verified via `npm view`)

## Summary

Phase 4 does not add new Cognee lifecycle capability — it makes the already-built search→drift→forget→re-search loop demoable, resettable, and visually provable. The single most consequential finding of this research is that **B-01's premise is falsified for PatchPilot's actual runtime**: this deployment runs in Cognee's per-dataset-isolated storage mode (confirmed empirically — `.patchpilot_memory/databases/<user_id>/` contains one separate `.lance.db` and one separate `.lbug` graph file *per dataset*, not one shared file), so `forget(dataset="workarounds_v1_8")` destroys only that dataset's own private vector/graph files. It cannot break `CHUNKS` search against `incidents` or `workarounds_v1_9`. This is exactly why Phase 3's live UAT passed search→forget→re-search 3/3 in the browser. The memory note describing a shared-collection failure documents a real cognee failure class, but not one that applies to this app's configuration — the underlying fragility (an `asyncio.gather` with no `return_exceptions=True` across a stale dataset reference) is already defended against by `backend/search.py::_active_search_datasets()` re-querying `list_datasets()` fresh on every request.

The second major finding answers B-02: cognee 1.2.2 has a first-class, exact API for graph export — `graph_engine.get_graph_data()` returns `(nodes, edges)` as plain tuples, and `cognee.modules.visualization.cognee_network_visualization.aggregate_multi_user_graphs(user_dataset_pairs)` already implements exactly the "combine several per-dataset-isolated graphs into one" operation Phase 4 needs for a single dense 3D view. No custom graph traversal is required.

The third finding answers the reset concurrency question (item 4): the live uvicorn process holds open native file handles to Kuzu/Ladybug and LanceDB files via module-level `closing_lru_cache`-wrapped factories. `cognee.prune.prune_system()`'s own source shows the sanctioned pattern — call `.cache_clear()` on the graph/vector engine factories (which triggers each adapter's real `close()`, releasing native OS handles, Windows-safe) before touching the filesystem. The relational (SQLite) engine is **not** covered by that pattern and needs an explicit `await db_engine.engine.dispose()` — a gap this research surfaces that the plan must account for explicitly, since a stale open SQLite handle would make `shutil.rmtree()` fail on Windows.

**Primary recommendation:** Trust the loop as currently built — do not add CHUNKS-repair code. Build the reset endpoint using cognee's own private engine-cache-clear pattern (mirrored from `prune_system`) plus an explicit relational-engine dispose, then delegate to the existing `scripts/snapshot_memory.py --restore`. Build the graph endpoint on `aggregate_multi_user_graphs` across the live dataset list, reshape to `{nodes, links}`, and render with `react-force-graph`'s `ForceGraph3D` behind a `next/dynamic(..., {ssr:false})` boundary inside a dedicated client component.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Timed demo loop orchestration (search/upload/forget/re-search sequencing) | Browser / Client | API / Backend | UI drives the sequence via existing endpoints; backend supplies the timing-critical LLM calls |
| Demo reset (snapshot restore) | API / Backend | Database / Storage | Must run server-side (file-lock release + filesystem swap); UI only triggers + confirms |
| Memory graph export | API / Backend | Database / Storage | Cognee's graph/vector engines are only reachable server-side; raw `(nodes, edges)` must be shaped into JSON before crossing to the browser |
| Memory graph 3D rendering | Browser / Client | — | WebGL/canvas rendering is inherently client-only; `ForceGraph3D` has no server equivalent |
| Confidence score | API / Backend | Browser / Client | Score originates in cognee's vector retriever (`ScoredResult.score`); backend must opt into `verbose=True` to surface it, then UI just formats a number |
| Health dashboard | Browser / Client | API / Backend | Aggregation can run entirely client-side from data `GET /datasets` already returns (no new backend endpoint required) |
| Incident timeline | Browser / Client | API / Backend | Chronological sort of dataset/doc metadata already available via `GET /datasets` + document timestamps; no new lifecycle verb needed |
| Seed corpus enrichment | Database / Storage | — | Static markdown files ingested via existing `seed_cli.py --seed`; no runtime code path affected |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-force-graph` | 1.48.2 [VERIFIED: npm registry, published 4 months ago, 33,845 weekly downloads] | 3D force-directed graph rendering (`ForceGraph3D`) | Locked by D-07/CLAUDE.md; ships 2D/3D/VR/AR variants + own `.d.ts` types, no separate `@types` package needed |
| `three` | 0.185.1 (transitive via `3d-force-graph`) [VERIFIED: npm registry, 11.5M weekly downloads, `mrdoob/three.js` repo — flagged `SUS` by the automated "too-new" heuristic purely because its *latest patch* published 2026-07-01; the package itself is 10+ years old and is not independently installed, it comes in transitively] | WebGL rendering engine underlying `ForceGraph3D` | Never imported directly by app code; installed automatically as `3d-force-graph`'s dependency (`three: >=0.179 <1`) |
| `cognee` | 1.2.2 (already installed) [VERIFIED: `python -c "import cognee; print(cognee.__version__)"`] | Graph export (`get_graph_data`), lifecycle forget, prune-pattern for reset | Already the project's memory layer; Phase 4 only reaches deeper into its existing API surface |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn `dialog` (Radix `Dialog` primitive) | matches installed `radix-ui@^1.6.1` [VERIFIED: `frontend/components/ui/` grep — no dialog/alert-dialog file currently present] | Modal confirm for the destructive reset (D-05) | Run `npx shadcn add dialog` (or `alert-dialog` for a semantically confirm/cancel-flavored variant) — first modal primitive in this codebase; Phase 3's `ForgetButton` used an inline two-step pattern instead, so this is new, not a re-use |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-force-graph` (umbrella, 23.9MB unpacked incl. AR/VR) | `react-force-graph-3d` (1.29.1) [VERIFIED: npm registry, 180,462 weekly downloads, same maintainer/repo] | Lighter install (no AR/VR bundle), same `ForceGraph3D` API surface, same `three`/`3d-force-graph` dependency chain. D-07 explicitly names "react-force-graph 3D (ForceGraph3D)" so the umbrella package is the literal match to the locked decision; `react-force-graph-3d` is the pragmatic swap if bundle size becomes a concern |
| Direct engine-cache-clear calls (`_create_vector_engine.cache_clear()`, `_create_graph_engine.cache_clear()`) for the reset endpoint | `await cognee.prune.prune_system(graph=True, vector=True, metadata=False, cache=True)` (public API) | The public `prune_system()` call performs the identical cache-clear side effects internally but *also* does real (redundant, since the tar restore will overwrite the tree seconds later) per-dataset delete work first — slightly slower, but uses cognee's public surface instead of underscore-prefixed private functions. Recommended as the safer default; the direct cache-clear calls are a faster, more surgical fallback if `prune_system()`'s extra work measurably affects the reset's "instant" feel |

**Installation:**
```bash
cd frontend && npm install react-force-graph
cd frontend && npx shadcn add dialog
```

**Version verification:** `npm view react-force-graph version` → `1.48.2` (published ~4 months ago per registry metadata, run 2026-07-03). `python -c "import cognee; print(cognee.__version__)"` → `1.2.2` (already installed, no change needed).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|--------------|---------|-------------|
| `react-force-graph` | npm | published 4 months ago (long-running project, `vasturiano/react-force-graph`) | 33,845/wk | github.com/vasturiano/react-force-graph | OK | Approved |
| `react-force-graph-3d` | npm | published ~4 months ago (same maintainer/repo) | 180,462/wk | github.com/vasturiano/react-force-graph | OK | Approved (listed as alternative) |
| `three` | npm | package is 10+ years old; only the *latest patch* is very recent | 11,594,046/wk | github.com/mrdoob/three.js | SUS (`too-new` heuristic false-positive) | Flagged — see note below |

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** `three` — this is a heuristic false positive. `three` is one of the most widely used JavaScript libraries in existence (11.5M weekly downloads, decade-old `mrdoob/three.js` repo, no postinstall script). The `too-new` signal fired because its *most recent patch release* was published 2026-07-01, not because the package itself is new. It is never installed directly by this project — it arrives transitively via `3d-force-graph` (itself a dependency of `react-force-graph`). Per protocol this is still tagged `[SUS]` and the planner should add a lightweight `checkpoint:human-verify` before `npm install react-force-graph` (a one-line sanity check — confirm `node_modules/three/package.json`'s `repository` field points to `mrdoob/three.js` — is sufficient; a full manual audit is not warranted given the download-count/repo evidence above).

## Architecture Patterns

### System Architecture Diagram

```
[Browser: Next.js App Router, "use client" page.tsx]
   │
   ├─(1) Search tab ─POST /search──────────────► [FastAPI backend/search.py]
   │                                                  │
   │                                                  ├─ cognee.search(GRAPH_COMPLETION, datasets=[live names])
   │                                                  ├─ cognee.search(CHUNKS, datasets=[live names])
   │                                                  └─ fuse → {root_cause, evidence, drift_state}
   │
   ├─(2) Upload release ─POST /ingest──────────────► [backend/ingest.py]
   │                                                  └─ asyncio.create_task(add()+cognify()) [background]
   │
   ├─(3) Poll drift ─GET /datasets──────────────────► [backend/datasets_router.py]
   │                                                  └─ compute_drift_states() + get_or_generate_reason() [cached]
   │
   ├─(4) Forget 🔴 dataset ─POST /forget────────────► [backend/forget.py]
   │                                                  └─ cognee.forget(dataset=X) → deletes X's OWN
   │                                                     per-dataset .lance.db + .lbug files ONLY
   │                                                     (per-dataset isolation confirmed live)
   │
   ├─(5) Auto re-search ─POST /search (again)───────► same as (1); _active_search_datasets() re-queries
   │                                                     list_datasets() FRESH, so the just-forgotten
   │                                                     dataset is simply absent from this call
   │
   ├─(6) Graph tab ─GET /graph (NEW)─────────────────► [backend, new module]
   │                                                  ├─ for each live dataset: set_database_global_context_variables
   │                                                  ├─ aggregate_multi_user_graphs([(user, ds) ...])
   │                                                  └─ reshape (nodes, edges) → {nodes, links} JSON
   │                                                          │
   │                                                          ▼
   │                                          [ForceGraph3D, dynamic(ssr:false), client component]
   │
   └─(7) Reset button ─POST /reset (NEW)─────────────► [backend, new module]
                                                       ├─ release engine caches (Windows file-lock safe)
                                                       │    create_relational_engine.cache_clear()
                                                       │    _create_vector_engine.cache_clear()
                                                       │    _create_graph_engine.cache_clear()
                                                       │    (or: cognee.prune.prune_system(metadata=False))
                                                       ├─ await db_engine.engine.dispose()  (SQLite handle!)
                                                       └─ scripts.snapshot_memory.restore()  (no cognee import)
```

### Recommended Project Structure
```
backend/
├── reset.py           # NEW: POST /reset — engine-cache-clear + snapshot_memory.restore()
├── graph.py            # NEW: GET /graph — aggregate_multi_user_graphs → {nodes, links}
├── forget.py           # unchanged
├── search.py           # unchanged (already defends against B-01's failure mode)
├── drift.py            # unchanged (STRETCH-02 aggregates its compute_drift_states output)
frontend/
├── app/page.tsx         # add graph/search tab toggle (D-08), reset button + modal (D-04/D-05)
├── components/
│   ├── MemoryGraphView.tsx   # NEW: 'use client', houses the dynamic(ssr:false) ForceGraph3D import
│   ├── ResetButton.tsx       # NEW: modal confirm (shadcn dialog) + reset animation
│   ├── HealthDashboard.tsx   # NEW: client-side aggregation of GET /datasets drift_state counts
│   ├── IncidentTimeline.tsx  # NEW: chronological render, lowest priority (cut-first per D-10)
│   ├── DiagnosisCard.tsx     # extend VersionTagBadge row with a confidence badge (STRETCH-01)
│   └── ui/dialog.tsx         # NEW: `npx shadcn add dialog`
seed/
├── incidents/            # +1 new decoy doc (optional, zero-risk enrichment)
├── workarounds_v1_8/     # +1 new doc reinforcing dedup_sweeper (isolated, safe)
└── workarounds_v1_9/     # +1 new doc reinforcing idempotency_guard (isolated, safe)
```

### Pattern 1: Per-dataset Cognee storage isolation (the B-01 reconciliation)

**What:** Cognee 1.2.2 defaults to `backend_access_control_enabled() == True` whenever the configured graph/vector providers support multi-user isolation — and Kuzu (`graph_dataset_database_handler` auto-corrects `ladybug`→`kuzu`) + LanceDB (`vector_dataset_database_handler` defaults to `"lancedb"`) both qualify. PatchPilot's `.env`/`backend/cognee_config.py` never sets `ENABLE_BACKEND_ACCESS_CONTROL`, so this auto-enable path is live. Each `Dataset` row gets its own `DatasetDatabase` record pointing at a private `{dataset_id}.lance.db` and a private `{dataset_id}.lbug` graph file, both under `SYSTEM_ROOT_DIRECTORY/databases/{user_id}/`.

**Verified empirically** — `.patchpilot_memory/databases/4cfff1f3-.../` contains 4 separate `*.lance.db` files and 4 separate `*.lbug` files (one pair per live dataset, including a stray healthcheck leftover), not a single shared `DocumentChunk_text` collection.

**When to use:** This is *why* the loop already works — no code change needed. When `forget(dataset="workarounds_v1_8")` runs:
1. `_forget_dataset()` → `datasets.empty_dataset(dataset_id)` → `delete_dataset_nodes_and_edges()` (deletes this dataset's own graph nodes/edges) → `delete_dataset(dataset)`.
2. `delete_dataset()` (in `cognee/modules/data/methods/delete_dataset.py`) looks up the dataset's `DatasetDatabase` row and calls **that dataset's own** `graph_dataset_database_handler.delete_dataset()` / `vector_dataset_database_handler.delete_dataset()` — for LanceDB this is `LanceDBDatasetDatabaseHandler.delete_dataset()` → `vector_engine.prune()` scoped to **only that dataset's private `.lance.db` file**.
3. The `Dataset` row itself is then deleted from the relational DB, so `cognee.datasets.list_datasets()` never returns it again.

**Example:**
```python
# Source: cognee/modules/data/methods/delete_dataset.py (installed package)
stmt = select(DatasetDatabase).where(DatasetDatabase.dataset_id == dataset.id)
dataset_database = await session.scalar(stmt)
if dataset_database:
    graph_dataset_database_handler = get_graph_dataset_database_handler(dataset_database)
    vector_dataset_database_handler = get_vector_dataset_database_handler(dataset_database)
    await graph_dataset_database_handler["handler_instance"].delete_dataset(dataset_database)
    await vector_dataset_database_handler["handler_instance"].delete_dataset(dataset_database)
# ^ scoped to THIS dataset's own private files only — incidents/workarounds_v1_9's
#   own separate .lance.db/.lbug files are never touched.
```

### Pattern 2: Fresh dataset-list re-query before every fused search (already implemented — the real B-01 defense)

**What:** `backend/search.py::_active_search_datasets()` calls `cognee.datasets.list_datasets()` fresh on every `/search` request and filters to `doc_count > 0`. This means the dataset list passed into `cognee.search(datasets=[...])` NEVER references a dataset that was forgotten before this request began.

**Why it matters for B-01:** Cognee's `search_in_datasets_context()` (in access-control mode, which this app is in) fans out one `asyncio.Task` per dataset via `asyncio.gather(*tasks)` **without `return_exceptions=True`** — a `CollectionNotFoundError` from *any one* stale/dead dataset reference would cancel the entire gather and surface as `{"status":"error"}` for the whole fused search, even though the OTHER datasets' data is perfectly healthy. `_active_search_datasets()` prevents this scenario from ever occurring in the scripted, sequential demo flow (search waits for its response; forget waits for its response; the auto-re-search fires only after forget resolves — no request is ever in-flight with a dataset list captured before a concurrent forget completes).

**Residual risk (document, do not fix in Phase 4):** a genuinely concurrent `/search` racing a `/forget` (two different users/tabs hitting the backend simultaneously) could still hit this failure mode. Not a realistic risk for a single-operator, single-browser scripted demo — flag as a known limitation, not a blocker.

### Pattern 3: Cognee's own graph-export + multi-dataset aggregation API (B-02)

**What:** `graph_engine.get_graph_data()` returns `Tuple[List[Tuple[node_id: str, properties: dict]], List[Tuple[source_id: str, target_id: str, relationship_name: str, properties: dict]]]`. `cognee.modules.visualization.cognee_network_visualization.aggregate_multi_user_graphs(user_dataset_pairs)` already combines this across multiple `(User, Dataset)` pairs, deduplicating shared nodes by id and tagging each with `source_user`.

**When to use:** For GRAPH-01/D-06, call this once per `/graph` request across every live dataset (reuse `_active_search_datasets()` or `_all_workaround_dataset_names()` from `backend/search.py` to get the current names), resolve each name to a `Dataset` object via `get_authorized_existing_datasets`, then aggregate.

**Example:**
```python
# Source: cognee/api/v1/visualize/visualize.py + cognee/modules/visualization/cognee_network_visualization.py (installed package)
from cognee.modules.users.methods import get_default_user
from cognee.modules.data.methods import get_authorized_existing_datasets
from cognee.modules.visualization.cognee_network_visualization import aggregate_multi_user_graphs

async def get_memory_graph() -> dict:
    user = await get_default_user()
    names = await _all_workaround_dataset_names()  # reuse backend/search.py helper
    datasets = await get_authorized_existing_datasets(names, "read", user)
    pairs = [(user, ds) for ds in datasets]
    nodes, edges = await aggregate_multi_user_graphs(pairs)

    return {
        "nodes": [
            {"id": node_id, "label": props.get("name") or props.get("type") or node_id,
             "group": props.get("type", "unknown")}
            for node_id, props in nodes
        ],
        "links": [
            {"source": src, "target": tgt, "label": rel}
            for src, tgt, rel, _props in edges
        ],
    }
```

**Note:** `aggregate_multi_user_graphs` is not exported at cognee's top-level namespace (only `visualize_graph`/`visualize`/`visualize_memory_provenance` are) — import it via its full internal module path, exactly as shown. This mirrors what `visualize_multi_user_graph()` (a public, top-level-reachable wrapper — `cognee.visualize_multi_user_graph`) does internally, so this is a sanctioned, cognee-blessed code path even though the aggregation helper itself is internal.

**Trim large fields before returning JSON:** `DocumentChunk` nodes carry their full chunk `text` in `properties` (since `get_graph_data()` parses and merges the stored `properties` JSON blob). Strip or truncate `text`/raw content fields before sending the graph payload to the browser — the graph view needs labels, not full chunk bodies, and an untrimmed payload risks a large/slow response as the corpus grows (D-09 enrichment).

### Pattern 4: Windows-safe file-handle release before a live filesystem swap (D-03/D-04 concurrency answer)

**What:** Cognee caches its graph/vector engine adapters behind `closing_lru_cache`-decorated factories (`_create_graph_engine`, `_create_vector_engine` — both in the installed package, confirmed by reading `cognee/modules/data/deletion/prune_system.py`'s own imports). Calling `.cache_clear()` on these evicts every cached adapter and — critically — invokes each adapter's real `async def close()`, which releases native OS file handles (verified by reading `LanceDBAdapter.close()` and `LadybugAdapter (Kuzu) .close()`, both explicitly designed to be safe when invoked via `closing_lru_cache`'s eviction path, including from a foreign event loop via `asyncio.run`).

**The gap `prune_system()` does NOT cover:** the relational engine (`create_relational_engine`, SQLite via SQLAlchemy async engine) is cached with a plain `functools.lru_cache`, not `closing_lru_cache`. `prune_system(metadata=True)` calls `db_engine.delete_database()` (a SQL-level wipe) but never disposes the SQLAlchemy `AsyncEngine` itself — its connection pool keeps an open OS handle to `sqlite.db`/`sqlite.db-shm`/`sqlite.db-wal`. On Windows this WILL block `shutil.rmtree()` in `scripts/snapshot_memory.py::restore()` with a `PermissionError` if not explicitly disposed first.

**When to use:** Every time the `/reset` endpoint needs to swap `.patchpilot_memory/` on disk while uvicorn keeps running.

**Example:**
```python
# Source: pattern mirrored from cognee/modules/data/deletion/prune_system.py (installed package),
# extended with the relational-engine dispose prune_system() itself omits.
from cognee.infrastructure.databases.vector.create_vector_engine import _create_vector_engine
from cognee.infrastructure.databases.graph.get_graph_engine import _create_graph_engine
from cognee.infrastructure.databases.relational import get_relational_engine
from cognee.infrastructure.databases.relational.create_relational_engine import create_relational_engine

async def _release_all_cognee_file_handles() -> None:
    db_engine = get_relational_engine()
    await db_engine.engine.dispose()          # releases sqlite.db/-shm/-wal handles
    create_relational_engine.cache_clear()    # plain functools.lru_cache — no close() side effect, just drops the stale reference
    _create_vector_engine.cache_clear()       # closing_lru_cache -- evicts + closes every cached LanceDB adapter
    _create_graph_engine.cache_clear()        # closing_lru_cache -- evicts + closes every cached Kuzu/Ladybug adapter

# THEN, and only then:
from scripts import snapshot_memory
snapshot_memory.restore()   # unchanged — still never imports cognee
```

**Alternative (safer/more official, slightly slower):** replace the three `.cache_clear()` calls with `await cognee.prune.prune_system(graph=True, vector=True, metadata=False, cache=True)` — the public API performs the identical cache-clearing side effects (see its source: `if graph: _create_graph_engine.cache_clear()`, `if vector: _create_vector_engine.cache_clear()`) plus some redundant per-dataset delete work that doesn't matter since the tar restore immediately overwrites everything anyway. Either way, **the relational-engine `dispose()` step must be added separately** — neither approach covers it.

### Anti-Patterns to Avoid

- **Do not treat `forget()` as globally destructive to CHUNKS search.** The memory note `cognee-forget-drops-vector-collection` is real cognee behavior in a *different* configuration (non-access-control / shared single-tenant DB), not this app's. Do not add defensive CHUNKS-rebuild code to the loop; it would be solving a problem that doesn't exist in this deployment and would add needless complexity/latency to the timed 120s path.
- **Do not call `shutil.rmtree()` on `.patchpilot_memory/` from a live uvicorn process without first releasing cached engine handles.** This will intermittently (or, on Windows, near-certainly) raise `PermissionError` due to open SQLite/LanceDB/Kuzu file handles.
- **Do not import `cognee` inside `scripts/snapshot_memory.py`.** That module's docstring commitment (pure filesystem tool, usable standalone) is a deliberate design constraint from Phase 1 — do the engine-release dance in the new `backend/reset.py` route module instead, then delegate to the unmodified script.
- **Do not send raw `DocumentChunk` node `text` payloads to the browser in the `/graph` response.** Trim to label/type only; the 3D view needs graph structure, not full chunk bodies.
- **Do not add new cross-dataset entity names during corpus enrichment (D-09).** Any new proper noun introduced into `workarounds_v1_8/` or `workarounds_v1_9/` must stay exclusive to that one dataset, exactly like `dedup_sweeper`/`idempotency_guard` today (see `seed/README.md`'s isolation rule) — violating this reopens Cognee #1023's cross-dataset leak risk for the new content.
- **Do not put the `dynamic(..., {ssr:false})` call for `ForceGraph3D` inside a Server Component.** Per Next.js 16's own bundled docs (`node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`): "`ssr: false` is not allowed with `next/dynamic` in Server Components. Please move it into a Client Component." Since `frontend/app/page.tsx` is already `"use client"`, this is safe there, but any new isolated graph component must also carry its own `"use client"` directive if the dynamic import lives inside it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Extracting the knowledge graph's nodes/edges | A custom Kuzu/Ladybug Cypher query against the graph engine | `graph_engine.get_graph_data()` | Already implements the exact node/edge tuple extraction, including relationship properties and JSON-blob property merging; a hand-rolled query would need to reimplement all of that |
| Combining several datasets' graphs into one view | Manual loop calling `get_graph_data()` per dataset + custom dedup logic | `aggregate_multi_user_graphs(user_dataset_pairs)` | Already handles per-dataset context switching, node dedup by slug, and `source_user` tagging — writing this by hand risks missing the per-dataset `set_database_global_context_variables` scoping step, which would silently return the WRONG dataset's graph (or an empty one) |
| Releasing DB file locks before a filesystem swap | A custom "wait and retry rmtree" loop, or shelling out to force-close file handles | The engine-cache-`.cache_clear()` pattern cognee's own `prune_system()` uses | Retry loops are a band-aid for a race that a direct `close()` call eliminates outright; cognee already ships the correct mechanism, just not wired into a "reset" verb of its own |
| 3D graph physics/rendering | Custom Three.js force-simulation code | `react-force-graph`'s `ForceGraph3D` | D-07 already locks this; force-directed graph layout + WebGL rendering + interaction (drag/zoom/click) is a substantial undertaking that this library already solves well |
| Modal confirm dialog | Hand-rolled `<div>` overlay + focus trap + escape-key handling | shadcn's `dialog` (Radix `Dialog` primitive) | Radix's Dialog already handles focus trapping, ARIA roles, escape/outside-click dismissal, and portal rendering — a hand-rolled overlay would need to reimplement all of this for accessibility parity |

**Key insight:** Every "hand-roll" temptation in this phase (graph extraction, multi-dataset aggregation, file-lock release, 3D rendering, modal a11y) already has a library- or cognee-native answer discovered directly in the installed package source or verified npm registry data — this phase is almost entirely "wire existing APIs together," not "build new mechanisms."

## Common Pitfalls

### Pitfall 1: Assuming B-01's shared-collection failure applies here
**What goes wrong:** A plan spends effort adding CHUNKS-repair/rebuild logic to the demo loop, adding latency and risk to the 120s-critical path, to guard against a failure that cannot occur in this deployment's per-dataset-isolated storage mode.
**Why it happens:** The memory note `cognee-forget-drops-vector-collection` is accurate about a real cognee failure class (from a Phase 2 incident) and reads as unconditionally true.
**How to avoid:** Trust Pattern 1/2 above — the per-dataset isolation is empirically confirmed live (filesystem listing) and the dynamic re-query defense is already in `backend/search.py`. No new code needed for B-01.
**Warning signs:** If a live rehearsal DOES produce `{"status":"error"}` on the post-forget re-search, the actual cause is far more likely to be (a) a race between an in-flight search and a concurrent forget, or (b) an unrelated Mistral API hiccup — investigate those first, not the shared-collection theory.

### Pitfall 2: `shutil.rmtree()` failing on Windows mid-demo
**What goes wrong:** The reset button's backend call raises `PermissionError: [WinError 32]` because uvicorn still holds open handles to `sqlite.db`, a `.lance.db` file, or a `.lbug` file.
**Why it happens:** `create_relational_engine`'s plain `lru_cache` doesn't dispose the SQLAlchemy engine on `cache_clear()`, and even the closing-cache-covered adapters only release handles when their `close()` actually runs — skipping the cache-clear step entirely (e.g. by reusing the CLI's `--restore` flow verbatim inside a live request handler) leaves every handle open.
**How to avoid:** Follow Pattern 4 exactly — dispose the relational engine explicitly, then clear the two closing-caches, THEN call `snapshot_memory.restore()`.
**Warning signs:** Works fine when tested via `.venv/Scripts/python.exe scripts/snapshot_memory.py --restore` from a fresh terminal (no live process holding locks) but fails only when triggered through the running backend — that gap IS the concurrency bug this pitfall describes.

### Pitfall 3: `react-force-graph` rendered inside a Server Component boundary
**What goes wrong:** Build fails or hydration mismatches occur because `ForceGraph3D`/`three` reference `window`/`document`/WebGL at module-eval time.
**Why it happens:** `next/dynamic(..., {ssr:false})` silently doesn't disable SSR when invoked from a Server Component (Next 16's own docs explicitly call this out as an error case).
**How to avoid:** Put the `dynamic()` call inside a component file that starts with `"use client"` (e.g., `frontend/components/MemoryGraphView.tsx`), imported normally (no `dynamic()` at the import site) from `page.tsx` — which is itself already `"use client"`.
**Warning signs:** `ReferenceError: window is not defined` during `next build`, or a hydration warning in the browser console.

### Pitfall 4: The `*/`-in-CSS-comment landmine (B-04, carried forward from Phase 3)
**What goes wrong:** A literal `*/` inside a CSS block comment in new graph-view styling or `globals.css` edits closes the comment early and crashes the entire Next.js frontend build with a cryptic PostCSS error.
**Why it happens:** Documented in PROJECT.md's Phase 3 notes — only a live browser load catches it, not `tsc` or grep.
**How to avoid:** Avoid literal `*/` sequences inside any new CSS comment (e.g., when documenting a graph node/edge color token). If describing a closing brace or comment syntax in a comment, escape or reword it.
**Warning signs:** `next dev`/`next build` fails immediately after a CSS edit with a PostCSS parse error and no obvious JS stack trace.

### Pitfall 5: STRETCH-01 confidence score is NOT already present in the `/search` response
**What goes wrong:** A plan assumes `backend/search.py`'s existing CHUNKS call already carries a usable numeric score, since D-10 frames STRETCH-01 as "derive from the existing search() payload scores."
**Why it happens:** Cognee's `ChunksRetriever.get_completion_from_context()` deliberately strips each result down to `found_chunk.payload` only — the underlying `ScoredResult.score` (cosine `_distance` from LanceDB) is computed but discarded before it reaches the non-verbose `search()` return value used today.
**How to avoid:** The score IS retrievable, but only by passing `verbose=True` to the CHUNKS `cognee.search()` call, which reshapes the per-dataset result into `{"objects_result": [...], "text_result": ..., "context_result": ...}` instead of the current flat `"search_result"` key — `backend/search.py::_flatten_and_truncate()` needs a corresponding update to read `objects_result` (a list of `ScoredResult`-shaped items with `.payload`/`.score`) instead of the current `search_result` list-of-dicts. This is a real, scoped code change, not a one-line lookup.
**Warning signs:** Grepping the current `/search` response for any `score`/`distance` field will come up empty — that's expected, not a bug to chase.

## Runtime State Inventory

> Phase 4 is not a rename/refactor/migration phase — this section is omitted per the template's trigger condition. (No dataset names, secrets, or OS-registered state are being renamed in this phase; only new endpoints and a snapshot re-capture are introduced.)

## Code Examples

### Reshaping cognee's graph tuple format for react-force-graph
```python
# Source: shapes verified against cognee/infrastructure/databases/graph/ladybug/adapter.py::get_graph_data
# (installed package) — nodes: List[Tuple[str, dict]], edges: List[Tuple[str, str, str, dict]]
def to_force_graph_json(nodes: list[tuple[str, dict]], edges: list[tuple[str, str, str, dict]]) -> dict:
    return {
        "nodes": [
            {
                "id": node_id,
                "label": (props.get("name") or props.get("type") or node_id)[:80],
                "group": props.get("type", "unknown"),
            }
            for node_id, props in nodes
        ],
        "links": [
            {"source": source_id, "target": target_id, "label": relationship_name}
            for source_id, target_id, relationship_name, _props in edges
        ],
    }
```

### Client-only ForceGraph3D component (Next.js 16 App Router)
```tsx
// frontend/components/MemoryGraphView.tsx
"use client";

import dynamic from "next/dynamic";

// Source: node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md
// "Skipping SSR" example, adapted for a named export.
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
      onNodeClick={(node: { id: string }) => {
        // STRETCH-04 click-to-explore hook point
      }}
    />
  );
}
```

### Reset endpoint skeleton (D-03/D-04, Windows-safe)
```python
# backend/reset.py (new module)
import logging

from backend import cognee_config  # noqa: F401,E402

import cognee  # noqa: E402
from fastapi import APIRouter  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402

router = APIRouter()
logger = logging.getLogger(__name__)

_MSG_ERROR = "Could not reset memory. Please try again."


@router.post("/reset")
async def reset_memory():
    try:
        from cognee.infrastructure.databases.vector.create_vector_engine import (
            _create_vector_engine,
        )
        from cognee.infrastructure.databases.graph.get_graph_engine import (
            _create_graph_engine,
        )
        from cognee.infrastructure.databases.relational import get_relational_engine
        from cognee.infrastructure.databases.relational.create_relational_engine import (
            create_relational_engine,
        )

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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| DEMO-01's literal `prune_data()` + `prune_system()` + reseed | D-03's snapshot-restore reset | Locked in this phase's CONTEXT.md | Reseed bills `cognify()` for ~11 docs (~60-90s on Mistral free tier) every reset; snapshot restore is instant and free, and — as a side effect this research confirms — rebuilds each dataset's own per-dataset vector/graph files from a known-good state |
| Assuming a single shared `DocumentChunk_text` vector collection (memory note's framing) | Per-dataset-isolated LanceDB + Kuzu/Ladybug storage (cognee 1.2.2's default when the configured providers support it) | Confirmed live in this deployment during this research pass | The entire B-01 concern is moot for this app; no CHUNKS-repair code is needed |

**Deprecated/outdated:** None — the codebase is already on current cognee 1.2.2 and current Next.js 16.2.10/React 19.2.4; no library upgrades are needed for this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | The demo's browser session runs strictly sequentially (no two backend requests touching the same datasets concurrently) | Pattern 2 (B-01 residual risk) | If the demo script or a future multi-tab/multi-user use accidentally overlaps a `/search` and a `/forget` in flight, the `asyncio.gather`-without-`return_exceptions` fragility could still surface `{"status":"error"}` on a race |
| A2 | `cognee.prune.prune_system()`'s cache-clearing side effect (`_create_graph_engine.cache_clear()` / `_create_vector_engine.cache_clear()`) is stable private API across incidental cognee patch updates within the 1.2.2 line | Pattern 4 / Code Example (reset endpoint) | If a future cognee patch renames these underscore-prefixed functions, the direct-import reset pattern breaks; the `cognee.prune.prune_system(metadata=False)` public-API alternative is the safer long-term choice and is documented as such |
| A3 | The 4 dataset directories currently in `.patchpilot_memory/databases/<user_id>/` correspond to `incidents`, `workarounds_v1_8`, `workarounds_v1_9`, and one leftover healthcheck/canary dataset — not a fifth/unexpected dataset | Pattern 1 (empirical verification) | Low risk either way; the count doesn't affect the reconciliation's core claim (per-dataset isolation is real), only the exact inventory of what currently exists on disk |

## Open Questions

1. **Exact demo query + visible forget-proof (D-02, deferred to planner per CONTEXT.md)**
   - What we know: B-01 is resolved — the loop's re-search will NOT error post-forget. The Stripe "double-charged" query's dataset-row-vanishing + drift-badge-flip proof (per D-02's default) is fully viable.
   - What's unclear: whether the planner still wants to additionally fix `_flatten_and_truncate`'s non-interleaving (Phase 3's known evidence-panel gap, noted in STATE.md) so the evidence panel ALSO visibly drops a `workarounds_v1_8` chunk post-forget, for a more visually complete before/after — this is optional polish, not required for the loop to function.
   - Recommendation: keep the default (dataset-row-vanishing + drift-badge-flip) as the primary proof; treat evidence-panel interleaving as a stretch nice-to-have, gated behind the same "core loop confirmed working first" rule D-10 applies to STRETCH-01..04.

2. **How many enrichment docs are "modest" enough (D-09)?**
   - What we know: current corpus is 8 docs (~172-220 words each) across 3 datasets; each new doc costs ~7-8s of one-time `cognify()` billing at the next full reseed.
   - What's unclear: exactly how sparse the aggregated 3D graph looks with only 8 source docs — this research did not run a live `cognify()` + `get_graph_data()` round-trip to count actual extracted entity/relationship nodes (would consume LLM budget against the $10 cap without a clear go/no-go signal).
   - Recommendation: add 1 new decoy to `incidents/` + 1 reinforcing doc each to `workarounds_v1_8/` and `workarounds_v1_9/` (3 new docs, ~11 total) as a conservative first pass; re-run `--seed` once, inspect the actual `/graph` payload's node count, and add a second small batch only if it still looks sparse. `seed_cli.py`'s `folder.glob("*.md")` auto-discovery means no code change is needed to pick up new files.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Node.js / npm | `react-force-graph` install, Next.js dev/build | ✓ | (existing project toolchain, Next 16.2.10 already running) | — |
| Python venv with cognee 1.2.2 | reset/graph endpoints | ✓ | 1.2.2 [VERIFIED: `python -c "import cognee; print(cognee.__version__)"`] | — |
| `.patchpilot_memory/` per-dataset files | Reset restore, graph export | ✓ | 4 dataset dirs present at research time | — |
| Windows filesystem (project OS) | Reset endpoint's `shutil.rmtree` safety | ✓ (Windows 11) | — | N/A — Pattern 4's engine-release step is the mitigation, not a fallback |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — `react-force-graph` is not yet installed but is a standard `npm install`, not a missing environment capability.

## Validation Architecture

> Skipped — `.planning/config.json`'s `workflow.nyquist_validation` is explicitly `false`.

## Security Domain

> `security_enforcement` is enabled (`security_asvs_level: 1`) — included per protocol.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No | Single-user local demo app; no auth surface changes in this phase |
| V3 Session Management | No | No new session-bearing state introduced (reset/graph endpoints are stateless GET/POST, no cookies) |
| V4 Access Control | Yes (light) | Both new endpoints (`/reset`, `/graph`) are unauthenticated, matching every existing endpoint in this app (localhost-only, CORS-locked to `http://localhost:3000`, no deployed multi-tenant exposure this phase) — consistent with existing pattern, not a regression |
| V5 Input Validation | Yes (light) | `/reset` and `/graph` take no user-supplied input in their basic form; if `/graph` later accepts a dataset filter param, validate it the same way `backend/forget.py::_is_forgettable_workaround` validates dataset names (regex + live-list membership) before use |
| V6 Cryptography | No | No new crypto surface in this phase |
| V7 Error Handling & Logging | Yes | Follow D-24 exactly — `try/except Exception` around both new routes, log server-side via `logger.exception`, return only the fixed short human message (`_MSG_ERROR`), never raw exception text — matches every existing route in this codebase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Repeated `/reset` calls causing resource exhaustion or corrupting an in-flight demo | Denial of Service | Disable the reset button client-side while a reset request is in flight (natural side effect of D-04's "visible reset animation" already covering this); optionally debounce server-side if judged necessary, but not required for a single-operator local demo |
| `/graph` response leaking full raw chunk text to the browser | Information Disclosure | Trim `DocumentChunk` node `text`/raw-content fields to label-only before serializing the graph JSON (see Pattern 3's "Trim large fields" note) — low actual sensitivity for this demo's seed data, but keeps payload size bounded as corpus grows (D-09) |
| A forged/oversized request body to a new endpoint | Tampering | `/reset` and `/graph` take no body in their minimal form — no injection surface. If parameters are added later, apply the same `Field(..., min_length=1)` + regex validation pattern already used in `ForgetRequest`/`SearchRequest` |

## Sources

### Primary (HIGH confidence — direct inspection of the installed cognee 1.2.2 package and this project's live filesystem/codebase)
- `.venv/Lib/site-packages/cognee/api/v1/forget/forget.py` — `forget()`/`_forget_dataset()` implementation
- `.venv/Lib/site-packages/cognee/modules/data/methods/delete_dataset.py` — per-dataset handler dispatch on delete
- `.venv/Lib/site-packages/cognee/infrastructure/databases/vector/lancedb/LanceDBDatasetDatabaseHandler.py` — confirms per-dataset `.lance.db` file naming
- `.venv/Lib/site-packages/cognee/infrastructure/databases/vector/lancedb/LanceDBAdapter.py` — `delete_data_points` (row-level), `prune` (table-drop), `close()`
- `.venv/Lib/site-packages/cognee/infrastructure/databases/graph/ladybug/adapter.py` — `get_graph_data()` exact return shape, `close()`
- `.venv/Lib/site-packages/cognee/context_global_variables.py` — `backend_access_control_enabled()` / `multi_user_support_possible()` default-enable logic
- `.venv/Lib/site-packages/cognee/modules/search/methods/search.py` — `search_in_datasets_context()`'s per-dataset `asyncio.gather` fan-out (access-control mode)
- `.venv/Lib/site-packages/cognee/modules/data/deletion/prune_system.py` — the sanctioned cache-clear pattern this research's reset recipe mirrors
- `.venv/Lib/site-packages/cognee/infrastructure/databases/utils/closing_lru_cache.py` — confirms `.cache_clear()` triggers real `close()`
- `.venv/Lib/site-packages/cognee/api/v1/visualize/visualize.py` + `.../modules/visualization/cognee_network_visualization.py` — `visualize_graph`/`aggregate_multi_user_graphs`
- `.venv/Lib/site-packages/cognee/modules/retrieval/chunks_retriever.py` + `.../modules/search/methods/get_retriever_output.py` — confirms CHUNKS scores are dropped unless `verbose=True`
- `.patchpilot_memory/databases/4cfff1f3-.../` (live filesystem listing) — empirical confirmation of per-dataset `.lance.db`/`.lbug` files
- `backend/search.py`, `backend/forget.py`, `backend/drift.py`, `backend/main.py`, `backend/datasets.py`, `backend/cognee_config.py`, `frontend/lib/api.ts`, `frontend/components/DiagnosisCard.tsx`, `scripts/snapshot_memory.py`, `seed/seed_cli.py`, `seed/README.md` — this project's own code
- `.planning/phases/03-drift-forget/03-UAT.md`, `03-VERIFICATION.md` — Phase 3's live 3/3 pass evidence, directly corroborating the B-01 reconciliation
- `npm view react-force-graph / react-force-graph-3d / three / 3d-force-graph` — registry metadata (version, downloads, repo, publish date)
- `gsd-tools query package-legitimacy check` — `react-force-graph` OK, `react-force-graph-3d` OK, `three` SUS (heuristic false positive, analyzed above)

### Secondary (MEDIUM confidence)
- `frontend/node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` — bundled Next.js 16 docs, `next/dynamic` + `ssr:false` + Client Component requirement

### Tertiary (LOW confidence)
- None — no web search providers were enabled for this research session (`brave_search`/`exa_search`/`firecrawl`/`tavily_search` all `false` in `.planning/config.json`); all findings above are grounded in direct source/filesystem/registry inspection rather than web search, which is why confidence is HIGH throughout rather than MEDIUM.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions/downloads/repos verified live via `npm view` and the package-legitimacy seam, not training-data recall
- Architecture (B-01/B-02/B-03/B-04 reconciliation): HIGH — every claim traced to specific lines in the installed cognee 1.2.2 package source, cross-checked against this project's own live filesystem state and Phase 3's UAT evidence
- Pitfalls: HIGH for B-01/reset-lock/Next.js-SSR pitfalls (source-verified); MEDIUM for the exact corpus-density sizing in Open Question 2 (no live `cognify()`+`get_graph_data()` dry run was performed to avoid unnecessary LLM spend)

**Research date:** 2026-07-03
**Valid until:** Stable for the remainder of this milestone (cognee/Next.js/react-force-graph pinned versions won't drift mid-phase); re-verify the `_create_vector_engine`/`_create_graph_engine` private-API names if `cognee` is ever upgraded past 1.2.2.
