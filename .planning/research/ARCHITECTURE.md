# Architecture Research

**Domain:** Incident-memory system — Next.js (App Router) + FastAPI + self-hosted Cognee
**Researched:** 2026-06-30
**Confidence:** MEDIUM (Cognee SDK via official docs/deepwiki; FastAPI/Next.js patterns well-established)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER / CLIENT                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  SearchPage  │  │  GraphView   │  │  DriftDashboard       │ │
│  │  DiagCard    │  │  (vis graph) │  │  (🟢🟡🔴 badges)     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘ │
│         │                  │                      │             │
│         └──────────────────┴──────────────────────┘            │
│                            │ fetch /api/*                       │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│              NEXT.JS APP ROUTER (BFF Layer)                     │
│  app/api/remember/route.ts   app/api/recall/route.ts            │
│  app/api/feedback/route.ts   app/api/forget/route.ts            │
│  app/api/release/route.ts    app/api/reset/route.ts             │
│  app/api/drift/route.ts      app/api/graph/route.ts             │
│                            │ HTTP POST/GET to :8000             │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                  FASTAPI BACKEND (:8000)                        │
│  ┌──────────────────────┐  ┌─────────────────────────────────┐  │
│  │  routers/memory.py   │  │  routers/lifecycle.py           │  │
│  │  POST /remember      │  │  POST /release                  │  │
│  │  POST /recall        │  │  DELETE /forget                 │  │
│  │  POST /feedback      │  │  POST /reset                    │  │
│  └──────────┬───────────┘  └──────────────┬──────────────────┘  │
│             │                              │                     │
│  ┌──────────┴──────────────────────────────┴──────────────────┐  │
│  │              services/drift.py (DriftService)              │  │
│  │              services/memory.py (MemoryService)            │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │ cognee SDK calls (async/await)    │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│               COGNEE (self-hosted, in-process)                  │
│                             │                                   │
│  add(data, dataset_name) → cognify() → graph + vector + sqlite  │
│  search(GRAPH_COMPLETION) / search(CHUNKS)                      │
│  forget(dataset=name) — surgical per-dataset deletion           │
│  prune.prune_data() / prune.prune_system()                      │
│                                                                  │
│  .patchpilot_memory/                                             │
│  ├── system/    (SYSTEM_ROOT_DIRECTORY — graph + vector)         │
│  └── data/      (DATA_ROOT_DIRECTORY — raw source files)         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Owns | Does NOT Own |
|-----------|------|--------------|
| **Next.js pages** | UI rendering, user interactions, state display (drift badges, diagnosis card, graph view) | Business logic, Cognee calls |
| **Next.js Route Handlers** (`app/api/*/route.ts`) | HTTP proxy/BFF layer — forward requests from browser to FastAPI, reshape responses for UI | Memory logic, drift scoring |
| **FastAPI routers** | Endpoint contracts, request validation (Pydantic), HTTP response shaping | Raw Cognee SDK calls (delegated to services) |
| **FastAPI MemoryService** | Wraps all Cognee SDK calls — add, cognify, search, forget, improve, prune | Drift scoring, release logic |
| **FastAPI DriftService** | Memory drift heuristic — reads release metadata + stored memory metadata, computes 🟢/🟡/🔴 state | Cognee calls (reads from MemoryService) |
| **Cognee (in-process)** | Knowledge graph construction, vector + graph storage, semantic search, dataset-scoped memory lifecycle | API surface, HTTP, drift logic |
| **`.patchpilot_memory/`** | Persistent on-disk state — graph (ladybug), vectors (lancedb), sqlite metadata | Served directly; FastAPI reads through Cognee SDK only |

---

## Endpoint Design

### POST /remember

**Purpose:** Ingest incident/ticket/chat text into durable memory.

```
Request:  { content: str, source_type: "ticket"|"chat"|"changelog", dataset_name: str = "incidents" }
Response: { status: "processing", dataset: str, data_id: str }

