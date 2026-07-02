# Requirements: PatchPilot

**Defined:** 2026-06-30
**Core Value:** The search → drift-detected → forget → re-search loop works visibly in under 60 seconds — PatchPilot is obviously impossible without Cognee's memory lifecycle.

## v1 Requirements

Requirements for the hackathon submission. Each maps to a roadmap phase.

### Ingest & Remember

- [ ] **INGEST-01**: User can upload incident / chat / changelog files (and load bundled sample datasets) to feed memory
- [x] **INGEST-02**: Uploaded content is ingested via Cognee `add()` + `cognify()` into the knowledge graph (remember)
- [x] **INGEST-03**: Durable incidents and per-release workarounds are stored in separate datasets (`incidents` vs `workarounds_v{N}`) so `forget()` can be surgical

### Recall & Diagnosis

- [x] **RECALL-01**: User can search a bug and get a root-cause recommendation via `search(GRAPH_COMPLETION)`
- [x] **RECALL-02**: The recommendation shows the exact prior incidents it rests on via `search(CHUNKS)`, fused into one response
- [ ] **RECALL-03**: Results render in a diagnosis card — root cause beside the evidence incidents it was reconstructed from

### Feedback & Reinforcement

- [ ] **FEEDBACK-01**: Engineer can accept or reject a recommended fix
- [ ] **FEEDBACK-02**: An accepted fix reinforces memory (Cognee improve / feedback) so future recall favors it

> ⚠ Open API question: `improve(feedback_alpha=)` vs `search(SearchType.FEEDBACK)` is unresolved across research — resolve with a Day-1 spike against `cognee==1.2.2` before planning this category.

### Memory Graph

- [ ] **GRAPH-01**: User can view memory as a graph of incidents / fixes / components

### Release Ingestion

- [ ] **RELEASE-01**: User can upload a release note, ingested into a per-release dataset (`workarounds_v{N}`)

### Memory Drift

- [ ] **DRIFT-01**: Every memory carries a health state — 🟢 Stable / 🟡 Aging / 🔴 Drifting
- [ ] **DRIFT-02**: On release upload, drift detection flags affected older memories with a visible, explainable reason string
- [ ] **DRIFT-03**: Drift recommends which workarounds to forget

### Forget & Proof

- [ ] **FORGET-01**: User can forget a flagged workaround via surgical `forget(dataset="workarounds_v{N}")`
- [ ] **FORGET-02**: Re-searching the same bug after forget returns the new correct fix (the before/after proof)

### Demo & Reset

- [ ] **DEMO-01**: User can reset / reseed memory (`prune_data()` + `prune_system()`) to a clean demo state
- [x] **DEMO-02**: Bundled seed datasets tell a clear before/after story — isolated entity names so forget visibly flips recall (mitigates Cognee #1023 cross-dataset leak)
- [ ] **DEMO-03**: The full search → drift → forget → re-search loop completes in under 60 seconds

### Platform

- [x] **PLAT-01**: A `/health/cognee` smoke test confirms add + cognify + search works in < 30s on a small fixture (Phase 1 exit gate)
- [x] **PLAT-02**: Memory persists across server restart / redeploy (persistent storage, not ephemeral filesystem)

### Stretch (v1 if time — cut first if schedule slips)

- [ ] **STRETCH-01**: Recall recommendations display a confidence score (derived from `search()` payload scores)
- [ ] **STRETCH-02**: Memory health dashboard shows counts / overview of memory states across the graph
- [ ] **STRETCH-03**: Incident timeline shows incidents / releases chronologically
- [ ] **STRETCH-04**: Richer interactive graph visualization beyond the basic memory graph

## v2 Requirements

Deferred beyond the hackathon.

### Integrations

- **INTG-01**: Real Slack / GitHub / Jira / Zendesk ingestion connectors
- **INTG-02**: Real-time sync of incident sources

### Accounts

- **ACCT-01**: Authentication and multi-user support
- **ACCT-02**: Per-team memory isolation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real Slack/GitHub/Jira/Zendesk integrations | Demo theater, not the differentiator — use sample datasets |
| Auth / multi-user / real-time sync | Single-user demo app; no value to judges |
| Cognee Cloud deployment | Targeting self-hosted OSS track (Best Use of Open Source) |
| Open-source Cognee PRs | Separate parallel prize track, not the app build |
| Keyword search filters | Hides Cognee's semantic power (research anti-feature) |
| Auto-patching / auto-fix application | Different product category (Copilot territory) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INGEST-01 | Phase 2 | Pending |
| INGEST-02 | Phase 1 | Complete |
| INGEST-03 | Phase 1 | Complete |
| RECALL-01 | Phase 2 | Complete |
| RECALL-02 | Phase 2 | Complete |
| RECALL-03 | Phase 2 | Pending |
| FEEDBACK-01 | Phase 2 | Pending |
| FEEDBACK-02 | Phase 2 | Pending |
| GRAPH-01 | Phase 4 | Pending |
| RELEASE-01 | Phase 2 | Pending |
| DRIFT-01 | Phase 3 | Pending |
| DRIFT-02 | Phase 3 | Pending |
| DRIFT-03 | Phase 3 | Pending |
| FORGET-01 | Phase 3 | Pending |
| FORGET-02 | Phase 3 | Pending |
| DEMO-01 | Phase 4 | Pending |
| DEMO-02 | Phase 1 | Complete |
| DEMO-03 | Phase 4 | Pending |
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |
| STRETCH-01 | Phase 4 | Pending |
| STRETCH-02 | Phase 4 | Pending |
| STRETCH-03 | Phase 4 | Pending |
| STRETCH-04 | Phase 4 | Pending |

**Coverage:**

- v1 requirements: 24 total (20 core + 4 stretch)
- Mapped to phases: 24 ✓
- Unmapped: 0

---
*Requirements defined: 2026-06-30*
*Last updated: 2026-06-30 — traceability filled by roadmapper*
