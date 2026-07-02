# Phase 2: Core Recall - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the full ingest-to-recall product experience in the browser: users upload incident/chat/changelog/release content (or load the bundled Stripe-arc sample), search a known incident and receive an evidence-grounded diagnosis card (fused `GRAPH_COMPLETION` root cause + `CHUNKS` evidence), accept a fix to reinforce it via `improve()`, and upload a release note into a versioned `workarounds_v{N}` dataset visible in a dataset list. This is the first phase with a UI — Phase 1 was CLI-only.

Discussion covered 9 areas across ingest UX, diagnosis card layout, feedback interaction, release upload, page structure, search states, batch upload progress, error handling, and sample-dataset/search-input scope. All other implementation details are left to research/planning discretion within the decisions below.

</domain>

<decisions>
## Implementation Decisions

### Ingest & Upload UX
- **D-01:** Content type is declared via an **explicit selector** (ticket / chat / changelog / release note) at upload time — no auto-classification. This maps deterministically to dataset routing (`incidents` vs `workarounds_v{N}`) with no misclassification risk to the locked dataset-isolation architecture (Phase 1 INGEST-03).
- **D-02:** Upload supports **multi-file batch** — multiple files dropped/selected at once, each cognified independently.
- **D-03:** The Phase 1 seed corpus (8 docs, Stripe arc) is loaded into the running app via an explicit **"Load Sample Data" button**, not auto-preloaded at startup — judges should see ingestion actually happen through the same upload pipeline, not a pre-baked state.
- **D-04:** There is **only one bundled sample bundle** — the Stripe arc. No second/alternate sample dataset; a second story would require authoring a whole new isolated before/after arc, which is out of scope.
- **D-05:** Immediately after upload, the user sees a **toast acknowledgment + a persistent processing badge** that flips to "Ready" once background cognify completes (per-file, see D-13).

### Diagnosis Card Layout
- **D-06:** Card layout is **root cause on top, evidence tickets below** — recommendation reads as the headline, evidence as supporting proof underneath.
- **D-07:** Show **2-3 evidence snippets, short excerpt** with truncation; full text available on demand (see D-08).
- **D-08:** Evidence snippets are **click-to-expand** to the full source document — reinforces "grounded in real tickets" without a separate screen.
- **D-09:** The card shows a **small dataset/version tag** (e.g. "v1.8") next to the fix — sets up Phase 3's drift-badge slot visually without building drift logic yet.

### Feedback Interaction
- **D-10:** **Reject is a silent dismiss** — no reinforcement/negative-feedback API call. Only Accept calls the reinforcement mechanism. This sidesteps doubling the surface area of the still-unresolved `improve(feedback_alpha=)` vs `search(SearchType.FEEDBACK)` API question (see Builder Concerns).
- **D-11:** After Accept, the card shows an **inline state change** (e.g. button becomes a "Reinforced" checkmark) — no modal, no navigation away.
- **D-12:** Reinforcement is proven for the demo by **re-running the same search and showing the accepted fix reordered/prioritized** — directly demonstrates FEEDBACK-02's "higher priority" requirement with visible cause-and-effect.
- **D-13:** Accept/Reject applies to the **whole diagnosis card only**, not individual evidence tickets — matches FEEDBACK-01's scope exactly.

### Release Upload & Dataset List
- **D-14:** Release version (the `{N}` in `workarounds_v{N}`) is captured via a **manual input field** at upload time — no filename/content parsing, avoiding a parsing failure mode before a scored demo.
- **D-15:** Dataset list shows **name + document count** per dataset (e.g. "workarounds_v1_9 · 2 docs") — proves RELEASE-01's visibility requirement and gives Phase 3 a natural slot for health badges.
- **D-16:** Release upload uses the **same upload flow as D-01**, with "Release Note" as one of the type-selector options (routes to `workarounds_v{N}` instead of `incidents`) — one upload component, not a separate release-specific flow.