FastAPI:
  1. await cognee.add(content, dataset_name)      # stage + dedup
  2. BackgroundTask: await cognee.cognify()        # LLM extraction — slow, async
  3. Return 202 immediately after add()
```

`cognify` runs in a `BackgroundTasks` job because LLM graph extraction takes 5–30 s and must not block the HTTP response. The dataset_name defaults to `"incidents"` for durable memories.

### POST /recall

**Purpose:** Fused recall — graph reasoning + grounding evidence.

```
Request:  { query: str, datasets: list[str] = ["incidents"] }
Response: {
  answer:    str,           # GRAPH_COMPLETION result — reasoning across the graph
  evidence:  list[Chunk],   # CHUNKS results — specific tickets/passages
  confidence: float         # optional: ratio of evidence chunks that corroborate answer
}

FastAPI:
  results_graph = await cognee.search(query, SearchType.GRAPH_COMPLETION, datasets=datasets)
  results_chunks = await cognee.search(query, SearchType.CHUNKS, datasets=datasets)
  return merge(results_graph[0], results_chunks)
```

Run both searches in parallel (`asyncio.gather`). The GRAPH_COMPLETION result is the "answer"; CHUNKS results become the "evidence" list shown below the diagnosis card. This is what makes the diagnosis card — root cause is not fabricated but reconstructed from real stored incidents.

### POST /feedback

**Purpose:** Engineer marks a fix as accepted/rejected; reinforces memory weighting.

```
Request:  { query: str, feedback_text: str, score: int }  # score: -5 to +5
Response: { status: "reinforced" }

FastAPI:
  # Save interaction was set during recall (save_interaction=True)
  await cognee.search(
      query_text=feedback_text,
      query_type=SearchType.FEEDBACK,
      last_k=1
  )
```

Feedback scores land on the graph edges that answered the query. Positive scores strengthen paths; negative scores weaken them. The `feedback_alpha` parameter (if exposed by the SDK version in use) controls learning rate; omit it to use the default unless calibration is needed.

### DELETE /forget

**Purpose:** Surgical removal of a named dataset (e.g., stale workaround dataset).

```
Request:  { dataset_name: str }   # e.g. "workarounds_v1_9"
Response: { status: "forgotten", dataset: str }

FastAPI:
  await cognee.forget(dataset=dataset_name)
```

Only the named dataset is removed. The `"incidents"` dataset is never passed here — only `"workarounds_vX_Y"` pattern datasets. This is the surgical forget guarantee.

### POST /release

**Purpose:** Ingest release notes and trigger Memory Drift scoring for affected memories.

```
Request:  { version: str, content: str, component_names: list[str] }
Response: { dataset_name: str, drift_results: list[DriftResult] }

FastAPI:
  dataset_name = f"workarounds_v{version.replace('.', '_')}"
  await cognee.add(content, dataset_name)
  bg: await cognee.cognify()                          # background task
  drift_results = drift_service.score(
      release_version=version,
      components=component_names
  )
  return { dataset_name, drift_results }
```

The release notes are ingested into their own scoped dataset (`workarounds_v1_9`), not into `incidents`. DriftService then runs heuristics against stored memory metadata.

### POST /reset

**Purpose:** Full memory wipe for demo reset.

```
Request:  {} (or optional seed_data flag)
Response: { status: "reset" }

FastAPI:
  await cognee.prune.prune_data()
  await cognee.prune.prune_system(metadata=True)
```

---

## Dataset Scoping Strategy

This is the core architectural decision enabling surgical forget without collateral damage.

```
Dataset: "incidents"                     (durable — never forgotten)
├── Ticket #4521: auth timeout cascade
├── Ticket #3890: DB connection pool exhaustion
└── Incident: payments degraded v1.7

Dataset: "workarounds_v1_8"              (per-release — forgettable)
├── Release notes v1.8
└── Known fix: restart auth service

