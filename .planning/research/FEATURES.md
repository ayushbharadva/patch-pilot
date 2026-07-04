# Feature Research

**Domain:** Incident-memory / knowledge-recall + Memory Drift detection (single-user demo app)
**Researched:** 2026-06-30
**Confidence:** MEDIUM (Cognee API confirmed via docs; incident tool landscape from web LOW; feature categorization from domain reasoning MEDIUM)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features a judge or engineer expects from any knowledge-recall tool. Missing these makes the demo feel broken before the differentiators land.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-source file ingest (tickets, chats, changelogs) | Any recall tool must accept data; structured + unstructured files | MEDIUM | Sample datasets must clearly tell the before/after story; file upload UX + dataset naming convention matters here |
| Semantic recall / search | Core function — "find what I know about this bug" | HIGH | Must fuse GRAPH_COMPLETION (root cause) + CHUNKS (evidence) — two search calls, result merging, ranking |
| Past incident listing / browse | Users need to see what's in memory; a black box is untrusted | LOW | Simple paginated list; feeds into incident timeline stretch goal |
| Evidence grounding on results | Any AI tool that can't show its sources is untrusted; this is table stakes for AI | MEDIUM | Diagnosis card must show the specific prior incidents that back the root cause |
| Accept / reject feedback on recall | Basic quality signal; engineers expect to correct bad recommendations | MEDIUM | Maps to `improve(feedback_alpha)` — the Cognee API call is simple, but the accept/reject UX + persistence needs care |
| Demo reset / reseed | Anyone evaluating a demo tool expects a clean slate option | LOW | `prune.prune_data()` + `prune.prune_system()` are two API calls; expose as a dev-mode button |

### Differentiators (Competitive Advantage)

Features that exist nowhere else in the incident-tool landscape. These are the scoring levers.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Memory Drift detection (🟢 Stable / 🟡 Aging / 🔴 Drifting) | No incident tool tracks whether old workarounds are still valid after a release ships — this is the product's reason to exist | HIGH | Heuristics: newer fix contradicts older workaround → 🔴; release changelog touches a memory's component → 🟡/🔴; memory not recalled successfully → 🟡; similar incidents resolve differently now → 🔴. Must stay visible and explainable — not a black-box score |
| Per-release dataset scoping (`workarounds_v1_9`) | Enables surgical forget without destroying durable incident knowledge | LOW | Naming convention enforced at ingest time; `dataset_name` parameter on `add()`. Low code complexity but HIGH design importance — getting this wrong breaks drift + forget |
| Surgical `forget(dataset)` | Delete only the stale workaround set, not all memory | LOW | Single `cognee.forget(dataset="workarounds_v1_9")` call; complexity is in the UX that makes the surgical nature visible |
| Re-search proof loop | Makes "memory is live" tangible — before/after in 120 seconds; the demo moment | LOW | Just a second recall call + side-by-side display; zero additional complexity if ingest + drift + forget already work |
| Diagnosis card (root cause + evidence incidents) | Grounds the AI recommendation in real tickets; removes "why should I trust this?" objection | MEDIUM | UI layout: root cause panel (GRAPH_COMPLETION result) alongside evidence list (CHUNKS results); must visually link them |
| `improve(feedback_alpha)` reinforcement | Memory improves from engineer feedback — not static storage | MEDIUM | API call is simple; UX requires storing accept/reject per recall event and triggering improve() asynchronously |
| Memory Graph view | Shows Cognee's knowledge graph is richer than flat RAG; makes the graph-native approach tangible | MEDIUM | react-force-graph or Sigma.js; data from Cognee's graph query endpoint; interactivity (click a node) is stretch |
| Fused GRAPH_COMPLETION + CHUNKS recall | Root cause via graph reasoning + grounded in real chunk evidence — neither alone is as strong | HIGH | Two async search() calls, result fusion/ranking, then mapping chunk IDs back to source incident metadata |
| Confidence scoring on recommendations | Per-recommendation reliability signal; reduces "should I trust this?" uncertainty | MEDIUM | Derive from search result relevance scores, normalize 0–100, display as a badge on the diagnosis card |
| Memory health dashboard | Aggregate drift state across the entire graph; "how healthy is my incident brain?" | MEDIUM | Counts per drift state (🟢/🟡/🔴), last-recalled timestamps, graph stats; good for a second screen in the demo |
| Incident timeline | Chronological view of incidents + releases showing how knowledge evolved | LOW | Sort by ingested_at + release upload timestamp; shows the narrative arc of the memory lifecycle |

### Anti-Features (Deliberately NOT Build)

