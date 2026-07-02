# Roadmap: PatchPilot

## Overview

PatchPilot is built in 4 phases, ordered by the hardest risks first. Phase 1 retires the two highest-risk unknowns (Cognee hangs, ephemeral FS loss) and locks the architectural keystone (dataset naming) before any UI is written. Phase 2 delivers the complete ingest-to-recall experience in the browser. Phase 3 adds Drift detection and surgical Forget — the project's scoring differentiator. Phase 4 verifies the full 120-second demo loop on the deployed instance and adds depth with the memory graph and stretch features. Every phase except Phase 1 delivers a vertical, user-visible capability slice; no horizontal layers.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Cognee verified, data persists, seed data produces a CLI before/after flip — all blocking risks retired before UI work begins (completed 2026-07-01)
- [x] **Phase 2: Core Recall** - Full-stack ingest, evidence-grounded diagnosis card, feedback reinforcement, and release upload — the core product experience in the browser (completed 2026-07-02)
- [ ] **Phase 3: Drift + Forget** - Drift detection with human-readable badges, surgical forget, and visible before/after proof — the scoring differentiator
- [ ] **Phase 4: Demo Loop + Stretch** - 120-second loop verified on deployed instance, one-button demo reset, memory graph view, and stretch features gated behind a working loop

## Phase Details

### Phase 1: Foundation

**Goal**: Cognee runs without hanging, memory persists across restarts, and seed data produces verifiably different recall answers before vs after `forget()` in the CLI — both critical risks retired and the dataset architecture locked before any UI is written.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: PLAT-01, PLAT-02, INGEST-02, INGEST-03, DEMO-02
**Success Criteria** (what must be TRUE):

  1. `/health/cognee` returns 200 in under 30 seconds — add + cognify + search pipeline confirmed working on installed cognee==1.2.2 with `uvicorn --workers 1`
  2. A canary incident stored before server restart is retrievable after restart — persistent storage confirmed, ephemeral FS risk retired
  3. Running the seed CLI script produces a different `search(GRAPH_COMPLETION)` answer before vs after `forget()` on the seed workaround dataset — before/after demo flip verified in isolation, Cognee #1023 leakage mitigated by isolated entity names
  4. Dataset naming convention locked in code and seed files: durable incidents in `"incidents"`, per-release workarounds in `"workarounds_v{N}"` — verified by inspecting Cognee storage after seeding

**Plans**: 4/4 plans complete
**Wave 1**