Dataset: "workarounds_v1_9"              (per-release — forgettable)
├── Release notes v1.9
└── New fix: connection pool config (supersedes v1.8 workaround)
```

**Rule:** `add(data, dataset_name)` where:
- `dataset_name = "incidents"` for tickets, past fixes, changelogs
- `dataset_name = f"workarounds_v{version}"` for release notes / per-release workarounds

**Forget pattern:**
```python
# When v1.9 ships and makes v1.8 workaround stale:
await cognee.forget(dataset="workarounds_v1_8")
# "incidents" dataset untouched
```

**Recall cross-dataset:** Search can span both datasets before a forget to surface both the old workaround and the incident context. After forget, the old workaround is gone but the underlying incident memory remains.

---

## Memory Drift Service

The DriftService is a pure Python service inside FastAPI — no Cognee calls, no ML model. It must stay explainable.

### Location

`backend/services/drift.py` — a class, not a Cognee extension.

### Inputs

```python
@dataclass
class DriftInput:
    memory_dataset: str          # e.g. "workarounds_v1_8"
    memory_created_at: datetime
    memory_components: list[str] # components referenced in the stored memory
    last_recalled_at: datetime | None
    release_version: str
    release_components: list[str] # component names in the new release notes
    release_incident_refs: list[str] # incident IDs in release notes
    known_incident_refs: list[str]   # incident IDs in stored memory
```

### Heuristic Rules (in priority order)

```python
def score(self, inp: DriftInput) -> DriftState:
    # Rule 1: Release explicitly resolves an incident this memory references
    if set(inp.release_incident_refs) & set(inp.known_incident_refs):
        return DriftState.DRIFTING   # 🔴

    # Rule 2: Release touches same component(s) as this memory
    if set(inp.release_components) & set(inp.memory_components):
        return DriftState.AGING      # 🟡 → escalate to 🔴 if 2+ releases overlap

    # Rule 3: Memory not recalled in > 30 days
    if inp.last_recalled_at and (now - inp.last_recalled_at).days > 30:
        return DriftState.AGING      # 🟡

    # Rule 4: Memory > 90 days old and never recalled
    if inp.last_recalled_at is None and (now - inp.memory_created_at).days > 90:
        return DriftState.AGING      # 🟡

    return DriftState.STABLE         # 🟢
```

### Output (per memory/dataset)

```python
@dataclass
class DriftResult:
    dataset_name: str
    state: DriftState       # STABLE | AGING | DRIFTING
    reason: str             # human-readable explanation — must be visible in UI
    recommend_forget: bool  # True when DRIFTING
```

The `reason` field is shown directly in the UI alongside the badge. This keeps the heuristic visible/explainable to judges and engineers.

---

## Data Flow

### Ingest Flow (remember)

```
User pastes ticket text
    → POST /api/remember (Next.js Route Handler)
    → POST :8000/remember (FastAPI)
    → cognee.add(content, "incidents")          [immediate: staging + hash dedup]
    → return 202 { status: "processing" }
    → [background] cognee.cognify()             [slow: LLM graph extraction]
    → graph nodes + edges written to .patchpilot_memory/system/
```

### Recall Flow

```
User types query → Submit
    → POST /api/recall (Next.js Route Handler)
    → POST :8000/recall (FastAPI)
    → asyncio.gather(
          cognee.search(query, GRAPH_COMPLETION, datasets=["incidents"]),
          cognee.search(query, CHUNKS, datasets=["incidents"])
      )
    → merge: { answer: graph_result, evidence: chunk_results }
    → Next.js: render DiagnosisCard (answer above, evidence list below)
```

### Release + Drift Flow

```
User uploads release notes (v1.9)
    → POST /api/release (Next.js Route Handler)
    → POST :8000/release (FastAPI)
    → cognee.add(notes, "workarounds_v1_9")
    → [background] cognee.cognify()
    → DriftService.score(
          release_components=["auth", "payments"],
          release_incident_refs=["INC-4521"]
      )
    → returns list[DriftResult] with 🟢🟡🔴 + reason + recommend_forget
    → UI shows drift dashboard; 🔴 items have "Forget" button
