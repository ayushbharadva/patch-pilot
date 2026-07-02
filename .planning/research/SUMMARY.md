# Project Research Summary

**Project:** PatchPilot
**Domain:** Incident-memory system — self-hosted Cognee + FastAPI + Next.js (App Router)
**Researched:** 2026-06-30
**Confidence:** MEDIUM

## Executive Summary

PatchPilot is a hackathon-targeted incident-memory system where the primary scoring lever is deep, visible use of Cognee's memory lifecycle: ingest → recall → drift-detect → surgical forget → re-search proof. The core demo loop — search returns old workaround, upload release marks it 🔴, forget it, re-search returns new correct fix — must run end-to-end in under 120 seconds. The entire value proposition collapses if the before/after flip does not visibly happen. Everything in the architecture and build order is subordinate to protecting that loop.

The recommended approach is a three-tier architecture (Next.js App Router BFF → FastAPI → in-process Cognee) using fully file-based storage (Kuzu graph, LanceDB vector, SQLite relational) — no Docker, no external databases. The memory lifecycle uses a strict two-dataset split: durable incidents always in the `"incidents"` dataset, per-release workarounds in `"workarounds_v{version}"` datasets, enabling Cognee's `forget(dataset=...)` to surgically remove stale workarounds without touching durable incident knowledge. The DriftService is a pure Python heuristic class (no ML, no black box) that must surface a human-readable reason alongside every 🔴 badge.

The three highest risks are: (1) the demo-loop integrity risk from Cognee Issue #1023 — dataset filtering is partially broken in the vector layer and GRAPH_COMPLETION traverses the full graph, meaning seed data entity names must be strictly isolated per dataset or the before/after flip will silently fail; (2) `cognify()` hangs silently (GitHub Issues #1743/#2119) with no error or timeout on misconfigured environments, requiring a `/health/cognee` smoke test as a hard Phase 1 exit gate before any other phase begins; and (3) the `improve()` / feedback API is unresolved — conflicting findings between `improve(feedback_alpha=)` (V2 API) and `search(SearchType.FEEDBACK)` (server-mode) require a Day-1 runtime spike before the feedback requirement is planned. Persistent disk on Render must be configured before any seed data is loaded — ephemeral FS wipes memory on every redeploy.

## Key Findings

### Recommended Stack

The stack is fixed by hackathon spec and fully confirmed: Cognee 1.2.2 (pinned exact version, released 2026-06-26), FastAPI 0.138.2 (released 2026-06-29), Next.js 16.2.9, Python 3.12, OpenAI gpt-4o-mini. Cognee runs in-process inside FastAPI — it is a Python library, not a service. All three storage backends (Kuzu, LanceDB, SQLite) are file-based and ship with `pip install cognee`, requiring zero Docker or external infrastructure. State lives under `.patchpilot_memory/` and must be on a persistent volume in any cloud deployment.

**Core technologies:**
- **Cognee 1.2.2**: Memory layer (graph + vector + sqlite) — only library that ships graph extraction + surgical dataset forget in one package; target "Best Use of Open Source" prize track
- **FastAPI 0.138.2**: Backend API — async-native so `await cognee.*()` calls fit without thread hacks; `--workers 1` mandatory (Kuzu file locking)
- **Next.js 16.2.9 (App Router)**: Frontend BFF — Route Handlers proxy all FastAPI calls; client never knows FastAPI URL
- **OpenAI gpt-4o-mini**: LLM for `cognify()` graph extraction — stays within $10 cap; ~6x cheaper than gpt-4o with negligible quality difference for entity extraction
- **react-force-graph**: Memory graph visualization — lightweight canvas, dead-simple API, works for <10K nodes
- **Tailwind CSS 4.x + @tanstack/react-query 5.x**: UI velocity layer for hackathon timeline

**Critical version constraints:**
- Pin `cognee==1.2.2` immediately; never `cognee>=`. Run `pip freeze > requirements.txt` from known-good install.
- `uvicorn --workers 1` in prod — Kuzu file locking corrupts graph with multiple workers.
- Node.js >=20 required for Next.js 16 (Node 18 EOL Oct 2025).

### Expected Features

**Must have (120-second demo critical path — all 6 must work as a chain):**
- Multi-source ingest with per-release dataset scoping (`incidents` durable, `workarounds_v{N}` per-release)
- Recall: fused `search(GRAPH_COMPLETION)` + `search(CHUNKS)` → Diagnosis Card (root cause + evidence)
- Release upload that sets dataset context and triggers drift evaluation
- Memory Drift detection — 🔴 Drifting badge with visible human-readable reason (not a black-box score)
- Surgical `forget(dataset="workarounds_v1_9")` — one button, confirms surgical deletion
- Re-search proof loop — same query, different result; old 🔴 workaround gone