Features that seem natural but would hurt the demo, mislead judges, or consume time with zero scoring upside.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real Slack / GitHub / Jira / Zendesk integrations | "Real integrations make the product feel production-ready" | OAuth + webhook + schema mapping = 1-2 days per integration; zero differentiation from any other incident tool; judges know these exist | Use sample datasets that clearly simulate realistic incident exports from these sources |
| Auth / multi-user / real-time sync | Feels enterprise-grade | Single-user demo app; auth adds 1+ day with zero scoring value; judges won't multi-tenant a demo | Static session-based state; no login screen |
| Auto-patching / code generation | "Complete the loop — suggest the fix too" | Entirely different product (Copilot territory); diverts from memory lifecycle which is the differentiator | Diagnosis card shows the prior fix that worked; engineer applies it — intentional |
| Full-text keyword search filters (date range, component, severity) | "Power users want filters" | Adds UI complexity that obscures Cognee's semantic/graph power; the demo should show fused recall is better than keyword search, not co-exist with it | Semantic recall replaces keyword search; no filter UI needed |
| Incident alerting / monitoring (PagerDuty-style) | "Complete incident lifecycle" | Entirely different product category; ingests alerts, not handles them | PatchPilot ingests postmortem artifacts after the incident — the memory phase, not the response phase |
| SLO / SLA tracking, MTTR dashboards | Analytics feel impressive | Unrelated to memory lifecycle; judges score on Cognee use, not BI dashboards | Memory health dashboard (drift counts) serves the same "health overview" need without scope creep |
| Bulk operations UI (bulk delete, bulk re-tag) | "Power user feature" | No bulk use case in the demo; adds navigation complexity | Prune reset covers the demo-reset use case; surgical forget covers targeted removal |
| Mobile / responsive optimization | "Modern apps should be mobile-first" | Demo is judge-facing on desktop; responsive CSS is distraction time | Desktop-optimized layout only; container-width constraints are sufficient |
| Export / CSV dump of memory | "Data portability" | Commodity feature with no demo value; hides that Cognee's graph structure is the value, not raw data | Memory graph view is the export analogue — shows what's in memory visually |
| Versioned memory snapshots | "Rollback if forget goes wrong" | Significant complexity (snapshot store + diff UI); prune reset already handles demo-recovery | Prune + reseed is the recovery path; document it clearly in the demo script |

---

## Feature Dependencies

```
Multi-source ingest (add() + cognify() / remember())
    └──required by──> Recall (search GRAPH_COMPLETION + CHUNKS)
                          └──required by──> Diagnosis card UI
                          └──required by──> Confidence scoring
                          └──required by──> Engineer feedback → improve()
                          └──required by──> Re-search proof loop (second recall call)
    └──required by──> Memory Graph view (graph populated at cognify time)
    └──required by──> Past incident listing

Per-release dataset scoping (dataset_name on add())
    └──required by──> Memory Drift detection (🟢🟡🔴)
                          └──required by──> Memory health dashboard
                          └──enables──> Incident timeline (release uploads as timeline events)
    └──required by──> Surgical forget(dataset)
                          └──required by──> Re-search proof loop (re-search after forget shows updated result)

Engineer feedback accept/reject
    └──required by──> improve(feedback_alpha) (must have a feedback event to trigger improve)

prune_data() + prune_system()
    └──required by──> Demo reset / reseed workflow
```

### Dependency Notes

- **Re-search proof requires ALL of:** ingest → per-release dataset scoping → drift detection → forget(dataset) → second recall. This is the full demo loop. If any step breaks, the 120-second demo fails entirely.
- **Drift detection requires dataset scoping:** without named per-release datasets, forget() would wipe everything and drift signals have nothing to compare across releases.
- **Memory health dashboard requires drift detection:** it aggregates drift state counts — can't aggregate what hasn't been computed.
- **Confidence scoring requires recall:** derives from `SearchResultPayload` relevance scores returned by `search()`. Pure display enhancement on the diagnosis card.
- **improve() requires a feedback event:** the feedback UX (accept/reject) must fire before improve() is called. implement feedback UX first.
- **Incident timeline requires:** ingest (for incident timestamps) + release upload (for release events). Low complexity but depends on both data types being ingested.

---

## MVP Definition

### The 120-Second Demo Critical Path (must all work or demo fails)

These six features are sequentially dependent. Build and test them as a chain, not independently.

- [ ] Multi-source ingest with per-release dataset scoping — sample incidents in `durable_incidents`, workarounds in `workarounds_v1_9`
- [ ] Recall (fused GRAPH_COMPLETION + CHUNKS) with diagnosis card — root cause + evidence tickets side by side
- [ ] Release upload that sets dataset context for drift evaluation
- [ ] Memory Drift detection — at least the 🔴 Drifting badge must show after release upload
- [ ] Surgical `forget(dataset="workarounds_v1_9")` — one button, confirms surgical deletion
- [ ] Re-search proof — same query now returns updated result; old 🔴 workaround gone

### Full v1 (must-build per PROJECT.md, beyond the demo critical path)

- [ ] Engineer feedback → `improve(feedback_alpha)` — completes the reinforcement loop
- [ ] Memory Graph view — visual proof that Cognee builds a knowledge graph, not flat RAG
- [ ] `prune.prune_data()` + `prune.prune_system()` reset — dev-mode button for demo re-runs
- [ ] Past incident listing / browse — basic inventory of what's in memory

