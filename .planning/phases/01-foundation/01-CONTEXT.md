# Phase 1: Foundation - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers a working Cognee memory backend proven in a **CLI only — no UI**. It retires the two blocking risks (Cognee hangs, ephemeral-FS memory loss) and locks the dataset naming architecture before any UI is written.

Concretely, this phase must produce:
- FastAPI + Cognee scaffold with `/health/cognee` smoke test (add + cognify + search < 30s)
- Persistent storage config so a canary incident survives a server restart
- A seed corpus + seed CLI that demonstrates a verifiable before/after `forget()` flip
- Dataset naming locked in code: `incidents` (durable) / `workarounds_v{N}` (per-release)

Discussion this session focused on **one selected gray area: the Seed corpus story** (DEMO-02). All other Phase 1 gray areas (CLI flip output, persistence proof mechanics, health-check fixture scope) were left to the planner/researcher's discretion within the constraints below.

</domain>

<decisions>
## Implementation Decisions

### Seed Corpus — Before/After Story (DEMO-02)
- **D-01:** The demo's before→after arc is the **Stripe duplicate-charge** incident:
  - `SEARCH "customers double-charged"` → old fix: **nightly manual dedup script** (v1.8 workaround)
  - `UPLOAD release-v1.9.md` → 🔴 "v1.9 adds idempotency keys; dedup script redundant"
  - `FORGET workarounds_v1_8`
  - `RE-SEARCH "customers double-charged"` → new fix: **upgrade v1.9, idempotency-key on webhook**
- **D-02:** Dataset mapping for the arc (implements the locked naming convention):
  - `incidents` — durable double-charge bug record (survives forget)
  - `workarounds_v1_8` — the old nightly-dedup-script workaround (**the dataset that gets forgotten**)
  - `workarounds_v1_9` — the new idempotency-key fix, ingested via the v1.9 release upload (**survives forget → supplies the flipped answer**)
- **D-03:** Corpus size is **medium, ~8 markdown documents**. Enough to make the graph look real and give recall something to reason over; still small enough to stay well under the $10 cognify cap.
- **D-04:** Corpus is a **mixed bag** — the Stripe arc (incident report + escalation + v1.8 workaround thread + v1.9 release note) **plus 1-2 unrelated incidents** (e.g. a login bug, a latency spike) for graph texture. **Only the Stripe arc flips**; the unrelated incidents are decoration.
- **D-05:** Seed/sample files are authored as **Markdown (`.md`)** — one file per ticket / chat / release. Human-readable, easy to author the before/after narrative, and uploads naturally in Phase 2's file-upload UX.

### Builder Concerns (researcher/planner to resolve — not user decisions)
- **B-01 (Cognee #1023 cross-dataset leak):** With a medium corpus sharing entities, forgetting `workarounds_v1_8` may still leak the old answer if its key entities also live in `incidents`/`workarounds_v1_9`. Mitigation direction: give the old workaround **isolated entity names** — the dedup-script node (script name, its component) must appear **only** in `workarounds_v1_8`, so `forget()` cleanly removes the old answer from recall.
- **B-02 (mixed-corpus recall focus):** Because unrelated incidents share the graph, the double-charge arc needs **distinct query terms** so recall stays focused on the Stripe arc before AND after forget — not polluted by the login/latency decoys.

### Claude's Discretion
- CLI flip output format (side-by-side answers, diff, coloring) — planner's call; goal is an **unambiguous, obvious** before/after read in the terminal.
- Persistence-proof mechanics (canary content, manual vs scripted restart, `.patchpilot_memory/` gitignore vs committed seed) — planner's call.
- `/health/cognee` fixture scope (throwaway vs part of seed, cleanup) — planner's call, within the <30s add+cognify+search constraint.
- Exact search query string, unrelated-incident topics, and per-doc wording — Claude's discretion within the arc above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` § "Phase 1: Foundation" — goal, 4 success criteria, requirement list (PLAT-01, PLAT-02, INGEST-02, INGEST-03, DEMO-02)
- `.planning/REQUIREMENTS.md` — full text of PLAT-01, PLAT-02, INGEST-02, INGEST-03, DEMO-02
- `.planning/PROJECT.md` § "Context" & "Constraints" — architecture, Cognee-depth scoring lever, drift heuristics, "demo data is make-or-break"

### Stack, Cognee API, and locked conventions
- `.claude/CLAUDE.md` — **authoritative** tech stack, exact Cognee API signatures (add/cognify/search/forget/prune), dataset naming, storage backends, `SYSTEM_ROOT_DIRECTORY=.patchpilot_memory/`, `uvicorn --workers 1`, "What NOT to Use"
- `PatchPilot_with_hackathon_context.md` (repo root) — original hackathon spec / Level 3 architecture

_No external ADRs — requirements and conventions fully captured in the docs above._

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **None — greenfield.** Repo contains only planning docs and the hackathon spec; no application code, no scaffold to import. Phase 1 builds the FastAPI + Cognee backend from scratch.

### Established Patterns
- All patterns are prescribed in `.claude/CLAUDE.md` (Cognee config, FastAPI async endpoint pattern, env loading, `--workers 1`). No emergent codebase patterns yet.

### Integration Points
- This phase establishes the integration seam (`/health/cognee`, dataset naming) that Phase 2's Next.js frontend and ingest/recall endpoints will build on.

</code_context>

<specifics>
## Specific Ideas

- The before/after arc is money-visible and high-stakes on purpose (double-charging customers) so the forget→flip moment lands hard for judges.
- Release file is named/framed as `release-v1.9.md` and its content is what introduces the idempotency-key fix into `workarounds_v1_9`.

</specifics>

<deferred>
## Deferred Ideas

- **Richer / larger corpus** — grow beyond ~8 docs once the flip is proven (Phase 2+ enrichment). Kept small for Phase 1's fast iteration and budget.
- **More unrelated incidents for graph texture** — additional decoy incidents to make the memory graph visually fuller belong to Phase 2/4 (graph view), not the Phase 1 isolation test.

_Discussion stayed within phase scope; no scope-creep capabilities were requested._

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-07-01*