**Must have (full v1 per PROJECT.md, beyond the 120s demo path):**
- Engineer feedback → `improve()` reinforcement (see Gaps — API is unresolved)
- Memory Graph view (react-force-graph; visual proof Cognee builds a real knowledge graph)
- `prune.prune_data()` + `prune.prune_system()` reset — dev-mode demo recovery button
- Past incident listing / browse — basic inventory of what is in memory

**Should have (stretch v1 — cut first if time runs short):**
- Confidence scoring on recall (derives from `SearchResultPayload` relevance scores; low marginal effort)
- Memory health dashboard (aggregate drift counts; requires drift detection working first)
- Incident timeline (chronological sort of ingest events; cosmetic narrative aid)
- Richer / interactive graph visualization (click-to-explore nodes; highest effort, lowest demo-loop risk)

**Defer to v2+:**
- Real Slack/GitHub/Jira/Zendesk integrations — use sample datasets; integrations are demo theater
- Multi-user / auth / real-time sync — zero judge value
- Auto-patching / code generation — different product category

### Architecture Approach

Three-tier with Cognee in-process: Next.js App Router Route Handlers act as a BFF proxy forwarding client requests to FastAPI at `:8000`; FastAPI routers delegate to `MemoryService` (all Cognee SDK calls) and `DriftService` (pure Python heuristic, no Cognee calls); Cognee runs inside the FastAPI process with file-based storage in `.patchpilot_memory/`. The architectural keystone is the two-dataset memory split — all data must be routed to either `"incidents"` (durable, never forgotten) or `"workarounds_v{version}"` (per-release, surgically forgettable). This decision must be locked on Day 1 and held constant; changing it later breaks drift detection and the entire forget loop.

**Major components:**
1. **Next.js Route Handlers** (`app/api/*/route.ts`) — BFF proxy layer; client components only know `/api/*`
2. **FastAPI routers** (`memory.py`, `lifecycle.py`) — endpoint contracts, Pydantic validation, response shaping
3. **MemoryService** (`backend/services/memory.py`) — wraps all Cognee SDK calls (add, cognify, search, forget, improve, prune)
4. **DriftService** (`backend/services/drift.py`) — pure Python heuristic; datetime comparisons + component set intersections; outputs `DriftResult` with `reason` string for UI
5. **Cognee in-process** — knowledge graph construction, vector + graph storage, semantic search, dataset-scoped lifecycle
6. **`.patchpilot_memory/`** — all persistent state; must be on a Render persistent disk ($7/mo, 1 GB) before any seeding

**Key patterns:**
- `POST /remember` and `POST /release` return 202 immediately after `add()`; `cognify()` runs in FastAPI `BackgroundTasks` (5-30s, cannot block HTTP)
- Dual-search recall: `asyncio.gather(GRAPH_COMPLETION, CHUNKS)` merged into `{ answer, evidence }`
- `DriftService` is explainable by design: 4 named rules, each surfaces a reason string shown in the UI beside the badge

### Critical Pitfalls

1. **Demo-loop integrity (HIGHEST — demo may silently fail):** Cognee Issue #1023 — `forget(dataset=...)` can leak across datasets in vector search, and `GRAPH_COMPLETION` traverses the full graph. Seed data MUST use strictly isolated entity names per dataset (no cross-dataset overlap: e.g., `auth_workaround_retry_disable` not just `auth`). Write a pre/post `recall()` assertion in the `/forget` endpoint that logs both responses — verify before != after before marking done.

2. **`cognify()` hangs silently (CRITICAL — blocks all development):** GitHub Issues #1743/#2119 — `instructor` retries failed JSON parsing for 10+ minutes with no error; macOS KqueueSelector can deadlock. Wrap all `cognify()` calls in `asyncio.wait_for(..., timeout=120)`; add `/health/cognee` smoke test (add + cognify + search on 3-line fixture, must return < 30s) as the hard Phase 1 exit gate.

3. **Render ephemeral filesystem wipes memory on redeploy:** Attach Render persistent disk before seeding any data. Set `SYSTEM_ROOT_DIRECTORY=/data/patchpilot_memory/system` and `DATA_ROOT_DIRECTORY=/data/patchpilot_memory/data`. Verify with a canary file that survives redeploy.

4. **Ambiguous seed data — before/after flip never convinces:** Write seed data as a deliberate narrative with explicit contradiction. Validate before writing any UI — rewriting seed data is the fix, not code.

5. **Scope creep kills the demo loop (5-day clock):** Hard rule: nothing beyond must-build lifecycle starts until `search → drift → forget → re-search` runs end-to-end in <120 seconds on the deployed instance.

6. **$10 OpenAI budget:** Seed corpus = 3 files max, each under 300 words. Cache cognified state as a tar snapshot for zero-cost reseeds.

## Implications for Roadmap

Based on research, the build order has a clear dependency chain with one pre-work sprint before code begins.

