# Phase 4: Demo Loop + Stretch - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 makes the full **search → release upload → drift badge → forget → re-search** loop run in **under 120 seconds**, adds a **one-click demo reset**, renders the **memory graph**, and adds **stretch depth** — all gated behind a confirmed working loop. It is the last phase of the v1.9 milestone; its job is to make the already-built lifecycle *demoable, repeatable, and visually convincing to judges*, not to add new lifecycle capability.

Discussion covered 7 areas: (1) where the 120s loop must run + demo scripting, (2) demo-reset mechanism, (3) memory-graph data source, (4) graph renderer, (5) stretch feature scope + cut order, (6) seed-corpus richness for the graph, (7) graph-view UI placement + reset-button safety. All were discussed and decided below.

**In scope:** the timed loop (recorded), demo reset (button + snapshot restore), real Cognee memory graph (3D), the four stretch features (gated), and a modest seed-corpus enrichment to give the graph density.
**Out of scope:** Render deployment as a hard requirement (deferred/best-effort — see Deferred), new lifecycle verbs, FEEDBACK-02 reorder, a full component-metadata model.

</domain>

<decisions>
## Implementation Decisions

### Demo Loop Target & Scripting (DEMO-03 / ROADMAP SC1)
- **D-01:** The 120s loop runs on **localhost** and is captured as a **recorded <120s demo video** — that video is the authoritative submission artifact. This **softens ROADMAP SC1's "on the deployed Render instance" wording**: local recording sidesteps Render free-tier cold starts + Mistral ~7s latency risk against the 120s budget. Render deployment is **deferred / best-effort**, NOT a Phase-4 blocker (see Deferred). If deploy is attempted anyway, it needs a persistent disk (PROJECT.md constraint).
- **D-02 (research-gated):** The exact **demo query + visible forget-proof is left to researcher/planner** — but they **MUST first verify whether the live loop's re-search survives `forget()`** (see Builder Concern B-01, the forget-drops-vector-collection risk) before locking the script. Default/expected proof: reuse the existing **Stripe "double-charged" arc** where the visible forget proof is the `workarounds_v1_8` **dataset row vanishing** + the **drift-badge flip**, NOT an evidence-chunk diff (evidence is not interleaved — PROJECT.md Phase-3 note). Only attempt CHUNKS repair / evidence interleaving if it does not destabilize the load-bearing loop.

### Demo Reset (DEMO-01)
- **D-03:** Reset = **fresh-snapshot restore**, NOT DEMO-01's literal `prune_data()`+`prune_system()`+reseed. Capture a **new tar snapshot of clean pre-demo state** (post-Phase-1 flip, `workarounds_v1_8` present, **and post-corpus-enrichment per D-09**), then reset = untar restore (reuse `scripts/snapshot_memory.py`). Rationale: reseed re-bills cognify (~8+ docs × ~7s on Mistral ≈ 60s+ per reset) while snapshot restore is instant, zero-cost, infinitely repeatable, **and rebuilds the `DocumentChunk_text` vector collection that `forget()` drops** (B-01). Hits DEMO-01's *intent* (clean, demo-ready state verifiable by re-running the loop) not its literal wording.
- **D-04:** Reset trigger = **one-click UI button with a visible reset animation** (progress/loading feedback during restore) — reset is part of the on-camera demo, not an off-screen CLI step. Needs a backend reset endpoint that performs the snapshot restore.
- **D-05:** Reset is guarded by a **modal confirm** (confirm/cancel dialog) before the destructive restore — prevents an accidental on-camera wipe. Note: this **diverges from Phase-3's inline two-step ForgetButton pattern** (user chose a modal); confirm whether a modal/dialog component already exists in `frontend/components/ui/` or needs adding.

### Memory Graph (GRAPH-01)
- **D-06:** Graph data = **real Cognee/Kuzu knowledge-graph extraction** (actual nodes + edges produced by `cognify`), NOT a curated-from-dataset-metadata graph. This honestly proves SC3's "Cognee builds a real knowledge graph, not just a search index" — the heavily-weighted "Best Use of Cognee" axis. The exact **cognee 1.2.2 graph-export / `get_graph_data` API (call + return shape) is a RESEARCH item** — verify before planning the endpoint (B-02).
- **D-07:** Rendered with **react-force-graph 3D (`ForceGraph3D`)**. Not yet installed — add to frontend deps. Planner/UI must keep node **labels + edges readable on a demo screen** (3D can obscure specific nodes) and wire **click-to-explore** (this folds STRETCH-04 in).
- **D-08:** Graph view lives as a **tab/toggle on the main page** (switch search view ↔ graph view), no navigation away — smooth single-page on-camera flow that doesn't cost seconds against the 120s clock.