### Page Structure & Search UX
- **D-17:** UI is a **single-page dashboard** — search, diagnosis card, upload panel, and dataset list all visible in sections on one page, no tabs/navigation. Minimizes clicks during the timed 120s demo.
- **D-18:** Search bar is a **persistent top bar**, always visible; the diagnosis card renders below/replaces content when a search runs.
- **D-19:** Empty state (before first search) shows a **prompt with the example query** (e.g. "Search an incident, e.g. 'customers double-charged'"), plus **clickable example-query chip(s)** below the search bar for a smoother live demo.
- **D-20:** While the fused search is in flight, show a **skeleton diagnosis card** (greyed placeholder shaped like the real card), not a bare spinner.
- **D-21:** Zero-result searches show an **explicit empty-state message** ("No prior incidents found for this query") — never fall back to an ungrounded generic LLM answer, since evidence-grounding is the product's core positioning.

### Batch Upload Progress & Error Handling
- **D-22:** Multi-file uploads show **per-file status rows** (Uploading → Processing → Ready/Failed) — not a single aggregate progress bar. Makes partial failures obvious.
- **D-23:** If a file's cognify step fails after upload was acknowledged, its **row flips to "Failed" with a retry button** — consistent with per-file granularity (D-22).
- **D-24:** All user-facing errors (upload rejection, search errors, cognify failure) show a **short human message only** — never raw exception/stack-trace text. Consistent with Phase 1's WR-03 fix (don't leak raw exception text).