### Stretch v1 (promoted but cut-first if time is short)

- [ ] Confidence scoring — add after recall works; low marginal effort if SearchResultPayload scores are accessible
- [ ] Memory health dashboard — add after drift detection works; aggregate drift counts across datasets
- [ ] Incident timeline — chronological sort of ingest events + releases; cosmetic but narrative-reinforcing
- [ ] Richer / interactive graph visualization — click-to-explore nodes in the memory graph; HIGH effort, defer if time-boxed

### Explicitly Out of Scope (v2+ if ever)

- [ ] Real external integrations (Slack, GitHub, Jira, Zendesk) — demo theater, not the differentiator
- [ ] Multi-user / auth / real-time sync — zero judge value
- [ ] Auto-patching / code generation — different product

---

## Feature Prioritization Matrix

| Feature | Demo Value | Build Cost | Priority |
|---------|------------|------------|----------|
| Multi-source ingest + dataset scoping | HIGH | MEDIUM | P1 — critical path |
| Recall (fused GRAPH_COMPLETION + CHUNKS) | HIGH | HIGH | P1 — critical path |
| Diagnosis card (root cause + evidence) | HIGH | MEDIUM | P1 — critical path, the signature UI |
| Memory Drift detection (🟢🟡🔴) | HIGH | HIGH | P1 — critical path, THE differentiator |
| Surgical forget(dataset) | HIGH | LOW | P1 — critical path, depends on dataset scoping |
| Re-search proof loop | HIGH | LOW | P1 — critical path, completes the demo |
| Per-release dataset upload | HIGH | LOW | P1 — enables drift + forget |
| prune reset | MEDIUM | LOW | P1 — needed to re-run demo |
| Past incident listing | MEDIUM | LOW | P1 — table stakes |
| Memory Graph view | HIGH | MEDIUM | P1 — visual proof of Cognee graph |
| Engineer feedback → improve() | MEDIUM | MEDIUM | P2 — completes lifecycle, not in 120s demo |
| Confidence scoring | MEDIUM | LOW | P2 — quick win after recall works |
| Memory health dashboard | MEDIUM | MEDIUM | P2 — good second demo screen |
| Incident timeline | LOW | LOW | P2 — cosmetic narrative aid |
| Richer interactive graph viz | MEDIUM | HIGH | P3 — cut if time-boxed |

**Priority key:**
- P1: Must have for demo to land and submission to score
- P2: Should have, adds richness to the demo story
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

*Note: No direct competitor builds the memory-drift + forget lifecycle. Comparisons are against adjacent categories.*

| Feature | Postmortem Tools (Rootly, FireHydrant) | AI Knowledge Bases (Recall.it, Notion AI) | PatchPilot Approach |
|---------|----------------------------------------|-------------------------------------------|---------------------|
| Incident ingest | Real-time Slack integration, auto-timeline | Manual paste / URL | File upload with sample datasets; integration-free |
| Knowledge recall | Template-driven search, manual lookup | Semantic search over saved content | Fused graph + chunk recall with root cause synthesis |
| Evidence grounding | Linked postmortem sections | Source citation in chat | Diagnosis card: root cause beside exact prior incident tickets |
| Memory lifecycle | Create / archive; no drift concept | Add / delete; no staleness model | Full lifecycle: ingest → drift detect → forget → re-search proof |
| Staleness detection | None — old runbooks silently rot | None | Memory Drift badges (🟢🟡🔴) per dataset × release |
| Surgical removal | Archive everything or nothing | Delete individual items | `forget(dataset)` removes entire release-scoped workaround set |
| Feedback loop | Manually update runbooks | No structural reinforcement | `improve(feedback_alpha)` reweights graph edges from accept/reject |
| Graph structure | No graph; flat postmortem list | Optional graph view (Recall.it) | Cognee knowledge graph is the foundation — graph-native, not a bolt-on |

---

## Sources

- Cognee Python API reference: [deepwiki.com/topoteretes/cognee](https://deepwiki.com/topoteretes/cognee/2.1-python-api-reference) — MEDIUM confidence
- Cognee remember() docs: [docs.cognee.ai/core-concepts/main-operations/remember](https://docs.cognee.ai/core-concepts/main-operations/remember) — MEDIUM confidence
- Cognee beyond-recall blog: [cognee.ai/blog/tutorials/beyond-recall](https://www.cognee.ai/blog/tutorials/beyond-recall-building-persistent-memory-in-ai-agents-with-cognee) — MEDIUM confidence
- Incident postmortem tool comparison: [incident.io/blog/best-postmortem-software-for-devops-teams-2026](https://incident.io/blog/best-postmortem-software-for-devops-teams-2026) — LOW confidence (web)
- Feature creep patterns: [qat.com/feature-creep-in-software-development](https://qat.com/feature-creep-in-software-development/) — LOW confidence (web)
- PatchPilot PROJECT.md — authoritative scope source

---

*Feature research for: PatchPilot — incident-memory + Memory Drift*
*Researched: 2026-06-30*
