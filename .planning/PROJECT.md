# PatchPilot

## What This Is

PatchPilot is a living incident-memory system for small SaaS and engineering teams. It ingests tickets, chats, changelogs, and past fixes into Cognee, recalls prior incidents with root-cause recommendations backed by evidence, reinforces fixes engineers confirm, and — when a release ships — detects which old workarounds have gone stale (Memory Drift) and forgets them. The result is a self-maintaining incident brain that never recommends a fix the latest version already replaced.

*Tagline: every bug remembers its history.*

## Core Value

The search → drift-detected → forget → re-search loop must work: searching a bug returns the old workaround, uploading a release marks it 🔴, forgetting it, then re-searching returns the new correct fix — visibly, in under 120 seconds. PatchPilot must be obviously impossible without Cognee's memory lifecycle.

## Business Context

<!-- Hackathon submission, not monetized. Kept for prize-track targeting. -->

- **Customer**: Small SaaS / engineering teams drowning in scattered incident knowledge (GitHub, Slack, tickets, people's heads).
- **Revenue model**: N/A — hackathon entry (The Hangover Part AI: Where's My Context? · WeMakeDevs × Cognee, Jun 29 – Jul 5, 2026).
- **Success metric**: Judge score, weighted hardest on "Best Use of Cognee" (strongest axis) and the 120-second before/after demo landing.
- **Strategy notes**: Target "Best Use of Open Source" (MacBook) via self-hosted Cognee. Open Source PR track ($100/merged PR, max 5/person) is separate parallel work — out of scope for this build.

## Requirements

### Validated

Validated in Phase 1 (foundation) — confirmed via live re-execution, not just plan claims:

- **INGEST-02** — `remember()` ingestion (`add()`+`cognify()`) works end-to-end on installed cognee==1.2.2
- **INGEST-03** — Dataset architecture locked: `incidents` vs `workarounds_v{N}` in `backend/datasets.py`, confirmed via `cognee.datasets.list_datasets()`
- **DEMO-02** — Seed corpus produces a real before/after recall flip (`seed_cli.py --flip`: `FLIP OK` + `INCIDENTS SURVIVED`), isolated entity names mitigate Cognee #1023 leakage
- **PLAT-01** — `/health/cognee` returns 200 in <30s (measured: 9s) on `uvicorn --workers 1`
- **PLAT-02** — Memory persists across restart (two-process `persistence_check.py --store`/`--verify` canary)

Validated in Phase 2 (core-recall):

- **INGEST-01** — File upload + Load Sample both feed memory via background `cognify()`
- **RECALL-01/02/03** — Fused `GRAPH_COMPLETION` + `CHUNKS` diagnosis card, evidence-grounded
- **RELEASE-01** — Release notes ingested into per-release `workarounds_v{N}` datasets, visible in the dataset list
- **FEEDBACK-01** (partial) — Accept/Dismiss controls + `improve()` reinforcement wired and working; **FEEDBACK-02's visible reorder is NOT demonstrable** with the current seed corpus (`_pick_primary_result`'s version tie-break always wins independent of `feedback_influence`) — REQUIREMENTS.md correctly keeps both `[ ]` pending until this is addressed

Validated in Phase 3 (drift-forget) — confirmed via live UAT (search → drift → forget → re-search) in the browser, not just automated tests:

- **DRIFT-01/02/03** — `compute_drift_states()` shared classifier flags the superseded workaround 🔴 with a live Mistral-generated reason; drift exclusion means `/search` already returns the correct fix even before forgetting (the flip happens at release-detection time, not forget time — see Key Decisions)
- **FORGET-01/02** — `POST /forget` surgically removes only a live, drifting `workarounds_v{N}` (durable-dataset guard + drift-state guard, added during code review); UI shows two-step confirm, row removal, toast, and auto-re-search

### Active

<!-- v1 scope. All hypotheses until shipped and demoed. -->

**Lifecycle (must-build)**
- [x] Multi-source ingest (tickets, chats, changelogs, release notes via file upload + sample datasets) — Phase 2 (INGEST-01)
- [x] `remember()` ingestion — `add()` + `cognify()` build the knowledge graph — validated Phase 1 (INGEST-02)
- [x] `recall()` with root cause + evidence — fused `search(GRAPH_COMPLETION)` + `search(CHUNKS)` — Phase 2 (RECALL-01/02/03)
- [x] Engineer feedback → `improve(feedback_alpha=…)` reinforces accepted fixes — Phase 2 (FEEDBACK-01), but the reinforcement's visible effect on ranking (FEEDBACK-02) is not demonstrable with the current seed corpus — see Key Decisions
- [ ] Memory Graph view — Phase 4 (GRAPH-01)
- [x] Release upload (per-release dataset, e.g. `workarounds_v1_9`) — Phase 2 (RELEASE-01)
- [x] Memory Drift detection (🟢 Stable / 🟡 Aging / 🔴 Drifting) via visible heuristics — Phase 3 (DRIFT-01/02/03)
- [x] `forget(dataset=…)` surgical removal of obsolete workarounds — Phase 1 CLI-level, now also a guarded `POST /forget` + UI trigger — Phase 3 (FORGET-01)
- [x] Re-search proves memory updated (the demo loop) — Phase 1 CLI-level (DEMO-02), now also live-UAT-verified end-to-end in the browser — Phase 3 (FORGET-02)
- [x] `prune.prune_data()` + `prune.prune_system()` reset/reseed for demo — implemented instead as tar snapshot save/restore (`scripts/snapshot_memory.py`) for zero-cost reseeds, a cheaper equivalent to prune+recognify

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

- **Starting point:** From scratch. Despite the spec calling the lifecycle "already scaffolded and running," this directory was empty — Phase 1 scaffolded the full stack (`backend/`, `seed/`, `scripts/`).
- **Phase 1 complete (2026-07-01):** Persistence, dataset architecture, and the CLI-level forget-flip are proven on cognee==1.2.2. Active LLM/embedding provider is **Mistral free tier** (`mistral/mistral-small-latest`, `mistral/mistral-embed`), not the spec's OpenAI default — Gemini was tried first and hit its 20 req/day quota; Mistral was chosen next to avoid spend during MVP-proving. `backend/cognee_patches.py` monkeypatches 3 real cognee 1.2.2 bugs blocking the Mistral provider; `CACHING=false` disables a session-memory bug that silently returns "Got it." on repeat queries — both required reading before touching Cognee in Phase 2+.
- **Architecture (from spec Level 3):** `Next.js (App Router) ──HTTP──> FastAPI ──> Cognee (self-hosted: graph + vector + sqlite, .patchpilot_memory/)`.
- **Signature UI element:** the **diagnosis card** — root cause shown beside the exact prior incidents it was reconstructed from. Plus drift badges (🟢🟡🔴).
- **Cognee depth is the scoring lever:** use both V2 high-level verbs (remember/recall/improve/forget) AND the V1 pipeline (add/cognify/search). Surgical per-dataset `forget()`. This is the strongest judged axis.
- **Why recall fuses two strategies:** `GRAPH_COMPLETION` reasons across incident connections to produce the recommendation; `CHUNKS` returns the specific tickets it rests on — answer grounded in evidence, not hallucination.
- **Memory Drift heuristics (must stay visible/explainable):** newer fix contradicts older workaround → 🔴; release touches a memory's component → 🟡/🔴; memory not recalled successfully in a while → 🟡; similar incidents now resolve differently → 🔴.
- **Demo data is make-or-break:** sample tickets, release notes, and incidents must clearly tell the before/after story or Drift won't feel convincing.
- **Phase 2 complete (2026-07-02):** Full ingest→recall→feedback→release-upload loop built and browser-verified. One known gap: FEEDBACK-02's visible pre/post-Accept reorder isn't demonstrable with the current seed corpus (fixed highest-version tie-break dominates regardless of `feedback_influence`) — deferred, not blocking.
- **Phase 3 complete (2026-07-02):** Drift + Forget shipped and live-UAT-verified (search → 🔴 badge → Forget → re-search). Two things worth remembering for Phase 4 demo scripting:
  - The evidence (CHUNKS) panel is **not interleaved across datasets** — `backend/search.py::_flatten_and_truncate` takes the first `EVIDENCE_LIMIT=3` chunks in per-dataset return order. For the canonical "double-charged" query, `incidents` chunks rank ahead of `workarounds_v1_8`'s and fill all 3 evidence slots, so the evidence panel never visibly shows a `workarounds_v1_8` chunk disappearing on forget — the *visible* forget proof for this query is the row disappearing from the dataset list, not an evidence-panel diff. This is pre-existing Phase 1/2 behavior, not a Phase 3 defect; if Phase 4 wants the evidence-panel flip specifically, it needs either a different demo query or an interleaving change to `_flatten_and_truncate`.
  - **Landmine:** a CSS block comment containing a literal `*/` mid-sentence (e.g. `bg-drift-*/text-drift-*/border-drift-*`) closes the comment early and spills the rest as invalid CSS, crashing the entire Next.js frontend with a PostCSS `CssSyntaxError` on every route. `tsc --noEmit` and grep-based plan verify commands never catch this — only a live browser/dev-server load does. Found and fixed live during `/gsd-verify-work` UAT (`frontend/app/globals.css`, commit `d3c0291`).

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
| Build from scratch in this repo | Directory empty; no scaffold to import | ✓ Done (Phase 1) |
| Self-hosted Cognee + OpenAI gpt-4o-mini | Targets Best Use of Open Source (MacBook); matches Level 3 architecture | ⚠️ Superseded — see Mistral pivot below |
| LLM/embedding provider: Mistral free tier (not OpenAI) | Gemini (first fallback) hit its 20 req/day quota mid-Phase-1; Mistral chosen to keep $0 spend while proving the MVP loop | ✓ Done (Phase 1) — revisit OpenAI once core loop is judge-ready |
| Full must-build lifecycle + Drift in v1 | Drift + before/after loop is the differentiator and core value | — Pending |
| All 4 nice-to-haves promoted to v1 (stretch) | User wants richer demo; marked cut-first if time short | ⚠️ Revisit |
| Per-release dataset scoping for workarounds | Enables surgical `forget(dataset=…)` without touching durable incidents | ✓ Done (Phase 1) — `incidents`/`workarounds_v{N}` locked in `backend/datasets.py` |
| Fused GRAPH_COMPLETION + CHUNKS recall | Grounds recommendation in real evidence tickets | — Pending (Phase 2) |
| `CACHING=false` baseline for all Cognee entrypoints | cognee 1.2.2's session/auto-feedback layer silently returns a canned "Got it." on a repeat query against the same dataset — breaks the search→forget→re-search demo if left on | ✓ Done (Phase 1) — Phase 2 (FEEDBACK-01/02) must design around this if session memory is re-enabled |
| Root-cause flip happens at drift-detection (release-upload) time, not forget time | `_pick_primary_result` already excludes 🔴-flagged datasets, so `/search` returns the correct fix the moment drift is detected; forgetting afterward is a *second*, separate visible change (row/evidence removal), not the root-cause flip itself | ✓ Done (Phase 3) |
| Drift reason string is LLM-generated live via `GRAPH_COMPLETION`, not a static template | Showcases Cognee reasoning depth for judges ("Best Use of Cognee" axis); mitigated with a 10s timeout + deterministic fallback + in-process cache keyed on `(drifting_name, current_highest_name)` | ✓ Done (Phase 3) |
| `POST /forget` requires `compute_drift_states(...).get(name) == "drifting"`, not just live-existence | Code review (CR-02) found the original guard let the backend forget the current, correct workaround via a direct API call bypassing the UI's button-hiding — closed before shipping | ✓ Done (Phase 3) |

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
*Last updated: 2026-07-02 after Phase 3 (drift-forget) completion*