### Builder Concerns (researcher/planner to resolve — not user decisions)
- **B-01 (FEEDBACK API unresolved):** `improve(feedback_alpha=)` (V2 API) vs `search(SearchType.FEEDBACK)` (server-mode) is still unresolved against `cognee==1.2.2` — flagged as a blocker in STATE.md since Phase 1. A research spike must resolve this before FEEDBACK-01/02 are planned. D-10 (Reject = no-op) reduces exposure to this unknown but Accept's reinforcement path still depends on it.
- **B-02 (search latency budget):** D-20's skeleton-card decision assumes the fused GRAPH_COMPLETION + CHUNKS search takes a few seconds. Researcher should confirm actual latency on the seed corpus so the skeleton duration/UX feels intentional, not broken.
- **B-03 (batch cognify sequencing):** D-02 (multi-file batch) + D-22 (per-file status) implies each uploaded file is cognified independently and reports its own status — confirm this is achievable without serializing all cognify calls behind a single lock (Kuzu's file-based locking, per CLAUDE.md constraints on `--workers 1`).

### Claude's Discretion
- Exact visual styling (colors, spacing, iconography for status badges/tags) — deferred to `/gsd-ui-phase` if run, or planner's discretion otherwise.
- Toast component implementation, skeleton-card exact shape, and dataset/version tag visual treatment.
- Whether "processing badge" (D-05) and "per-file status row" (D-22) are the same UI element or two separate indicators — planner's call on how to unify without contradicting either decision.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` § "Phase 2: Core Recall" — goal, 4 success criteria, requirement list (INGEST-01, RECALL-01/02/03, FEEDBACK-01/02, RELEASE-01)
- `.planning/REQUIREMENTS.md` — full text of INGEST-01, RECALL-01/02/03, FEEDBACK-01/02, RELEASE-01; also flags the unresolved FEEDBACK API question
- `.planning/PROJECT.md` § "Context" & "Constraints" — architecture, Cognee-depth scoring lever, diagnosis-card signature UI element, drift heuristics preview
- `.planning/STATE.md` § "Blockers/Concerns" — FEEDBACK API unresolved (B-01 above), Cognee #1023 cross-dataset leak mitigation already applied in Phase 1 seed data

### Prior phase decisions (locked, carry forward)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Stripe double-charge arc, dataset isolation rules (D-01/D-02 from Phase 1)
- `seed/README.md` — canonical demo query (`"customers double-charged"`), dataset→folder mapping, entity isolation rules that Phase 2's search/upload UI must not violate
- `backend/datasets.py` — locked dataset naming constants (`INCIDENTS`, `WORKAROUNDS_V1_8`, `WORKAROUNDS_V1_9`, `workarounds_dataset()` helper) — reuse for release-upload dataset routing (D-16)

### Stack, Cognee API, and locked conventions
- `.claude/CLAUDE.md` — authoritative tech stack, exact Cognee API signatures (add/cognify/search/forget/improve), SearchType enum, "What NOT to Use" (no CORS wildcard, no multiple uvicorn workers)
- `PatchPilot_with_hackathon_context.md` (repo root) — original hackathon spec / Level 3 architecture
- `backend/main.py` — existing `/health/cognee` pattern (per-request dataset naming, `CACHING=false` already applied) — reference for how new ingest/search endpoints should structure Cognee calls

_No external ADRs beyond the above — requirements and conventions fully captured in these docs._

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/datasets.py` — dataset naming constants and `workarounds_dataset(n)` helper; new release-upload endpoint should call this rather than string-formatting `workarounds_v{N}` inline.
- `backend/cognee_config.py` / `backend/cognee_patches.py` — env loading and Mistral-provider bugfixes already wired; any new Cognee-calling endpoint module must import these before touching `cognee` (see `backend/main.py`'s import-order comments).
- `backend/main.py` — only `/health/cognee` exists so far; establishes the async-endpoint + try/except/finally pattern for Cognee calls that new ingest/search/feedback/release endpoints should follow.

### Established Patterns
- Package-qualified imports (`from backend import cognee_config`, not bare `import datasets`) — required to avoid the lancedb/HuggingFace `sys.modules["datasets"]` collision documented in `backend/main.py`'s module docstring.
- No CORS middleware exists yet — Phase 2 is the first phase with a browser origin (Next.js), so CORS setup with an explicit origin list (never `"*"`) is new work, not yet a pattern.

### Integration Points
- No frontend exists yet — Phase 2 scaffolds the entire Next.js App Router frontend from scratch (no prior UI code/patterns to reuse).
- New backend endpoints needed: file upload (multi-file, typed), search (fused GRAPH_COMPLETION+CHUNKS), feedback/accept, release upload, dataset list — none exist yet beyond `/health/cognee`.

</code_context>

<specifics>
## Specific Ideas

- The example query used throughout the empty-state prompt and search chips should be the canonical demo query locked in Phase 1: `"customers double-charged"`.
- The dataset/version tag on the diagnosis card (D-09) is explicitly framed as pre-work for Phase 3's 🟢🟡🔴 drift badges — same visual slot, no drift logic yet.
- Reinforcement proof (D-12) — re-search and show reordering — mirrors the exact mechanic Phase 3 will reuse for the forget→re-search flip, so the UI pattern built here should be reusable, not one-off.

</specifics>

<deferred>
## Deferred Ideas

- **Multiple sample dataset bundles** — a second alternate demo story beyond the Stripe arc. Deferred indefinitely; would require authoring a whole new isolated before/after corpus with no current need (D-04).
- **Per-evidence-ticket feedback** (accept/reject individual evidence pieces, not just the whole card) — belongs to a future phase if ever, not required by FEEDBACK-01/02's scope (D-13).
- **Negative reinforcement on Reject** — actively demoting a fix via the feedback API. Deferred until the FEEDBACK API question (B-01) resolves and only if judge-facing value is clear (D-10).
- **Confidence score display** (STRETCH-01) — already scoped to Phase 4; not pulled forward.
- **Visual design system specifics** (colors, exact spacing, iconography) — belongs to `/gsd-ui-phase` if run for this phase, not this discussion.

_Discussion stayed within phase scope; no scope-creep capabilities were requested._

</deferred>

---

*Phase: 2-Core Recall*
*Context gathered: 2026-07-02*
