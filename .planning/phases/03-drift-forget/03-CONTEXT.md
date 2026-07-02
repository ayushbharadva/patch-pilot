# Phase 3: Drift + Forget - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers Memory Drift detection and surgical Forget — the project's scoring differentiator. Uploading a release exposes stale workarounds with human-readable drift badges (🟢 Stable / 🟡 Aging / 🔴 Drifting); the engineer can forget a drifting workaround with one click; re-searching proves memory changed. This closes the loop PROJECT.md calls the Core Value: "search → drift-detected → forget → re-search — visibly, in under 120 seconds."

Discussion covered 3 areas: the drift trigger + visible-flip mechanism (the load-bearing risk carried over from Phase 2's verification), the drift reason string, and the 🟡 Aging heuristic. Badge/forget UI placement (one-click vs confirm, auto-re-search) was surfaced as an available area but the user chose not to discuss it — left to planner/UI-phase discretion within the decisions below.

</domain>

<decisions>
## Implementation Decisions

### Drift Trigger & Visible-Flip Mechanism (the load-bearing decision)
- **D-01 (CRITICAL — resolves a real architecture conflict):** `backend/search.py::_pick_primary_result` currently always prefers the highest-numbered `workarounds_v{N}` dataset with grounded text (Phase 2's `_version_sort_key` tie-break). This means once a newer release is ingested, it **already wins search before anything is forgotten** — confirmed by Phase 2's own verifier for the analogous FEEDBACK-02 finding. To make Forget cause a real, visible change: **`_pick_primary_result` must additionally exclude 🔴-flagged (drifting) datasets from primary-answer selection**, even while they remain "active"/searchable. This means:
  - The root-cause flip happens **at release-upload time** (the moment drift is detected and the old dataset is flagged 🔴) — not at forget time. This satisfies ROADMAP SC1 (badge appears after upload) and is an honest, immediate reaction.
  - Forgetting the 🔴 dataset afterward is what causes the **second** visible change: the old dataset's ticket disappears from the evidence (CHUNKS) panel, and its row disappears from the dataset list entirely (ROADMAP SC3/SC4 — surgical removal + before/after proof, framed as evidence/list cleanup rather than a second root-cause text change).
  - Researcher/planner: `_pick_primary_result`'s candidate filter needs a new "not drift-flagged" condition alongside the existing "non-empty text" filter, BEFORE the version-based tie-break sort.
- **D-02:** The 🔴 trigger itself is **version-based supersession**: any `workarounds_v{N}` dataset that is no longer the current highest live version (per the existing `_version_sort_key` parsing) is automatically 🔴. Deterministic, reuses existing parsing logic, zero LLM cost, always demo-reliable. No semantic contradiction-checking is used for the trigger itself (that would add live-LLM risk to the trigger path) — see D-03 for where LLM reasoning IS used (the reason string only).

### Drift Reason String (DRIFT-02)
- **D-03:** The human-readable reason string on each 🔴 badge is **LLM/Cognee-generated** — call `GRAPH_COMPLETION` asking why the new release supersedes the old workaround, in natural language. Chosen over a flat deterministic template specifically to showcase deeper Cognee reasoning for judges (hackathon's "Best Use of Cognee" is a heavily-weighted axis).
- **D-04:** The reason is generated **live, on each `GET /datasets` fetch** — not cached/computed once in the background. This was an explicit user choice made with the latency/cost trade-off stated up front (see Builder Concerns below for the mitigation the researcher/planner must design around).

### 🟡 Aging Heuristic (DRIFT-01)
- **D-05:** 🟡 gets a **real, if thin, heuristic**: a workaround that shares a component/topic with a newer release but isn't a direct version supersession (i.e., "related but not confirmed replaced"). This makes DRIFT-01's three-state requirement genuinely implementable rather than decorative, even though the single-arc demo corpus (Stripe double-charge) won't naturally trigger 🟡 live during the demo. Exact "shares a component" matching mechanics are left to researcher/planner discretion — no component metadata currently exists in the dataset architecture (`backend/datasets.py` only has `incidents`/`workarounds_v{N}` naming, no component field).

### Claude's Discretion
- Badge + forget UI placement: dataset-list row only, or also inline on the diagnosis card's reserved version-tag slot (D-09 from Phase 2 explicitly reserved this).
- One-click forget vs. a confirm step before the destructive `forget()` call.
- Whether forgetting auto-triggers a re-search of the last query (mirroring Phase 2's D-12 Accept→auto-re-search pattern) or requires the user to manually re-search.
- Exact wording/format of the deterministic 🟡 heuristic and its "shares a component" matching logic.
- Visual styling of the three badge states beyond the 🟢🟡🔴 emoji/color already implied by ROADMAP.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` § "Phase 3: Drift + Forget" — goal, 4 success criteria, requirement list (DRIFT-01/02/03, FORGET-01/02)
- `.planning/REQUIREMENTS.md` — full text of DRIFT-01/02/03, FORGET-01/02
- `.planning/PROJECT.md` § "Context" — candidate drift heuristics list ("newer fix contradicts older workaround → 🔴; release touches a memory's component → 🟡/🔴; memory not recalled successfully in a while → 🟡; similar incidents now resolve differently → 🔴"), Core Value statement

### Prior phase decisions (locked, carry forward)
- `.planning/phases/02-core-recall/02-CONTEXT.md` — D-09 (diagnosis card version tag reserved for Phase 3's badge slot), D-12 (Accept→auto-re-search pattern to reuse for Forget), D-15/D-16 (dataset list + release-upload routing)
- `.planning/phases/02-core-recall/02-VERIFICATION.md` — the FEEDBACK-02 finding that `_pick_primary_result`'s version tie-break already always favors the highest version, independent of any explicit user action; this is the SAME root mechanism D-01 above resolves for Phase 3's forget flow
- `.planning/phases/01-foundation/01-CONTEXT.md` — the Stripe double-charge arc (D-01/D-02: `incidents`/`workarounds_v1_8`/`workarounds_v1_9` dataset mapping), isolated entity names mitigating Cognee #1023 cross-dataset leak

### Stack, Cognee API, and locked conventions
- `.claude/CLAUDE.md` — authoritative Cognee API signatures (`forget(dataset=...)`, `search()`, `improve()`), "What NOT to Use" (no `prune.prune_system()` for per-dataset forget — use `cognee.forget(dataset="name")`)
- `backend/search.py` — `_pick_primary_result`, `_version_sort_key`, `_active_search_datasets`, `_flatten_and_truncate` — all four must be understood before touching drift/forget logic
- `backend/datasets_router.py` — `_is_display_dataset` filtering pattern for the dataset list; the drift badge's data source
- `backend/feedback.py` — `_is_known_dataset` validation pattern (RESEARCH.md Pitfall 2 / T-02-09) — the Forget endpoint must apply the same "validate dataset name against the live list before calling a Cognee lifecycle verb" pattern before calling `forget()`

_No external ADRs beyond the above — requirements and conventions fully captured in these docs._

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/search.py::_version_sort_key` — already parses `workarounds_v{N}(_{M})?` version numbers; reuse directly for the D-02 version-based drift trigger instead of writing new parsing logic.
- `backend/search.py::_pick_primary_result` — needs a new condition added (exclude 🔴-flagged datasets from candidates) per D-01; do not rewrite, extend.
- `backend/search.py::_active_search_datasets` — already discovers live datasets with `doc_count > 0`; after `forget()`, a dataset's doc count should drop to 0 and it will naturally stop appearing here (this is how the existing Phase 1 CLI flip worked and should still work for D-01's evidence-panel/dataset-list flip).
- `frontend/components/DatasetList.tsx` — already has a **reserved badge slot** per row (`<span className="size-2 shrink-0 rounded-full bg-transparent" />` at line 47) built explicitly for this phase's drift badges — no layout change needed, just fill the slot.
- `frontend/components/DiagnosisCard.tsx` — the version tag (D-09 from Phase 2) was explicitly reserved as a second possible drift-badge location.
- `backend/feedback.py::_is_known_dataset` — the exact validate-before-lifecycle-call pattern the new Forget endpoint should copy (validate `source_dataset`/target dataset name against `cognee.datasets.list_datasets()` before calling `cognee.forget()`).

### Established Patterns
- D-24 (Phase 2): all user-facing errors are short human messages, never raw exception text — applies to Forget failures and to LLM reason-generation failures/timeouts (D-04's live-generation choice needs a template fallback per this pattern).
- `asyncio.create_task()` background-scheduling pattern (`backend/ingest.py`) — reuse if drift-flag computation or reason generation needs to run outside the request/response cycle.
- Package-qualified imports (`from backend import cognee_config`, then `cognee`, then `backend.cognee_patches`) — required import order for any new module touching Cognee (see `backend/search.py`'s own docstring for the pattern).

### Integration Points
- New backend surface needed: a Forget endpoint (likely `POST /forget` or similar, following `feedback.py`'s router pattern), drift-flag + reason-string computation (likely extending `datasets_router.py`'s `GET /datasets` response shape to include badge state + reason per dataset).
- Frontend: `DatasetList.tsx` needs to render the badge (color + reason, e.g. as a tooltip or inline text) and a Forget action per 🔴 row; `DiagnosisCard.tsx` may need its version tag updated to reflect drift state if Claude's discretion (see above) places a badge there too.

</code_context>

<specifics>
## Specific Ideas

- The demo's existing before/after arc (Stripe double-charge: `workarounds_v1_8` nightly-dedup script superseded by `workarounds_v1_9` idempotency-key fix) is the natural scenario Phase 3's drift/forget flow will be demonstrated against — no new corpus needed.
- The reason string should read like a real explanation of WHY the fix changed (e.g., "This nightly dedup script is now redundant: release v1.9 adds idempotency keys directly on the webhook..."), not a raw score or generic sentence — this is why LLM generation was chosen over a template (D-03).

</specifics>

<deferred>
## Deferred Ideas

- **Badge/forget UI placement specifics** (dataset-list only vs. also diagnosis card; one-click vs. confirm; auto-re-search after forget) — not discussed by user choice; left to planner/`/gsd-ui-phase` discretion within D-01 through D-05.
- **Component-based relatedness matching** beyond a thin heuristic for 🟡 — a fuller "component" metadata model on datasets is out of scope for this phase; would belong to a future enrichment phase if ever pursued.
- **DEMO-01** (full reset/reseed) is explicitly Phase 4's scope, not this phase's. However, a **Builder Concern** below flags that the CURRENT local memory already has leftover Phase 2 UAT test datasets that could interfere with Phase 3's own demo unless addressed (a targeted, lightweight fix — not a DEMO-01 feature build).

### Builder Concerns (researcher/planner to resolve — not user decisions)
- **B-01 (leftover UAT test data risk):** Local `.patchpilot_memory/` already contains `workarounds_v2_0` and `workarounds_v2_1` datasets created live during Phase 2 UAT testing (2026-07-02, per `02-UAT.md` test 7/9) — unrelated to the canonical Stripe `v1.8`/`v1.9` arc. Under D-02's version-based global trigger, these would currently outrank the real `workarounds_v1_9` demo answer and could produce a confusing or incoherent drift story. Likely needs a targeted memory reset before the Phase 3 demo (reuse Phase 1's `scripts/snapshot_memory.py` restore-from-snapshot, if a pre-UAT snapshot exists) or Phase 3's drift comparison should be scoped to a specific "arc" rather than global version number across all `workarounds_v{N}`.
- **B-02 (live LLM reason-generation reliability):** D-04's choice (generate the drift reason live on every `GET /datasets` fetch) risks repeated Mistral API calls with 2-7s+ latency per 🔴 dataset per fetch, especially if the frontend polls this endpoint (as `UploadPanel.tsx`/`DatasetList.tsx` already do for other status). Researcher/planner must design a mitigation — e.g., only recompute when underlying drift facts changed, debounce/cache client-side, or reduce poll frequency while any 🔴 badge is present — and MUST implement a short deterministic fallback string (per D-24) if the live LLM call fails or times out, never surfacing a raw exception or leaving the badge blank.

_Discussion stayed within phase scope; no scope-creep capabilities were requested._

</deferred>

---

*Phase: 3-Drift + Forget*
*Context gathered: 2026-07-02*