```

### Forget + Re-search Demo Loop

```
User clicks "Forget" on stale workaround
    → DELETE /api/forget?dataset=workarounds_v1_8 (Next.js Route Handler)
    → DELETE :8000/forget (FastAPI)
    → cognee.forget(dataset="workarounds_v1_8")
    → 200 { status: "forgotten" }
    → User re-searches same query
    → Old workaround no longer appears; new fix (from v1.9) surfaces
    ← This is the before/after demo loop — < 120 seconds end-to-end
```

---

## Project Structure

```
patch-pilot/
├── frontend/                       # Next.js App Router
│   ├── app/
│   │   ├── api/                    # Route Handlers (BFF proxy layer)
│   │   │   ├── remember/route.ts
│   │   │   ├── recall/route.ts
│   │   │   ├── feedback/route.ts
│   │   │   ├── forget/route.ts
│   │   │   ├── release/route.ts
│   │   │   ├── reset/route.ts
│   │   │   └── drift/route.ts
│   │   ├── (pages)/
│   │   │   ├── page.tsx            # Search / recall UI
│   │   │   ├── ingest/page.tsx     # Remember + release upload
│   │   │   ├── graph/page.tsx      # Memory graph visualization
│   │   │   └── drift/page.tsx      # Drift dashboard
│   │   └── layout.tsx
│   └── components/
│       ├── DiagnosisCard.tsx       # Answer + evidence list
│       ├── DriftBadge.tsx          # 🟢🟡🔴 with reason tooltip
│       ├── GraphViewer.tsx         # Cognee graph visualization
│       └── MemoryHealthPanel.tsx   # Dataset state overview
│
├── backend/                        # FastAPI
│   ├── main.py                     # App factory, CORS, router mounts
│   ├── routers/
│   │   ├── memory.py               # /remember, /recall, /feedback
│   │   └── lifecycle.py            # /forget, /release, /reset
│   ├── services/
│   │   ├── memory.py               # MemoryService — all cognee SDK calls
│   │   └── drift.py                # DriftService — pure heuristic, no cognee
│   ├── models/
│   │   └── schemas.py              # Pydantic request/response models
│   └── .env                        # LLM_API_KEY, dir overrides
│
└── .patchpilot_memory/             # Cognee on-disk state (must be on persistent disk)
    ├── system/                     # SYSTEM_ROOT_DIRECTORY — graph + vector stores
    └── data/                       # DATA_ROOT_DIRECTORY — staged source files
```

---

## Cognee Configuration (.env)

```bash
# LLM
LLM_PROVIDER=openai
LLM_MODEL=openai/gpt-4o-mini
LLM_API_KEY=sk-...
LLM_TEMPERATURE=0.0

# Vector DB — lancedb is file-based, no service needed
VECTOR_DB_PROVIDER=lancedb

# Graph DB — ladybug is file-based (Cognee default)
GRAPH_DATABASE_PROVIDER=ladybug

# Relational DB — sqlite, no service needed
DB_PROVIDER=sqlite

# Embeddings — use same key as LLM
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=openai/text-embedding-3-large

