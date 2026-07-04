# Phase 3: Drift + Forget - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 3-Drift + Forget
**Areas discussed:** Drift trigger + visible-flip fix, Drift reason string, 🟡 Aging — define or defer

---

## Drift trigger + visible-flip fix

**Question 1:** Given the version tie-break already shows the newest release's answer once it's ingested, how should the visible drift→forget flip actually work?

| Option | Description | Selected |
|--------|-------------|----------|
| Exclude 🔴 datasets from primary answer | `_pick_primary_result` skips 🔴-flagged datasets when choosing the primary GRAPH_COMPLETION answer, even while they remain active/searchable. Root cause flips the moment drift is detected (upload time). Forgetting afterward proves surgical removal via evidence/dataset-list changes. Small code change, two real visible moments. | ✓ |
| Hold new release back until Forget | New release cognified but excluded from active search until the old dataset is forgotten. Root cause literally doesn't change until Forget is clicked — punchier demo moment, but needs new pending-vs-active plumbing and breaks D-16 (same immediate-ingest flow as regular uploads). | |
| Flip = evidence/list change only | Leave tie-break untouched. Root cause already shows newest answer as soon as ingested (unchanged behavior). Forgetting only removes evidence/list row. Simplest, zero risk, but root-cause text itself never changes on Forget — a real deviation from ROADMAP SC4's literal wording. | |

**User's choice:** Exclude 🔴 datasets from primary answer.
**Notes:** This directly resolves the architecture conflict Phase 2's verifier flagged for FEEDBACK-02 (the same version tie-break mechanism was already found to make the newest dataset win independent of any user action).

**Question 2:** What should actually trigger the 🔴 flag on an old workaround when a new release is uploaded?

| Option | Description | Selected |
|--------|-------------|----------|
| Version-based supersession | Any `workarounds_v{N}` no longer the current highest live version is automatically 🔴. Reuses `_version_sort_key` already in search.py — deterministic, zero LLM cost, demo-reliable. | ✓ |
| Content-based contradiction check | Ask Cognee (GRAPH_COMPLETION) whether the new release's content actually contradicts each older workaround; flag only when it says yes. Showcases deeper Cognee reasoning but adds live-LLM latency/cost/risk to the trigger path itself. | |
| Hybrid: version-based trigger, LLM-styled reason | Trigger stays deterministic; reason string generated via LLM. (This decoupling is exactly what got adopted — see next section.) | |

**User's choice:** Version-based supersession.
**Notes:** Kept the trigger itself simple/reliable; LLM reasoning is used for the explanation text instead (see "Drift reason string" below).

**Follow-up flagged (not a question — a risk):** Local `.patchpilot_memory/` already contains `workarounds_v2_0`/`workarounds_v2_1` from Phase 2 UAT testing, unrelated to the canonical Stripe arc. Under a pure global version-number trigger, this leftover test data would currently outrank the real demo answer. Captured as Builder Concern B-01 in CONTEXT.md rather than a user decision.

---

## Drift reason string

**Question 1:** DRIFT-02 requires a human-readable reason string on each 🔴 badge (not a raw score). How should it be generated?

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic template | Built from known facts, zero LLM cost/latency/risk (e.g. "Release v1.9 supersedes this fix."). Always accurate, instant, nothing can go wrong live. | |
| Cognee/LLM-generated explanation | Call GRAPH_COMPLETION asking WHY the release supersedes the workaround, in natural language. Showcases deeper Cognee reasoning for judges; adds a live LLM round-trip per badge (latency, cost, risk of an awkward/wrong-sounding explanation live). | ✓ |
| Template + release note excerpt | Deterministic template pulling the release note's own stated reason (no new LLM call) — more specific than a generic sentence without the reliability risk. | |

**User's choice:** Cognee/LLM-generated explanation.
**Notes:** Explicit trade-off accepted in favor of showcasing Cognee reasoning depth, given "Best Use of Cognee" is a heavily-weighted judging axis.

**Question 2:** When should the LLM-generated drift reason actually be computed, and what happens if it fails or is slow?

| Option | Description | Selected |
|--------|-------------|----------|
| Generate once in background, cache it | Computed once as part of the release's background cognify task (reusing ingest.py's asyncio.create_task() pattern); GET /datasets returns the cached string instantly. Fallback to a deterministic template sentence if the LLM call fails/times out. | |
| Generate live, on each dataset-list fetch | GET /datasets calls the LLM fresh every time. Always up-to-date, but adds real latency (2-7s+) and repeat Mistral API cost on every poll/page load during the timed demo. | ✓ |

**User's choice:** Generate live, on each dataset-list fetch.
**Notes:** User made this choice with the latency/cost risk stated explicitly in the option description. `features.thinking_partner` is not enabled in this project's config, so no additional tradeoff-analysis prompt was inserted — the decision was accepted as-is and captured as Builder Concern B-02 in CONTEXT.md (planner must still design a mitigation and a D-24-compliant fallback for LLM failures).

---

## 🟡 Aging — define or defer

**Question:** The demo corpus naturally produces 🔴 (superseded) and 🟢 (current) but has no obvious trigger for 🟡 Aging. How should it be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Define it, unexercised in the demo | Give 🟡 a real, simple heuristic (shares a component/topic with a newer release but isn't directly superseded) so DRIFT-01's three-state requirement is genuinely implementable, even if the single-arc demo never naturally triggers it live. | ✓ |
| Skip real logic — static/manual only | Don't build detection logic for 🟡 at all; the badge exists in UI vocabulary but nothing ever produces it. Saves time but DRIFT-01 is only partially true — 🟡 would be decorative. | |

**User's choice:** Define it, unexercised in the demo.
**Notes:** Exact "shares a component" matching mechanics left to researcher/planner discretion — no component metadata currently exists in the dataset architecture.

---

## Claude's Discretion

- Badge/forget UI placement: dataset-list row only, or also the diagnosis card's reserved version-tag slot (D-09 from Phase 2).
- One-click forget vs. a confirm step before the destructive `forget()` call.
- Whether forgetting auto-triggers a re-search of the last query (mirroring Phase 2's D-12 Accept pattern) or requires a manual re-search.
- Exact wording/format of the 🟡 heuristic's "shares a component" matching logic.
- Visual styling of the three badge states beyond the 🟢🟡🔴 emoji/color already implied by ROADMAP.

## Deferred Ideas

- Badge/forget UI placement specifics — surfaced as an available discussion area but not selected by the user; left to planner/`/gsd-ui-phase` discretion.
- Full component-metadata model for relatedness matching beyond a thin 🟡 heuristic — out of scope for this phase.
- DEMO-01 (full memory reset/reseed) remains Phase 4's scope; the leftover-UAT-data risk (B-01) needs only a lightweight, targeted fix for Phase 3, not the full reset feature.