- [x] 01-01-PLAN.md — Environment + Wave-0 Cognee spike (venv, deps, API-key checkpoint, forget-flip + persistence proven in miniature) [wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Persistence config keystone + dataset naming + /health/cognee + canary (PLAT-01, PLAT-02, INGEST-02/03) [wave 2]
- [x] 01-03-PLAN.md — 8-doc seed corpus with isolated entity names (Stripe before/after arc, DEMO-02) [wave 2]

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Seed CLI before/after forget flip + zero-cost snapshot (DEMO-02, INGEST-02/03) [wave 3]

### Phase 2: Core Recall

**Goal**: As a developer, I want to ingest incident history, search a bug, and get an evidence-grounded diagnosis I can reinforce, so that I recall how similar incidents were fixed before instead of re-debugging from scratch.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: INGEST-01, RECALL-01, RECALL-02, RECALL-03, FEEDBACK-01, FEEDBACK-02, RELEASE-01
**Success Criteria** (what must be TRUE):

  1. User uploads a ticket, chat log, or changelog file via the browser and receives acknowledgment — content enters the Cognee knowledge graph via background cognify
  2. Searching a known incident returns a diagnosis card showing a root-cause recommendation (GRAPH_COMPLETION) alongside the specific evidence tickets it was reconstructed from (CHUNKS), fused into one response
  3. Engineer clicks Accept on a recommendation — the fix is reinforced via improve() and a second search on the same query returns the accepted fix with higher priority
  4. User uploads a release note and sees it stored as a versioned workaround dataset (workarounds_v{N}), visible in the dataset list in the UI

**Plans**: 4/4 plans complete
**UI hint**: yes

**Wave 1**

- [x] 02-01-PLAN.md — Backend keystone (CACHING/AUTO_FEEDBACK flip) + CORS + Wave-0 smoke + fused GRAPH_COMPLETION+CHUNKS /search (RECALL-01/02) [wave 1]

**Wave 2** *(blocked on Wave 1)*

- [x] 02-02-PLAN.md — Next.js scaffold + fonts/shadcn/react-query + Search UI slice: diagnosis card (RECALL-01/02/03) [wave 2]

**Wave 3** *(blocked on Wave 2)*

- [x] 02-03-PLAN.md — Ingest slice: typed multi-file upload + background cognify + status rows + Load Sample + release routing (INGEST-01, RELEASE-01) [wave 3]

**Wave 4** *(blocked on Wave 3)*

- [x] 02-04-PLAN.md — Feedback reinforcement (Accept → improve → re-search proof) + dataset list (FEEDBACK-01/02, RELEASE-01) [wave 4]

### Phase 3: Drift + Forget

**Goal**: Uploading a release exposes stale workarounds with human-readable drift explanations; the engineer can forget a drifting workaround with one click; re-searching proves memory changed.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: DRIFT-01, DRIFT-02, DRIFT-03, FORGET-01, FORGET-02
**Success Criteria** (what must be TRUE):

  1. Every memory entry carries a visible health badge — 🟢 Stable, 🟡 Aging, or 🔴 Drifting — and at least one workaround shows 🔴 after a contradicting release note is uploaded
  2. Each 🔴 badge displays a human-readable reason string (not a raw score) explaining why the memory is drifting — e.g. "Release v1.9 patches the component this workaround targets"
  3. The drift view identifies which specific datasets to forget; clicking Forget on a 🔴 dataset surgically removes it via `forget(dataset="workarounds_v{N}")` — the `incidents` dataset remains intact and still returns results
  4. Re-searching the same query after forget returns the new correct fix, not the old stale workaround — the before/after flip is visible and unambiguous in the browser

**Plans**: 1/2 plans executed
**UI hint**: yes

**Wave 1**

- [x] 03-01-PLAN.md — Restore demo corpus + drift detection engine + 🟢/🟡/🔴 badges & reason (DRIFT-01/02/03) [wave 1]

**Wave 2** *(blocked on Wave 1)*

- [ ] 03-02-PLAN.md — Surgical Forget endpoint (durable-dataset guard) + two-step-confirm ForgetButton + auto-re-search proof (FORGET-01/02) [wave 2]

### Phase 4: Demo Loop + Stretch

**Goal**: The full search → release → drift → forget → re-search loop runs in under 120 seconds on the deployed instance; demo reset works in one click; memory graph and stretch features add judge-facing depth gated behind a confirmed working loop.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: DEMO-01, DEMO-03, GRAPH-01, STRETCH-01, STRETCH-02, STRETCH-03, STRETCH-04
**Success Criteria** (what must be TRUE):

  1. The complete search → release upload → drift badge appears → forget → re-search loop finishes in under 120 seconds on the deployed Render instance — timed from first search keystroke to seeing the updated answer
  2. Demo reset button invokes `prune_data()` + `prune_system()` + reseed and returns memory to a clean, demo-ready state verifiable by re-running the loop from the top
  3. Memory graph view renders incidents, fixes, and component relationships as a navigable visual graph — visually proving Cognee builds a real knowledge graph, not just a search index
  4. (Stretch — cut in reverse order if time-boxed) Recall card shows a confidence score from search payload; memory health dashboard displays drift-state counts; incident timeline shows events chronologically; graph visualization supports click-to-explore nodes

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete    | 2026-07-01 |
| 2. Core Recall | 4/4 | Complete   | 2026-07-02 |
| 3. Drift + Forget | 1/2 | In Progress|  |
| 4. Demo Loop + Stretch | 0/TBD | Not started | - |