### Phase 0: Seed Data + Demo Narrative (Pre-code, Day 1)

**Rationale:** The demo loop only works if seed data produces unambiguously different before/after recall results. This must be done before any code is written — rewriting seed data mid-build is the most expensive recovery.
**Delivers:** 3 seed files (`tickets_auth.md`, `workaround_v18.md`, `release_v19.md`) with explicit contradiction; manually verified via CLI Python script to produce different GRAPH_COMPLETION answers before/after forget.
**Addresses:** Pitfall 2 (forget does not change results), Pitfall 3 (ambiguous seed data)
**Exit gate:** Manual `cognee.add() → cognify() → search() → forget() → search()` in a Python script produces visibly different answers.

### Phase 1: Infrastructure + Cognee Integration (Day 1)

**Rationale:** Every other phase depends on Cognee being verified working. `cognify()` hangs are invisible and can waste an entire day. Persistent disk must be attached before any seed data is loaded.
**Delivers:** FastAPI scaffold with MemoryService; `/health/cognee` smoke test passing; persistent disk on Render; `requirements.txt` pinned; `.env` configured.
**Uses:** Cognee 1.2.2 (pinned), FastAPI 0.138.2, uvicorn `--workers 1`
**Implements:** MemoryService, Cognee env config, `/remember` (202 + BackgroundTask), `/recall` (dual search)
**Addresses:** Pitfall 1 (cognify hangs), Pitfall 5 (Render ephemeral FS), Pitfall 6 (budget), Pitfall 8 (instructor conflict)
**Exit gate:** `/health/cognee` returns 200 in < 30 seconds; `search(CHUNKS)` returns >= 5 chunks after seeding; canary file survives Render redeploy.

### Phase 2: Next.js + BFF + Core Recall UI (Day 2)

**Rationale:** BFF proxy layer must exist before any UI works. Diagnosis Card is the signature UI element — building it early makes all testing ergonomic.
**Delivers:** Next.js App Router scaffold; Route Handlers proxying FastAPI; Search page with Diagnosis Card; past incident listing; basic ingest UI.
**Uses:** Next.js 16.2.9, React 19, Tailwind 4.x, @tanstack/react-query 5.x
**Implements:** Route Handlers, `DiagnosisCard.tsx`, empty-result fallback to CHUNKS
**Exit gate:** User ingests a ticket via UI and recalls it; Diagnosis Card shows root cause + evidence; empty-result state is graceful.

### Phase 3: Dataset Scoping + Surgical Forget (Day 2-3)

**Rationale:** Per-release dataset scoping is the architectural keystone. This decision must be locked and verified before drift detection is built — DriftService reads dataset names.
**Delivers:** `POST /release` creating `workarounds_v{N}` datasets; `DELETE /forget` with pre/post recall assertion; dataset list in UI; surgical forget verified (incidents untouched).
**Addresses:** Pitfall 2 (forget does not change search results); locks architectural keystone
**Exit gate:** `forget(dataset="workarounds_v1_8")` changes recall output; `"incidents"` dataset unaffected.

### Phase 4: Memory Drift Detection (Day 3)

**Rationale:** Drift is the headline differentiator. Requires dataset scoping (Phase 3). DriftService must output human-readable `reason` strings — not a score — or judges see a black box.
**Delivers:** `DriftService` with 4 named heuristic rules; `drift_detail` schema with `{ state, reason, factors }`; Drift dashboard with 🟢🟡🔴 badges + reason sentence; "Forget" button on 🔴 items.
**Implements:** `backend/services/drift.py`, `DriftBadge.tsx`, `drift/page.tsx`
**Addresses:** Pitfall 4 (drift feels magic; must be explainable)
**Exit gate:** Upload release notes → 🔴 badge appears with human-readable reason; clicking Forget removes dataset; dashboard refreshes.

### Phase 5: Demo Loop Polish + Stretch Features (Day 4-5)

**Rationale:** Full loop must be timed on Render deployment before any stretch features start. Kuzu cold start adds ~15 seconds on Render free tier. Stretch features unlock only when core loop runs < 120 seconds.
**Delivers:** End-to-end demo loop < 120s on Render; `POST /reset` (prune + reseed from snapshot); `/api/admin/reseed` fast recovery; Memory Graph view; stretch features in priority order: confidence scoring → memory health dashboard → incident timeline (cut if time-boxed).
**Implements:** `GraphViewer.tsx`, `MemoryHealthPanel.tsx`, `/reset` and `/reseed` endpoints
**Addresses:** Pitfall 7 (scope creep; stretch features gated behind core loop)
**Exit gate:** Full demo loop < 120 seconds on deployed Render instance; OpenAI usage < $5 after full seed + 3 demo runs.

### Phase Ordering Rationale

