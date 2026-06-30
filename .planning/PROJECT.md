# PatchPilot

## What This Is

PatchPilot is a living incident-memory system for small SaaS and engineering teams. It ingests tickets, chats, changelogs, and past fixes into Cognee, recalls prior incidents with root-cause recommendations backed by evidence, reinforces fixes engineers confirm, and — when a release ships — detects which old workarounds have gone stale (Memory Drift) and forgets them. The result is a self-maintaining incident brain that never recommends a fix the latest version already replaced.

*Tagline: every bug remembers its history.*

## Core Value

The search → drift-detected → forget → re-search loop must work: searching a bug returns the old workaround, uploading a release marks it 🔴, forgetting it, then re-searching returns the new correct fix — visibly, in under 60 seconds. PatchPilot must be obviously impossible without Cognee's memory lifecycle.

## Business Context

<!-- Hackathon submission, not monetized. Kept for prize-track targeting. -->

- **Customer**: Small SaaS / engineering teams drowning in scattered incident knowledge (GitHub, Slack, tickets, people's heads).
- **Revenue model**: N/A — hackathon entry (The Hangover Part AI: Where's My Context? · WeMakeDevs × Cognee, Jun 29 – Jul 5, 2026).
- **Success metric**: Judge score, weighted hardest on "Best Use of Cognee" (strongest axis) and the 60-second before/after demo landing.
- **Strategy notes**: Target "Best Use of Open Source" (MacBook) via self-hosted Cognee. Open Source PR track ($100/merged PR, max 5/person) is separate parallel work — out of scope for this build.

## Requirements

### Validated

(None yet — ship to validate)

### Active

<!-- v1 scope. All hypotheses until shipped and demoed. -->

**Lifecycle (must-build)**
- [ ] Multi-source ingest (tickets, chats, changelogs, release notes via file upload + sample datasets)
- [ ] `remember()` ingestion — `add()` + `cognify()` build the knowledge graph
- [ ] `recall()` with root cause + evidence — fused `search(GRAPH_COMPLETION)` + `search(CHUNKS)`
- [ ] Engineer feedback → `improve(feedback_alpha=…)` reinforces accepted fixes
- [ ] Memory Graph view
- [ ] Release upload (per-release dataset, e.g. `workarounds_v1_9`)
- [ ] Memory Drift detection (🟢 Stable / 🟡 Aging / 🔴 Drifting) via visible heuristics
- [ ] `forget(dataset=…)` surgical removal of obsolete workarounds
- [ ] Re-search proves memory updated (the demo loop)
- [ ] `prune.prune_data()` + `prune.prune_system()` reset/reseed for demo

**Nice-to-haves promoted to v1 (stretch — cut first if time-boxed)**
- [ ] Confidence scoring on recall recommendations
- [ ] Memory health dashboard (state overview across graph)
- [ ] Incident timeline (chronological incidents/releases)
- [ ] Richer / interactive graph visualization

### Out of Scope

- Real Slack/GitHub/Jira/Zendesk integrations — use sample datasets; integrations are demo theater, not the differentiator.
- Auth / multi-user / real-time sync — single-user demo app; no value to judges.
- Cognee Cloud deployment — targeting self-hosted OSS track instead.
- Open-source Cognee PRs — separate parallel prize track, not part of the app build.
- Search filters, deep UI polish beyond the demo path — only if everything else lands.

## Context

- **Starting point:** From scratch. Despite the spec calling the lifecycle "already scaffolded and running," this directory is empty — Phase 1 must scaffold the full stack.
- **Architecture (from spec Level 3):** `Next.js (App Router) ──HTTP──> FastAPI ──> Cognee (self-hosted: graph + vector + sqlite, .patchpilot_memory/)`.
- **Signature UI element:** the **diagnosis card** — root cause shown beside the exact prior incidents it was reconstructed from. Plus drift badges (🟢🟡🔴).
- **Cognee depth is the scoring lever:** use both V2 high-level verbs (remember/recall/improve/forget) AND the V1 pipeline (add/cognify/search). Surgical per-dataset `forget()`. This is the strongest judged axis.
- **Why recall fuses two strategies:** `GRAPH_COMPLETION` reasons across incident connections to produce the recommendation; `CHUNKS` returns the specific tickets it rests on — answer grounded in evidence, not hallucination.
- **Memory Drift heuristics (must stay visible/explainable):** newer fix contradicts older workaround → 🔴; release touches a memory's component → 🟡/🔴; memory not recalled successfully in a while → 🟡; similar incidents now resolve differently → 🔴.
- **Demo data is make-or-break:** sample tickets, release notes, and incidents must clearly tell the before/after story or Drift won't feel convincing.

## Constraints

- **Tech stack**: Next.js (App Router) frontend; FastAPI backend; Cognee self-hosted for memory — fixed by spec. Typefaces: Space Grotesk / Inter / IBM Plex Mono.
- **LLM**: OpenAI `gpt-4o-mini` for Cognee graph extraction (`cognify`). Only `cognify` incurs meaningful cost; recall/embeddings negligible.
- **Budget**: Hard $10 spending cap in the OpenAI dashboard; keep seed corpus small.
- **Timeline**: 5 effective build days (Jun 29 – Jul 3) + final submission Jul 4–5. Today is Jun 30 (Day 2).
- **Deploy persistence**: Cognee writes memory to disk; ephemeral filesystems (e.g. Render free tier) reset on redeploy — attach a persistent disk.
- **Disclosure**: AI-assistant usage must be declared in submission (house rule).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build from scratch in this repo | Directory empty; no scaffold to import | — Pending |
| Self-hosted Cognee + OpenAI gpt-4o-mini | Targets Best Use of Open Source (MacBook); matches Level 3 architecture | — Pending |
| Full must-build lifecycle + Drift in v1 | Drift + before/after loop is the differentiator and core value | — Pending |
| All 4 nice-to-haves promoted to v1 (stretch) | User wants richer demo; marked cut-first if time short | ⚠️ Revisit |
| Per-release dataset scoping for workarounds | Enables surgical `forget(dataset=…)` without touching durable incidents | — Pending |
| Fused GRAPH_COMPLETION + CHUNKS recall | Grounds recommendation in real evidence tickets | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-30 after initialization*
