# Phase 4: Demo Loop + Stretch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 4-Demo Loop + Stretch
**Areas discussed:** 120s loop target, Demo scripting/proof, Demo reset mechanism, Reset trigger UI, Memory graph data source, Graph renderer, Graph UI placement, Seed corpus richness, Reset button safety, Stretch scope, Stretch cut order

---

## 120s Loop Target (DEMO-03 / SC1)

| Option | Description | Selected |
|--------|-------------|----------|
| Record local demo video | Run loop on localhost, record <120s video; deploy out of scope/best-effort | ✓ |
| Deploy to Render + demo live | Deploy with persistent disk, time loop there; matches SC1 literally, cold-start/latency risk | |
| Both: deploy AND record | Deploy for "it's live" proof + local video safety net; most work | |

**User's choice:** Record local demo video
**Notes:** Softens ROADMAP SC1's "deployed Render instance" — local recording avoids cold-start + Mistral latency vs the 120s budget. Render deployment deferred/best-effort.

---

## Demo Scripting / Visible Proof

| Option | Description | Selected |
|--------|-------------|----------|
| Keep double-charged, row-vanish proof | Reuse Stripe arc; forget proof = dataset row disappears + badge flip; accept no evidence-chunk diff | |
| Fix CHUNKS/interleave for richer proof | Repair vector-collection drop + interleave evidence for a chunk swap; adds backend risk | |
| You decide during research | Planner/researcher picks the most reliable proof after verifying CHUNKS survives forget | ✓ |

**User's choice:** You decide during research
**Notes:** Gated on verifying whether the live loop's re-search survives `forget()` (B-01). Default expected proof is the double-charged row-vanish path.

---

## Demo Reset Mechanism (DEMO-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh-snapshot restore | Capture new clean snapshot (post-flip, post-enrichment), reset = untar; instant, zero-cost, rebuilds dropped collection | ✓ |
| prune + reseed (literal DEMO-01) | prune_data+prune_system+re-seed; verbatim spec but ~60s+ and bills cognify per reset | |
| Hybrid: prune_system + snapshot restore | Wipe DB stores then restore from snapshot; belt-and-suspenders, more moving parts | |

**User's choice:** Fresh-snapshot restore
**Notes:** Hits DEMO-01's intent (clean demo-ready state) not its literal wording. Snapshot must be re-captured after corpus enrichment and contain workarounds_v1_8.

---

## Reset Trigger UI

| Option | Description | Selected |
|--------|-------------|----------|
| One-click UI button | Reset button in-app calls backend reset endpoint; on-camera friendly | ✓ (+ animations) |
| CLI script only | Reset off-camera via terminal; no new UI | |
| Both button + CLI | UI button + CLI dev fallback | |

**User's choice:** UI button + rich UI animations
**Notes:** User added an explicit ask for a visible reset animation (progress/loading feedback), not a bare spinner.

---

## Memory Graph Data Source (GRAPH-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Real Cognee/Kuzu graph | Extract actual nodes+edges from Cognee's KG; honestly proves SC3; extraction API is a research item | ✓ |
| Curated from dataset metadata | Build nodes/edges from known dataset structure; renders cleanly but not the real graph | |
| Real graph, curated fallback | Try real, fall back to curated if 1.2.2 API unreliable | |

**User's choice:** Real Cognee/Kuzu graph
**Notes:** Exact cognee 1.2.2 graph-export API + return shape is a research item (B-02).

---

## Graph Renderer

| Option | Description | Selected |
|--------|-------------|----------|
| react-force-graph 2D | CLAUDE.md-recommended lib, canvas, clear on demo screen | |
| react-force-graph 3D | Same lib, 3D layout; flashier but harder to read specific nodes on camera | ✓ |
| You decide | Planner/UI picks within the react-force-graph family | |

**User's choice:** react-force-graph 3D
**Notes:** Lib not yet installed. Planner must keep node labels/edges readable and wire click-to-explore (folds STRETCH-04).

---

## Graph View UI Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Tab/toggle on main page | Switch search ↔ graph on one page; smooth single-page demo | ✓ |
| Dedicated /graph route | Separate page; clean but navigating away costs demo seconds | |
| Modal/overlay | Graph opens over current view; focused but cramped for 3D | |

**User's choice:** Tab/toggle on main page

---

## Seed Corpus Richness

| Option | Description | Selected |
|--------|-------------|----------|
| Modest enrichment | Add a few incidents/fixes/entities (isolated names) for graph density; small one-time cognify cost | ✓ |
| Keep minimal 8-doc | Honest, low-cost, coherent; graph small but real | |
| You decide during research | Researcher assesses sparsity, then decides | |

**User's choice:** Modest enrichment
**Notes:** Must preserve the Stripe arc + DEMO-02 flip and isolated entity names (#1023). Reset snapshot captured AFTER enrichment (B-03).

---

## Reset Button Safety

| Option | Description | Selected |
|--------|-------------|----------|
| Two-step inline confirm | Reuse Phase-3 ForgetButton pattern | |
| Modal confirm | Confirm/cancel dialog | ✓ |
| Fire immediately | No guard; single-user demo | |

**User's choice:** Modal confirm
**Notes:** Diverges from Phase-3's inline pattern; check for an existing dialog primitive in components/ui/.

---

## Stretch Scope (STRETCH-01..04)

| Option | Description | Selected |
|--------|-------------|----------|
| STRETCH-01 Confidence score | From search() payload scores; cheapest win | ✓ |
| STRETCH-02 Health dashboard | Aggregate Phase-3 drift-state counts | ✓ |
| STRETCH-03 Incident timeline | New timeline component + ordering; medium effort | ✓ |
| STRETCH-04 Interactive graph | Click-to-explore; partly free with 3D graph | ✓ |

**User's choice:** All four selected

---

## Stretch Cut Rule

| Option | Description | Selected |
|--------|-------------|----------|
| Reverse-cut, loop-gated (roadmap) | Build 01→02→03→04; cut 04 first if short; nothing starts until loop+reset+graph verified | ✓ |
| Custom priority order | User-specified different order | |

**User's choice:** Reverse-cut, loop-gated (roadmap)

---

## Claude's Discretion

- Exact demo query + visible proof (pending B-01 verification).
- Confidence-score display format, health-dashboard layout, incident-timeline layout.
- Reset endpoint implementation details.
- Corpus enrichment sizing (number of docs) within #1023 + arc-preservation constraints.

## Deferred Ideas

- Render deployment (SC1 literal) — deferred/best-effort; local recorded video is authoritative.
- FEEDBACK-02 visible reorder (Phase-2 deferred) — still out of scope.
- Fuller component-metadata model — still deferred.