- Seed data before code because rewriting narrative mid-build is more expensive than any code change.
- Infrastructure before features because cognify hangs and ephemeral FS can each waste a full day silently.
- Dataset scoping before drift because DriftService reads dataset names — the naming convention must be immutable before heuristics are written against it.
- Drift before polish because drift is the differentiator; demo polish on a broken drift loop scores zero.
- Stretch features last and gated behind a working core loop; cut in reverse priority order: timeline → health dashboard → confidence → graph viz.

### Research Flags

Phases needing deeper research or runtime spikes during planning:

- **Phase 1 (Cognee integration):** Run the `/health/cognee` smoke test on actual installed cognee==1.2.2 before writing any application code. The `cognify()` hang is confirmed (GitHub issues) and mitigation must be verified at runtime.
- **Phase 3-5 (feedback / improve() API — UNRESOLVED):** `improve(feedback_alpha=)` (V2 API) vs `search(SearchType.FEEDBACK)` (server-mode) — conflicting findings. **Day-1 runtime spike required:** import cognee==1.2.2, inspect installed API, determine which path exists before the feedback endpoint is planned. Do not assume either works until verified.

Phases with standard, well-documented patterns (skip research-phase):

- **Phase 2 (Next.js + BFF):** App Router Route Handlers proxying to FastAPI is well-established. No research-phase needed.
- **Phase 4 (DriftService):** Pure Python heuristic class with no external dependencies. Design fully specified in ARCHITECTURE.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core versions confirmed against PyPI day-of; Cognee internal API verified against docs but fast-moving OSS — confirm against installed package |
| Features | MEDIUM | Table stakes and differentiators from domain reasoning + PROJECT.md; competitor landscape from web (LOW); feature dependency graph is solid |
| Architecture | MEDIUM | FastAPI/Next.js patterns well-established (HIGH); Cognee-specific patterns confirmed via docs but not battle-tested at runtime |
| Pitfalls | MEDIUM | cognify hang (#1743/#2119) and dataset leakage (#1023) are confirmed GitHub issues; Render ephemeral FS is documented; instructor conflict from community reports |

**Overall confidence:** MEDIUM

### Gaps to Address

- **`improve()` / feedback API is unresolved:** `improve(feedback_alpha=)` (V2 API docs) vs `search(SearchType.FEEDBACK)` (server-mode, ARCHITECTURE.md) — conflicting findings. Day-1 runtime spike required before the feedback endpoint is planned.
- **`forget()` leak severity:** Issue #1023 confirms partial leakage but severity depends on graph topology of actual seed data. Must be empirically validated with seed documents in Phase 0/1.
- **`GRAPH_COMPLETION` dataset scoping:** Research confirms GRAPH_COMPLETION traverses the full graph regardless of `datasets=` filter. Whether this affects the before/after demo flip depends on entity isolation. Must be verified in Phase 0 before any UI is built.
- **Cognee graph API for visualization:** The `GraphViewer` requires a Cognee endpoint exposing nodes/edges. The exact API call was not fully resolved — needs runtime verification in Phase 5.

## Sources

### Primary (HIGH confidence)
- [cognee PyPI 1.2.2](https://pypi.org/project/cognee/) — version, release date
- [FastAPI PyPI 0.138.2](https://pypi.org/project/fastapi/) — version, release date
- [Cognee official docs — add/cognify/search/forget/prune](https://docs.cognee.ai/python-api/) — API contracts
- [Cognee official docs — remember/recall/improve](https://docs.cognee.ai/core-concepts/main-operations/remember) — V2 API

### Secondary (MEDIUM confidence)
- [DeepWiki — Cognee Python API Reference](https://deepwiki.com/topoteretes/cognee/2.1-python-api-reference) — function locations, SearchType enum
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/) — BackgroundTasks pattern
- [Cognee Blog — Beyond Recall](https://www.cognee.ai/blog/tutorials/beyond-recall-building-persistent-memory-in-ai-agents-with-cognee) — memory lifecycle patterns
- [GitHub Issue #1023 — dataset search leakage](https://github.com/topoteretes/cognee/issues/1023) — confirmed bug
- [GitHub Issue #1743 — cognify hang macOS](https://github.com/topoteretes/cognee/issues/1743) — confirmed bug
- [GitHub Issue #2119 — cognify hang local LLM macOS](https://github.com/topoteretes/cognee/issues/2119) — confirmed bug
- [Render Persistent Disks](https://render.com/docs/disks) — persistence behavior

### Tertiary (LOW confidence)
- [incident.io blog — postmortem tool comparison 2026](https://incident.io/blog/best-postmortem-software-for-devops-teams-2026) — competitor landscape
- [DEV Community — SearchType overview](https://dev.to/chinmay_bhosale_9ceed796b/search-types-in-cognee-1jo7) — SearchType descriptions

---
*Research completed: 2026-06-30*
*Ready for roadmap: yes*