### Seed Corpus Enrichment
- **D-09:** The seed corpus gets **modest enrichment** — add a few extra incidents/fixes/entities so the 3D graph has visible density and relationships (the graph is a scoring showpiece). Hard constraints: **keep isolated entity names** (Cognee #1023 safety), **preserve the canonical Stripe double-charged arc + the DEMO-02 before/after flip intact**, one-time cognify cost. The reset snapshot (D-03) **MUST be captured AFTER this enrichment** (B-03).

### Stretch Features (STRETCH-01..04)
- **D-10:** **All four stretch features are wanted**, gated: nothing stretch starts until the core loop + reset + graph are **verified working**. Build order **01 → 02 → 03 → 04**; **cut in reverse (04 first)** if time runs short (ROADMAP rule).
  - **STRETCH-01 (confidence score):** derive from the existing `search()` payload scores — cheapest win, small UI add on the diagnosis card.
  - **STRETCH-02 (health dashboard):** aggregate the Phase-3 drift-state counts (🟢/🟡/🔴) — data already computed by `compute_drift_states`, mostly UI aggregation.
  - **STRETCH-04 (interactive graph / click-to-explore):** folds into the react-force-graph 3D build (D-07) — likely comes largely "free" with the graph, so despite the reverse-cut order it may land alongside GRAPH-01.
  - **STRETCH-03 (incident timeline):** needs a new timeline component (none exists) + chronological ordering — highest incremental effort, first to cut.

### Claude's Discretion
- Exact demo query + visible proof (D-02) — pending B-01 verification.
- Confidence score display format (raw score vs normalized %), health-dashboard layout/placement, incident-timeline layout — planner/UI discretion.
- Reset endpoint implementation details (route name, snapshot path handling).
- How many docs to add in corpus enrichment (D-09) — within the #1023 + arc-preservation constraints; research may size it against how sparse the real extracted graph looks.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` § "Phase 4: Demo Loop + Stretch" — goal, 4 success criteria (note D-01 softens SC1's "deployed Render" wording), requirement list (DEMO-01, DEMO-03, GRAPH-01, STRETCH-01..04)
- `.planning/REQUIREMENTS.md` — full text of DEMO-01, DEMO-03, GRAPH-01, STRETCH-01..04
- `.planning/PROJECT.md` § "Context" (Phase-3 notes: evidence-panel **not interleaved**, the CSS `*/`-in-comment landmine), § "Key Decisions", § "Core Value"
- `.planning/STATE.md` § "Blockers/Concerns" — snapshot-predates-flip, reseed-bills-cognify, evidence-non-interleave (all directly shape D-01/D-02/D-03)

### Prior phase decisions (locked, carry forward)
- `.planning/phases/03-drift-forget/03-CONTEXT.md` — D-01 (drifting datasets excluded from primary at release time), D-03/D-04 (LLM reason string), forget durable-dataset + drift-state guard; the drift-state source STRETCH-02 aggregates
- `.planning/phases/02-core-recall/02-CONTEXT.md` — dataset list + diagnosis card (D-09 version tag slot), Accept→auto-re-search pattern, `asyncio.create_task` background rule
- `.planning/phases/01-foundation/01-CONTEXT.md` — Stripe double-charge arc, `incidents`/`workarounds_v{N}` naming, isolated entity names for #1023, `scripts/snapshot_memory.py` tar save/restore

### Stack, Cognee API, and locked conventions
- `.claude/CLAUDE.md` — Cognee API signatures (`prune_data`/`prune_system`, `forget(dataset=)`, `search()`, graph viz recommendation **react-force-graph**), "What NOT to Use" (no `prune_system()` for per-dataset forget)
- **Memory note `cognee-forget-drops-vector-collection`** — `forget()` drops the shared `DocumentChunk_text` collection → CHUNKS breaks across ALL datasets; the concrete #1023 manifestation. CRITICAL for D-02/D-03/B-01.

### Code the phase touches
- `scripts/snapshot_memory.py` — tar save/restore; the reset mechanism's core (D-03)
- `backend/main.py` — `include_router` registration (reset + graph endpoints go here)
- `backend/forget.py`, `backend/search.py`, `backend/drift.py`, `backend/datasets_router.py`, `backend/ingest.py` (asyncio.create_task bg pattern)
- `seed/seed_cli.py` — `--seed` reseed path used to build the post-enrichment snapshot
- `frontend/app/page.tsx`, `frontend/components/DatasetList.tsx`, `frontend/components/DiagnosisCard.tsx`, `frontend/components/ui/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/snapshot_memory.py` — pure-filesystem tar save/restore, **no cognee import**; verified restore-then-search round trip in Phase 1. This IS the D-03 reset engine — the backend reset endpoint should call the same restore logic.
- `backend/main.py` — `app.include_router(...)` pattern (5 routers registered); the new reset + graph-data endpoints register the same way.
- `backend/ingest.py` — `asyncio.create_task()` background-scheduling pattern (NOT FastAPI `BackgroundTasks`, which hangs `cognify()`); reuse if any Phase-4 work runs outside the request cycle.
- `backend/drift.py::compute_drift_states` — drift-state (🟢/🟡/🔴) source for the STRETCH-02 health dashboard; already computed, just aggregate counts.
- `backend/search.py` — `search()` payload scores feed STRETCH-01 confidence; `_pick_primary_result`/`_active_search_datasets` govern what the loop returns post-forget.
- `frontend/app/page.tsx` — main page; the graph tab/toggle (D-08), reset button+modal+animation (D-04/D-05) land here.
- `frontend/components/DatasetList.tsx` — drift badges/rows; health-dashboard reuses the same drift data.

### Established Patterns
- User-facing errors = short human messages, never raw exception text (D-24, Phase 2) — applies to reset failures and graph-extraction failures.
- Package-qualified import order (`backend.cognee_config` → `cognee` → `backend.cognee_patches`) required for any new module touching Cognee.
- Destructive-confirm UX: Phase 3 used an **inline two-step** ForgetButton; Phase 4 reset uses a **modal** (D-05) — verify a dialog/modal primitive exists in `frontend/components/ui/` or add one.

### Integration Points
- New backend: **reset endpoint** (snapshot restore, D-03/D-04), **graph-data endpoint** (real Cognee graph export, D-06/B-02).
- New frontend: **graph view** (react-force-graph 3D, main-page tab), **reset button + modal + animation**, **confidence score** on DiagnosisCard, **health dashboard**, **incident timeline**.
- New dependency: **react-force-graph** (D-07).

</code_context>

<specifics>
## Specific Ideas

- The **Stripe double-charged arc** (`workarounds_v1_8` nightly-dedup script → superseded by `workarounds_v1_9` idempotency-key fix) is the demo backbone. Corpus enrichment (D-09) must not break it.
- The reset animation should feel **intentional/polished** — user emphasized "rich UI animations," not a bare spinner.
- The **3D memory graph is a scoring showpiece** for the "Best Use of Cognee" axis — density (D-09) and readable click-to-explore (D-07) matter more here than elsewhere.

</specifics>

<deferred>
## Deferred Ideas

- **Render deployment (ROADMAP SC1 literal):** deferred / best-effort. The authoritative loop artifact for submission is the **local recorded <120s video** (D-01). If pursued post-loop, needs a persistent disk (PROJECT.md constraint) and re-timing against the 120s budget.
- **FEEDBACK-02 visible reorder** (Phase-2 deferred item): still out of scope — not a Phase-4 concern.
- **Fuller component-metadata model** on datasets (Phase-3 deferred): still deferred; the real graph's LLM-extracted component entities (D-06) suffice for GRAPH-01.

### Builder Concerns (researcher/planner to resolve — not user decisions)
- **B-01 (CRITICAL — `forget()` drops the shared vector collection):** `cognee.forget(dataset=...)` drops `DocumentChunk_text`, so afterward `SearchType.CHUNKS` raises `CollectionNotFoundError` across **ALL** datasets → fused `/search` returns `{"status":"error"}`. `/health/cognee` hides it (isolated add→cognify→search round-trip). This **directly threatens the re-search step of the core loop**, which runs BEFORE any reset. Phase-3 UAT passed 3/3 search→forget→re-search — planner MUST determine WHY (does the Phase-3 forget/re-search path avoid CHUNKS, only return GRAPH_COMPLETION, or was it not exercised the same way?) and confirm the timed loop's re-search survives forget, OR rebuild/repair the collection inline. D-03's snapshot restore fixes it for *reset* but not for the mid-demo re-search. Ref: memory `cognee-forget-drops-vector-collection` + CLAUDE.md #1023.
- **B-02 (cognee 1.2.2 graph-export API unverified):** D-06 depends on a graph-data/export call whose exact signature + return shape in cognee 1.2.2 is unconfirmed. Research must nail it before planning the endpoint; prepare a readable fallback layout if the raw graph is too dense/ugly for 3D.
- **B-03 (reset snapshot must post-date enrichment + contain v1_8):** the committed `patchpilot_memory.snapshot.tar` predates the Phase-1 flip (STATE.md) and cannot restore `workarounds_v1_8`. D-03's reset snapshot must be **re-captured after D-09 enrichment** and must contain `workarounds_v1_8`.
- **B-04 (CSS landmine):** a literal `*/` inside a CSS block comment closes the comment early and crashes the entire Next.js frontend with a PostCSS error (PROJECT.md Phase-3 note). New `globals.css` / graph styling must avoid it; only a live browser load catches it — not `tsc` or grep.

</deferred>

---

*Phase: 4-Demo Loop + Stretch*
*Context gathered: 2026-07-03*