# Data directories — mount both on persistent disk in production
SYSTEM_ROOT_DIRECTORY=.patchpilot_memory/system
DATA_ROOT_DIRECTORY=.patchpilot_memory/data
```

All defaults are file-based. No Postgres, Neo4j, or Redis required for the hackathon build. This is why self-hosted Cognee is a valid "Best Use of Open Source" target — the entire memory stack is embedded.

---

## Architectural Patterns

### Pattern 1: 202-Accept + Background cognify

**What:** `/remember` and `/release` return 202 immediately after `cognee.add()`; `cognify()` runs as a `BackgroundTask`.

**Why:** `cognify()` calls the LLM to extract graph entities and can take 5–30 s. Blocking on it would make the UI unresponsive and burn user patience.

**Trade-off:** The graph is not queryable until cognify completes. The UI should show a "processing" state. For the demo, ingest sample data before the live demo so the graph is pre-built.

### Pattern 2: Fused Dual-Search Recall

**What:** `asyncio.gather()` fires `GRAPH_COMPLETION` and `CHUNKS` searches simultaneously; results are merged into `{ answer, evidence }`.

**Why:** `GRAPH_COMPLETION` reasons across connected incident nodes to produce a recommendation; `CHUNKS` returns the literal ticket passages that ground it. One without the other produces either an ungrounded answer or raw text with no synthesis.

**Trade-off:** Two LLM/vector calls per recall. At gpt-4o-mini pricing and the demo's query volume, this is negligible.

### Pattern 3: Two-Dataset Memory Split

**What:** Durable incidents always go to `"incidents"` dataset. Release notes and per-release workarounds always go to `f"workarounds_v{version}"`.

**Why:** `forget(dataset=name)` is the only granularity Cognee exposes for deletion. Without dataset segmentation, forgetting a stale workaround would require deleting all memory.

**Trade-off:** Recall must search across both datasets before a forget event. After forget, only `"incidents"` is searched. This cross-dataset search is the default since Cognee searches all user-owned datasets if no `datasets=` filter is passed.

### Pattern 4: DriftService as Pure Heuristic

**What:** DriftService is a plain Python class with no ML, no Cognee calls — only datetime comparisons and set intersections on component names and incident refs.

**Why:** Judges need to understand how drift scoring works. A black-box model would require explanation; explicit rules are self-documenting. The `reason` string output ensures the heuristic is always visible in the UI.

**Trade-off:** Rules are hand-tuned, not learned. They can be wrong. For the hackathon, this is a feature (explainability) not a bug.

---

## Anti-Patterns

### Anti-Pattern 1: Calling cognify() Synchronously in the Endpoint

**What people do:** `await cognee.add(data); await cognee.cognify(); return 200`

**Why it's wrong:** cognify() takes 5–30 s of LLM processing. The HTTP connection times out or the UI spinner spins indefinitely, making the app feel broken.

**Do this instead:** Return 202 after `add()`. Fire `cognify()` in `BackgroundTasks`. Poll or show a static "processing" message.

### Anti-Pattern 2: Ingesting Everything into One Dataset

**What people do:** All data — tickets, release notes, workarounds — goes into `"incidents"` or `"main"`.

**Why it's wrong:** `forget()` can only delete an entire dataset. You cannot surgically remove one release's workarounds without also deleting all incidents.

**Do this instead:** Strict two-bucket rule — `"incidents"` for durable data, `f"workarounds_v{version}"` for each release.

### Anti-Pattern 3: Calling Cognee Directly from Next.js

**What people do:** Call cognee Python SDK from a Next.js API route (impossible — different runtimes) or call FastAPI from Server Components without the BFF layer.

**Why it's wrong:** Server Components can call FastAPI directly but bypass the BFF layer, leaking backend URLs to the client and losing the proxy pattern.

**Do this instead:** All FastAPI calls go through Next.js Route Handlers. Route Handlers forward to FastAPI. Client components only know `/api/*`.

### Anti-Pattern 4: Deploying FastAPI on an Ephemeral Filesystem

**What people do:** Deploy FastAPI to Render free tier or similar with default disk — `.patchpilot_memory/` lives on the ephemeral container FS.

**Why it's wrong:** Every deploy wipes memory. The demo's pre-seeded incidents and graph disappear on redeploy.

**Do this instead:** Attach a persistent disk to the deploy target. Mount it at the path set by `SYSTEM_ROOT_DIRECTORY` and `DATA_ROOT_DIRECTORY`. On Render: add a Persistent Disk, set mount path to `/data`, update env vars to point there.

---

## Build Order

The component graph has a clear dependency chain that dictates build order:

```
Phase 1: Cognee + FastAPI scaffold
  └── Verify cognee.add/cognify/search work locally
  └── /remember and /recall endpoints functional
  └── .patchpilot_memory/ persisting across restarts
  ↓
Phase 2: Next.js scaffold + BFF proxy
  └── Route Handlers wired to FastAPI
  └── Basic search UI showing DiagnosisCard (answer + evidence)
  ↓
Phase 3: Release + Dataset scoping
  └── /release endpoint with workarounds_vX_Y datasets
  └── Dataset list visible (what's in memory)
  └── forget() verified to be surgical
  ↓
Phase 4: Memory Drift
  └── DriftService heuristic implemented + tested
  └── Drift dashboard UI with 🟢🟡🔴 + reason
  └── "Forget" button triggers /forget → UI refreshes
  ↓
Phase 5: Demo loop + Polish
  └── Before/after recall flow < 120 s end-to-end
  └── Feedback endpoint wired
  └── Graph visualization
  └── Seed dataset (compelling demo data)
  └── Reset endpoint for demo recovery
```

**Why this order:** You cannot test drift without first having release scoping (Phase 3). You cannot demonstrate the forget loop without drift scoring (Phase 4). The UI (Phase 2) is built early enough to make manual testing ergonomic but is not blocked until the backend exists (Phase 1). Demo data and polish (Phase 5) are last because they require all features to be functional to verify the narrative.

---

## Scalability Considerations

| Scale | Notes |
|-------|-------|
| Hackathon demo (1 user, ~100 memories) | Default config — sqlite, lancedb, ladybug — is ideal. No extra services. |
| Small team (5–20 users, 10K memories) | Switch to Postgres (DB_PROVIDER=postgres) for the relational layer. LanceDB handles vector scale fine. |
| Production SaaS (100+ users) | Replace ladybug with Neo4j or FalkorDB for graph. Add Qdrant or pgvector for vectors. Add Redis for queue instead of BackgroundTasks. Out of scope for this build. |

The hackathon target is the first row. Do not over-engineer.

---

## Integration Points

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Browser ↔ Next.js Route Handlers | `fetch('/api/*')` — JSON | Client components use SWR or plain fetch |
| Next.js Route Handlers ↔ FastAPI | `fetch('http://localhost:8000/*')` — JSON | CORS configured on FastAPI; URL is env var `FASTAPI_URL` |
| FastAPI ↔ Cognee | Python async function calls (in-process) | Cognee runs in the same FastAPI process — no network hop |
| Cognee ↔ OpenAI | HTTPS API calls for cognify (LLM) + embeddings | Only cognify incurs meaningful cost; guard with $10 hard cap |
| Cognee ↔ disk | File I/O to `.patchpilot_memory/` | Must be on persistent volume in any non-local deployment |

---

## Sources

- [Cognee Python API Reference — DeepWiki](https://deepwiki.com/topoteretes/cognee/2.1-python-api-reference)
- [Cognee Setup Configuration — Official Docs](https://docs.cognee.ai/setup-configuration/overview)
- [Cognee CLI Reference — Official Docs](https://docs.cognee.ai/cognee-cli/overview)
- [Cognee API Reference — Official Docs](https://docs.cognee.ai/api-reference/introduction)
- [Cognee Auto-Optimization / feedback_alpha — Official Blog](https://www.cognee.ai/blog/cognee-news/product-announcement-auto-optimization)
- [Beyond Recall: Building Persistent Memory with Cognee — Tutorial](https://www.cognee.ai/blog/tutorials/beyond-recall-building-persistent-memory-in-ai-agents-with-cognee)
- [FastAPI Background Tasks — Official Docs](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [Server Actions vs Route Handlers — MakerKit](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers)

---
*Architecture research for: PatchPilot — self-hosted Cognee incident-memory system*
*Researched: 2026-06-30*
