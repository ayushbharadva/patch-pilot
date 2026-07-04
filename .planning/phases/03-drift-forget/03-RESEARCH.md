# Phase 3: Drift + Forget - Research

**Researched:** 2026-07-02
**Domain:** Cognee memory lifecycle (`forget()`, `search(GRAPH_COMPLETION)`), deterministic drift classification, FastAPI lifecycle-verb endpoints
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Drift Trigger & Visible-Flip Mechanism (the load-bearing decision)**
- **D-01 (CRITICAL):** `backend/search.py::_pick_primary_result` currently always prefers the highest-numbered `workarounds_v{N}` dataset with grounded text (Phase 2's `_version_sort_key` tie-break). This means once a newer release is ingested, it already wins search before anything is forgotten — confirmed by Phase 2's own verifier for the analogous FEEDBACK-02 finding. To make Forget cause a real, visible change: `_pick_primary_result` must additionally exclude 🔴-flagged (drifting) datasets from primary-answer selection, even while they remain "active"/searchable. This means:
  - The root-cause flip happens at release-upload time (the moment drift is detected and the old dataset is flagged 🔴) — not at forget time. This satisfies ROADMAP SC1 and is an honest, immediate reaction.
  - Forgetting the 🔴 dataset afterward is what causes the second visible change: the old dataset's ticket disappears from the evidence (CHUNKS) panel, and its row disappears from the dataset list entirely (surgical removal + before/after proof).
  - `_pick_primary_result`'s candidate filter needs a new "not drift-flagged" condition alongside the existing "non-empty text" filter, BEFORE the version-based tie-break sort.
- **D-02:** The 🔴 trigger itself is version-based supersession: any `workarounds_v{N}` dataset that is no longer the current highest live version (per the existing `_version_sort_key` parsing) is automatically 🔴. Deterministic, reuses existing parsing logic, zero LLM cost, always demo-reliable. No semantic contradiction-checking is used for the trigger itself.

**Drift Reason String (DRIFT-02)**
- **D-03:** The human-readable reason string on each 🔴 badge is LLM/Cognee-generated — call `GRAPH_COMPLETION` asking why the new release supersedes the old workaround, in natural language. Chosen over a flat deterministic template specifically to showcase deeper Cognee reasoning for judges.
- **D-04:** The reason is generated live, on each `GET /datasets` fetch — not cached/computed once in the background. Explicit user choice with the latency/cost trade-off stated up front (see Builder Concerns).

**🟡 Aging Heuristic (DRIFT-01)**
- **D-05:** 🟡 gets a real, if thin, heuristic: a workaround that shares a component/topic with a newer release but isn't a direct version supersession ("related but not confirmed replaced"). Makes DRIFT-01's three-state requirement genuinely implementable rather than decorative, even though the single-arc demo corpus (Stripe double-charge) won't naturally trigger 🟡 live during the demo. Exact "shares a component" matching mechanics are left to researcher/planner discretion.

### Claude's Discretion
- Badge + forget UI placement: dataset-list row only, or also inline on the diagnosis card's reserved version-tag slot (D-09 from Phase 2 explicitly reserved this).
- One-click forget vs. a confirm step before the destructive `forget()` call.
- Whether forgetting auto-triggers a re-search of the last query (mirroring Phase 2's D-12 Accept→auto-re-search pattern) or requires the user to manually re-search.
- Exact wording/format of the deterministic 🟡 heuristic and its "shares a component" matching logic.
- Visual styling of the three badge states beyond the 🟢🟡🔴 emoji/color already implied by ROADMAP.

### Deferred Ideas (OUT OF SCOPE)
- Badge/forget UI placement specifics (dataset-list only vs. also diagnosis card; one-click vs. confirm; auto-re-search after forget) — not discussed by user choice; left to planner/`/gsd-ui-phase` discretion within D-01 through D-05.
- Component-based relatedness matching beyond a thin heuristic for 🟡 — a fuller "component" metadata model on datasets is out of scope for this phase; would belong to a future enrichment phase if ever pursued.
- DEMO-01 (full reset/reseed) is explicitly Phase 4's scope, not this phase's. However, a Builder Concern flags that the current local memory already has leftover Phase 2 UAT test debris that could interfere with Phase 3's own demo unless addressed (see below — resolved by this research).

**Builder Concerns (researcher/planner to resolve — resolved below):**
- **B-01 (leftover UAT test data risk):** see "Demo Corpus Readiness" pitfall — resolved via `scripts/snapshot_memory.py`/`seed_cli.py --reset`.
- **B-02 (live LLM reason-generation reliability):** see "In-process reason cache" pattern below.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRIFT-01 | Every memory carries a health state — 🟢 Stable / 🟡 Aging / 🔴 Drifting | "Shared Drift-Classification Helper" pattern; `HealthState` type already exists in `frontend/components/DiagnosisCard.tsx` (`"stable" \| "aging" \| "drifting"`) — backend must emit exactly these three string literals |
| DRIFT-02 | On release upload, drift detection flags affected older memories with a visible, explainable reason string | D-03/D-04 GRAPH_COMPLETION call shape (single-dataset grounding); "In-process reason cache" pattern for B-02 |
| DRIFT-03 | Drift recommends which workarounds to forget | Drift classification surfaced through `GET /datasets` response shape extension |
| FORGET-01 | User can forget a flagged workaround via surgical `forget(dataset="workarounds_v{N}")` | `cognee.forget()` verified source trace (below); Forget endpoint design mirroring `feedback.py`'s validate-before-lifecycle-verb pattern, with an added "never forget `incidents`" guard |
| FORGET-02 | Re-searching the same bug after forget returns the new correct fix (the before/after proof) | Verified: `forget(dataset=...)` fully deletes the dataset row (not just its documents) — `_active_search_datasets()` naturally stops returning it, no extra code needed |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Directives from `.claude/CLAUDE.md` that apply to this phase's implementation:

- **Use `cognee.forget(dataset="name")` for per-dataset removal — never `cognee.prune.prune_system()`** ("What NOT to Use" table: prune wipes ALL datasets globally with no targeting). Directly governs FORGET-01's endpoint design (Pattern 5).
- **Single uvicorn worker only (`--workers 1`)** — Kuzu's file-based locking corrupts the graph under concurrent workers. The in-process reason cache (Pattern 4) relies on this: a module-level `dict` is safe only because there is exactly one process.
- **No LangChain/LlamaIndex as an orchestration layer** — call `cognee.search()`/`cognee.forget()` directly for the drift reason string and forget action; do not introduce a prompt-orchestration framework for the GRAPH_COMPLETION reason call.
- **CORS origin allowlist must stay explicit, never a wildcard** — the new `POST /forget` route is registered on the same `app` instance in `backend/main.py`, which already has `allow_origins=["http://localhost:3000"]`; no change needed, but any new router must not introduce its own CORS config.
- **All user-facing errors are short human messages, never raw exception text** (D-24, already a project-wide convention, not just a CLAUDE.md line) — applies to both the new Forget endpoint and to LLM reason-generation failures/timeouts (Pattern 3's fallback).
- **Documented LLM discrepancy:** `.claude/CLAUDE.md`'s "LLM" constraint says OpenAI `gpt-4o-mini`, but `.planning/STATE.md`'s Decisions log records the project switched to Mistral's free tier for all LLM calls (`LLM_PROVIDER=mistral`, `LLM_MODEL=mistral/mistral-small-latest`) after Gemini's quota was exhausted in Phase 1. This research treats Mistral as the actual runtime provider (see Assumption A2) — the $10 OpenAI budget cap CLAUDE.md describes is not the operative cost constraint for this phase's new LLM call; Mistral's free-tier rate limits and observed ~7s latency are.
- **Cognee self-hosted only, file-based storage (`SYSTEM_ROOT_DIRECTORY=.patchpilot_memory/`)** — already the case; this phase adds no new storage backend or deployment target.

## Summary

This phase's two hardest technical questions were answerable with certainty by reading the installed `cognee==1.2.2` package source directly (`.venv/lib/python3.14/site-packages/cognee/`), not by researching docs or web sources — and the source trace overturns one assumption in CONTEXT.md's own framing. First: `cognee.forget(dataset="workarounds_v1_9")` does not merely empty a dataset's documents (doc_count → 0) — it calls `datasets.empty_dataset()` → `delete_dataset()`, which runs `session.delete(dataset)` on the relational `Dataset` row itself. The dataset is **fully removed** from `cognee.datasets.list_datasets()`. This means `backend/search.py::_active_search_datasets()` and `backend/datasets_router.py::GET /datasets` need **zero new code** to make a forgotten dataset disappear from search and the dataset list — both already discover datasets dynamically via `list_datasets()`/`list_data()`, so removal is automatic. Second: `cognee.search()` never fuses results across multiple `datasets=` — it returns one independent result per dataset requested (confirmed in `cognee/api/v1/search/search.py` and already documented in `search.py`'s own module docstring). This rules out CONTEXT.md's speculative "query both the old and new dataset together" shape for the D-03 reason string: a two-dataset call would return two separate, mutually-unaware answers, not one that reasons about the relationship between them. The correct, simpler, and already-seed-content-compatible shape is a **single-dataset GRAPH_COMPLETION query against only the new (superseding) release's dataset**, asking it to explain in one sentence why it replaces the older workaround — the seed corpus's own `release-v1.9.md` already states this explicitly ("the old nightly dedup sweep workaround is now redundant and superseded"), so this call is grounded and cheap.

The single most consequential *operational* finding is that the live local `.patchpilot_memory/` is currently in a state that will actively sabotage a Phase 3 demo: Phase 1's own `seed/seed_cli.py --flip` exit-gate test already ran `forget(dataset="workarounds_v1_8")` as its own proof, so the live corpus right now contains only `incidents` and `workarounds_v1_9` (confirmed by a live `list_datasets()` query during this research) — `workarounds_v1_8` does not exist to be drift-flagged or forgotten again. Wave 0 of this phase's plan must restore a pre-flip snapshot (`python seed/seed_cli.py --reset`, which calls `scripts/snapshot_memory.py.restore()`) to get both `workarounds_v1_8` and `workarounds_v1_9` live again before drift/forget can be demoed — this single action also resolves B-01 (leftover UAT datasets), since restore replaces the entire `.patchpilot_memory/` tree wholesale.

**Primary recommendation:** Add one pure, shared `compute_drift_state()` helper (reusing `search.py`'s existing `_version_sort_key`/`_WORKAROUNDS_VERSION_RE`) that both `_pick_primary_result` and `GET /datasets` call; extend `_pick_primary_result`'s candidate filter with a "not drifting" condition; extend `GET /datasets`'s response with `drift_state`/`drift_reason` fields computed via a single-dataset GRAPH_COMPLETION call wrapped in `asyncio.wait_for(..., timeout=10)` with a deterministic template fallback and an in-process `dict` cache keyed by `(dataset_name, current_highest_version)`; add a `POST /forget` endpoint that validates the target matches `workarounds_v{N}` AND is not `incidents`/`healthcheck`/`canary` before calling `cognee.forget(dataset=...)`, copying `feedback.py`'s try/except/D-24 pattern exactly.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Drift state classification (version compare) | API / Backend | — | Pure deterministic logic (D-02); must be computed once server-side and shared by both `/search` and `/datasets` so the two endpoints never disagree about which dataset is 🔴 |
| Drift reason string generation (LLM) | API / Backend | Database / Storage (Cognee graph) | Backend owns the Cognee client and the in-process cache; Cognee's graph is the grounding source for the GRAPH_COMPLETION call — never expose Cognee credentials/calls to the browser |
| Drift badge rendering (🟢/🟡/🔴 + reason tooltip) | Browser / Client | — | Pure presentational rendering of a value already computed server-side; `frontend/components/DiagnosisCard.tsx` already has a `HealthState` type and a reserved `VersionTagBadge` slot for this |
| Forget action (button click → API call → lifecycle verb) | Browser / Client (trigger) | API / Backend (executes) | Browser only triggers; all validation (dataset-name allowlist, "never forget incidents") and the actual `cognee.forget()` call live in the backend, mirroring `feedback.py`'s pattern |
| Dataset existence / doc counts (source of truth after forget) | Database / Storage (Cognee relational DB) | API / Backend (surfaces via `list_datasets()`) | `forget()` deletes the `Dataset` row directly in Cognee's relational store; the backend never needs to track deletion state itself — it always re-reads live from Cognee |
| Re-search after forget (before/after proof) | Browser / Client (trigger) | API / Backend (`/search`, unchanged contract) | Reuses the exact same `/search` endpoint and `_pick_primary_result` logic already built in Phase 2 — no new search-side capability needed beyond the drift-exclusion filter |

## Standard Stack

No new third-party packages are required for this phase. Every capability is built from libraries already installed and verified working in Phase 1/2 (`cognee==1.2.2`, `fastapi`, React/Next.js/Tailwind, `@tanstack/react-query`).

### Core (already installed — no new install commands)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cognee | 1.2.2 (installed, confirmed via `.venv/lib/python3.14/site-packages/cognee`) | `forget()`, `search(GRAPH_COMPLETION)`, `datasets.list_datasets()` | Already the project's memory layer; this phase only calls verbs it already exposes `[VERIFIED: cognee 1.2.2 installed source]` |
| Python stdlib `asyncio` | 3.12/3.14 stdlib | `asyncio.wait_for(coro, timeout=N)` to bound the live LLM reason-generation call (B-02) | No dependency needed; `asyncio.TimeoutError` is the exact, well-known exception to catch for a deterministic fallback `[ASSUMED — general Python stdlib knowledge]` |
| Python stdlib `dict` | — | In-process cache for drift reason strings, keyed by `(dataset_name, current_highest_version)` | Single-worker app (`--workers 1`, mandated by Kuzu's file locking per `.claude/CLAUDE.md`) — a plain module-level dict is correct and sufficient; no Redis/cache library needed `[CITED: web — general FastAPI caching pattern, see Sources]` |

### Supporting
No supporting libraries needed. Do not add `fastapi-cache2`, `async_lru`, or any caching dependency — the app is explicitly single-process/single-worker and a manual dict is simpler, has zero new attack surface, and needs zero new install.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual in-process dict cache for drift reasons | `fastapi-cache2` / `async_lru` | Adds a dependency for a single-process demo app with one cache key pattern — not worth it here; would matter if PatchPilot ever ran multi-worker or needed cross-process cache invalidation |
| Version-only 🔴 trigger (D-02, locked) | LLM-judged semantic contradiction detection for the trigger itself | CONTEXT.md explicitly rejected this for the *trigger* (adds live-LLM risk/non-determinism to the demo's most load-bearing mechanism); LLM reasoning is still used, but only for the *explanation* (D-03), which can silently fall back to a template without breaking the demo |

**Installation:** None — no new packages this phase.

## Package Legitimacy Audit

Not applicable — this phase introduces no new external packages (frontend or backend). All capabilities are built on `cognee`, `fastapi`, `react`, `@tanstack/react-query`, and Python/TypeScript stdlib already installed and verified in Phase 1/2.

## Architecture Patterns

### System Architecture Diagram

```
                 ┌─────────────────────────── Browser ───────────────────────────┐
                 │  DatasetList.tsx            DiagnosisCard.tsx                  │
                 │  (renders 🟢/🟡/🔴 + reason   (search results;                  │
                 │   tooltip, Forget button)     excludes 🔴 datasets already)    │
                 └───────┬───────────────────────────────┬─────────────────────--┘
                         │ GET /datasets                  │ POST /search
                         │ POST /forget {dataset}         │ {query}
                         ▼                                ▼
                 ┌───────────────────────── FastAPI Backend ──────────────────────┐
                 │                                                                │
                 │  datasets_router.py            search.py                      │
                 │  ┌──────────────────┐          ┌──────────────────────────┐   │
                 │  │ GET /datasets    │          │ POST /search             │   │
                 │  │ 1. list_datasets │          │ 1. _active_search_       │   │
                 │  │ 2. compute_drift_│◄────────►│    datasets()            │   │
                 │  │    state() per   │  shared  │ 2. GRAPH_COMPLETION +    │   │
                 │  │    dataset       │  helper  │    CHUNKS across all     │   │
                 │  │ 3. if 🔴: reason │          │    active datasets       │   │
                 │  │    string (cache │          │ 3. _pick_primary_result:│   │
                 │  │    -> LLM call   │          │    exclude 🔴-flagged    │   │
                 │  │    -> fallback)  │          │    datasets before the   │   │
                 │  └──────────────────┘          │    version tie-break     │   │
                 │                                 └──────────────────────────┘   │
                 │  forget.py (NEW)                                               │
                 │  ┌──────────────────────────────────────────────────────────┐ │
                 │  │ POST /forget {dataset}                                   │ │
                 │  │ 1. validate: matches workarounds_v{N} AND in live list   │ │
                 │  │ 2. reject: dataset == incidents/healthcheck/canary       │ │
                 │  │ 3. await cognee.forget(dataset=name)                     │ │
                 │  └──────────────────────────────────────────────────────────┘ │
                 └───────┬─────────────────────────────────┬───────────────────--┘
                         │ list_datasets() / search()       │ forget()
                         ▼                                   ▼
                 ┌────────────────────── Cognee (file-based) ─────────────────────┐
                 │  Relational (SQLite): Dataset rows, Data records               │
                 │  Graph (Kuzu) + Vector (LanceDB): per-dataset isolated stores  │
                 │  forget() deletes the Dataset row + its graph/vector entries — │
                 │  list_datasets() reflects this immediately, no polling delay   │
                 └──────────────────────────────────────────────────────────────-┘
```

A reader can trace the primary flow: release upload → `GET /datasets` computes `compute_drift_state()` for every live `workarounds_v{N}` → a 🔴 dataset gets a cached-or-live reason string → the same drift state feeds `_pick_primary_result`'s exclusion filter so `/search` already stops surfacing the 🔴 dataset as the primary answer → the user clicks Forget → `POST /forget` validates and calls `cognee.forget()` → the dataset row is deleted → the next `GET /datasets` and `/search` both reflect the removal automatically, with no new bookkeeping needed anywhere.

### Recommended Project Structure
```
backend/
├── search.py            # extend: compute_drift_state() usage in _pick_primary_result
├── datasets_router.py    # extend: GET /datasets response gains drift_state/drift_reason
├── drift.py              # NEW: compute_drift_state(), reason-string generation + cache
├── forget.py             # NEW: POST /forget router, mirrors feedback.py's pattern
├── datasets.py            # unchanged — INCIDENTS/workarounds_dataset() constants reused
└── tests/
    └── test_drift_forget.py  # NEW: unit tests for compute_drift_state(), forget validation
frontend/
├── components/
│   ├── DatasetList.tsx       # extend: render drift_state badge + reason tooltip + Forget button
│   └── DiagnosisCard.tsx     # HealthState type + VersionTagBadge slot already exist (D-09) — wire healthState prop
└── lib/
    └── api.ts                 # extend: DatasetInfo gains drift_state/drift_reason; add forgetDataset()
```

### Pattern 1: Shared Drift-Classification Helper (D-01, D-02, DRIFT-01)
**What:** A single pure function, `compute_drift_state(dataset_name, all_live_workaround_names) -> Literal["stable","aging","drifting"]`, built by extending `search.py`'s existing `_WORKAROUNDS_VERSION_RE`/`_version_sort_key` — do not duplicate the version-parsing regex in a second module.
**When to use:** Called once per request by both `GET /datasets` (to render badges) and inside `_pick_primary_result` (to exclude 🔴 candidates) so the two endpoints can never disagree about which dataset is drifting.
**Example:**
```python
# backend/drift.py — new module; reuses search.py's regex, doesn't duplicate it
from backend.search import _WORKAROUNDS_VERSION_RE, _version_sort_key
from backend.datasets import INCIDENTS

def compute_drift_states(live_dataset_names: list[str]) -> dict[str, str]:
    """Map every live workarounds_v{N} dataset name to 'stable' | 'aging' | 'drifting'.
    `incidents` and any non-versioned name are always 'stable' (D-01: durable
    ground truth, never a drift subject)."""
    versioned = [n for n in live_dataset_names if _WORKAROUNDS_VERSION_RE.match(n)]
    if not versioned:
        return {n: "stable" for n in live_dataset_names}
    highest = max(versioned, key=_version_sort_key)
    states = {}
    for name in live_dataset_names:
        if name == INCIDENTS or not _WORKAROUNDS_VERSION_RE.match(name):
            states[name] = "stable"
        elif name == highest:
            states[name] = "stable"
        else:
            states[name] = "drifting"  # D-02: any non-max version is 🔴, unconditionally
    return states
```
Note: D-02 is worded as an unconditional rule ("any `workarounds_v{N}` dataset that is no longer the current highest live version ... is automatically 🔴"), which fully consumes every non-`incidents`, non-max-version dataset into `"drifting"` — there is no version-number-based room left for `"aging"`. See Pitfall 3 below and Open Question 1 for how `"aging"` must be produced by a genuinely separate signal, not a variant of the version compare.

### Pattern 2: `_pick_primary_result`'s new exclusion condition (D-01)
**What:** Extend the existing candidate filter with the drift-state check, computed via Pattern 1, before the version-based tie-break sort.
**When to use:** Every `/search` call, so a 🔴-flagged dataset never wins as the primary answer even while it's still "active"/searchable for the evidence panel.
**Example:**
```python
# backend/search.py — extend the existing function, don't rewrite it
def _pick_primary_result(results: list[dict], drift_states: dict[str, str]) -> dict | None:
    candidates = [
        r for r in results
        if _result_text(r.get("search_result"))
        and drift_states.get(r.get("dataset_name"), "stable") != "drifting"
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda r: _version_sort_key(r.get("dataset_name")), reverse=True)
    return candidates[0]
```
`drift_states` is computed once per `/search` request from `_active_search_datasets()`'s own return value (Pattern 1), so no extra Cognee round-trip is needed — it's pure post-processing on data the endpoint already fetched.

### Pattern 3: Single-Dataset GRAPH_COMPLETION for the Reason String (D-03)
**What:** Query only the new (superseding) dataset — never the old + new together — with a custom `system_prompt` string that instructs a one-sentence, human-readable explanation.
**When to use:** Whenever a dataset is freshly classified `"drifting"` and no cached reason exists yet for `(old_dataset_name, current_highest_version)`.
**Why not query both datasets together:** `cognee.search(datasets=[a, b], ...)` returns one independent `SearchResult` per dataset (confirmed in the installed source, `cognee/api/v1/search/search.py`, and already noted in `search.py`'s own module docstring: "Cognee returns one result per dataset searched, never a single fused answer across datasets"). A two-dataset call would produce two answers, each grounded only in its own dataset's graph — neither one "reasons about the relationship" the way CONTEXT.md's framing hoped. Querying the new dataset alone works because the seed corpus's own release notes already state the supersession explicitly (verified in `seed/workarounds_v1_9/release-v1.9.md`: *"the old nightly dedup sweep workaround is now redundant and superseded ... Teams should stop relying on the old nightly cleanup script"*), so grounding on the new dataset alone is sufficient and cheaper.
**Example:**
```python
# backend/drift.py
import asyncio
import cognee
from cognee import SearchType

DRIFT_REASON_PROMPT = (
    "Answer in one concise sentence (max ~30 words): what does this release "
    "change, and why does it make an existing manual workaround for the same "
    "problem unnecessary? Do not mention 'context' or 'documents' — answer as "
    "a direct engineering explanation."
)
_REASON_TIMEOUT_SECONDS = 10
_FALLBACK_REASON = "A newer release supersedes this workaround."  # D-24 template fallback

async def generate_drift_reason(newest_dataset_name: str) -> str:
    try:
        results = await asyncio.wait_for(
            cognee.search(
                query_text="Why does this release make the prior workaround unnecessary?",
                query_type=SearchType.GRAPH_COMPLETION,
                datasets=[newest_dataset_name],
                system_prompt=DRIFT_REASON_PROMPT,  # overrides system_prompt_path — verified precedence below
            ),
            timeout=_REASON_TIMEOUT_SECONDS,
        )
        text = " ".join(str(r.get("search_result", "")) for r in results).strip()
        return text or _FALLBACK_REASON
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text, always answer
        return _FALLBACK_REASON
```
`system_prompt` (a raw string) takes precedence over `system_prompt_path` — confirmed directly in the installed source: `cognee/modules/retrieval/utils/completion.py` line 21/135: `system_prompt = system_prompt if system_prompt else read_query_prompt(system_prompt_path)`. `[VERIFIED: cognee 1.2.2 installed source]`

### Pattern 4: In-Process Reason Cache (B-02 mitigation, D-04-compatible)
**What:** A module-level `dict` cache keyed by `(drifting_dataset_name, current_highest_version_name)`, checked before calling `generate_drift_reason()`.
**When to use:** Every `GET /datasets` call, for every dataset classified `"drifting"`.
**Why this satisfies D-04 without violating it:** D-04 says the reason is generated "live, on each `GET /datasets` fetch — not cached/computed once in the background." A background job is explicitly out because it would compute reasons speculatively, before drift is known to exist. This cache is different: it's a **live, per-request-path check** that skips re-calling the LLM only when the exact same drift fact (same old dataset, same current-winner dataset) was already answered — the moment a NEW release changes the "current highest version" half of the key, the cache key changes and a fresh live call happens. This is "live" in the sense the user's decision cared about (never stale/precomputed across a real drift-state change) while eliminating the actual risk B-02 named (repeated multi-second LLM calls for a drift fact that hasn't changed since the last poll).
**Example:**
```python
# backend/drift.py
_reason_cache: dict[tuple[str, str], str] = {}

async def get_or_generate_reason(drifting_name: str, current_highest_name: str) -> str:
    key = (drifting_name, current_highest_name)
    if key in _reason_cache:
        return _reason_cache[key]
    reason = await generate_drift_reason(current_highest_name)
    _reason_cache[key] = reason
    return reason
```
Cache is process-local and unbounded — acceptable for a demo app with a handful of datasets; note as a known limitation (see Pitfall 5) rather than building eviction logic that isn't needed at this scale.

### Pattern 5: Forget Endpoint — validate-before-lifecycle-verb, plus a durable-dataset guard (FORGET-01)
**What:** Copy `backend/feedback.py`'s `_is_known_dataset` pattern, but add a second guard `feedback.py` didn't need: reject the durable `incidents` dataset (and `healthcheck`/`canary` throwaways) even if they're technically "known."
**When to use:** `POST /forget`, before ever calling `cognee.forget()`.
**Why the extra guard matters:** `cognee.forget(dataset="incidents")` would succeed exactly like any other dataset — Cognee's `forget()` has no concept of "durable" vs "per-release" datasets; that distinction exists only in `backend/datasets.py`'s naming convention. Nothing in Cognee itself stops a caller from forgetting `incidents`. INGEST-03 and D-01's guarantee ("the `incidents` dataset remains intact") depend entirely on this application-level guard.
**Example:**
```python
# backend/forget.py — NEW module, mirrors feedback.py's structure exactly
import logging
import cognee
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend import cognee_config  # noqa: F401,E402
from backend import cognee_patches  # noqa: F401,E402
from backend.datasets import INCIDENTS
from backend.search import _WORKAROUNDS_VERSION_RE

router = APIRouter()
logger = logging.getLogger(__name__)

_MSG_INVALID_DATASET = "That dataset can't be forgotten."
_MSG_ERROR = "Could not forget dataset. Please try again."


class ForgetRequest(BaseModel):
    dataset: str = Field(..., min_length=1)


async def _is_forgettable_workaround(name: str) -> bool:
    """Only workarounds_v{N} datasets that actually exist may be forgotten.
    `incidents` (and any non-versioned/throwaway name) is never forgettable
    through this endpoint (D-01/INGEST-03 durability guarantee)."""
    if name == INCIDENTS or not _WORKAROUNDS_VERSION_RE.match(name):
        return False
    all_datasets = await cognee.datasets.list_datasets()
    return any(ds.name == name for ds in all_datasets)


@router.post("/forget")
async def forget_dataset(request: ForgetRequest):
    try:
        if not await _is_forgettable_workaround(request.dataset):
            logger.warning("forget blocked: invalid target dataset=%r", request.dataset)
            return {"status": "error", "message": _MSG_INVALID_DATASET}

        await cognee.forget(dataset=request.dataset)
        return {"status": "forgotten", "dataset": request.dataset}
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        logger.exception("forget failed for dataset=%s", request.dataset)
        return {"status": "error", "message": _MSG_ERROR}
```
Register in `backend/main.py` alongside the other four routers.

### Anti-Patterns to Avoid
- **Querying both old and new datasets in one GRAPH_COMPLETION call expecting a fused "why X replaces Y" answer:** returns two independent, dataset-scoped answers instead (verified above) — always query only the new dataset for the reason string.
- **Letting `cognee.forget()` receive a client-supplied dataset name without validation:** `forget()`'s own `_resolve_dataset_id` calls `get_authorized_dataset_by_name`, which returns `None` for an unknown name, and the caller immediately does `dataset.id` — an `AttributeError: 'NoneType' object has no attribute 'id'` on ANY unrecognized name, not a clean, catchable "not found" error (see Pitfall 2). Pre-validate with `list_datasets()` exactly like `feedback.py` does.
- **Computing drift state independently inside `/search` and `/datasets`, with any difference in logic between the two:** would let the dataset list show 🔴 for a dataset that `/search` still treats as a valid primary answer (or vice versa), breaking D-01's core visible-flip guarantee. Always route both through the one shared `compute_drift_states()` helper.
- **Adding a background job/scheduler to precompute drift reasons:** explicitly rejected by D-04; use the per-request cache (Pattern 4) instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting that a dataset was forgotten | A `forgotten_datasets` set/flag tracked in application state | Re-read `cognee.datasets.list_datasets()` fresh every request | `forget()` deletes the `Dataset` row synchronously — the backend already re-reads this list on every `/search` and `/datasets` call; tracking it separately risks drift between app state and Cognee's real state |
| Version-number parsing for `workarounds_v{N}(_{M})?` | A new regex/parser in a new drift module | Import `_WORKAROUNDS_VERSION_RE`/`_version_sort_key` from `backend/search.py` | Already written, already unit-tested (`test_search_helpers.py`); a second copy would risk silently diverging from the original if either is edited later |
| Cross-dataset "why does X replace Y" reasoning | A custom prompt-chaining pipeline that manually stitches together two datasets' text before calling the LLM | A single GRAPH_COMPLETION call against the new dataset alone, since the seed content already states the supersession in its own text | Cognee's per-dataset isolation (the same access-control isolation that mitigates GH #1023) makes manual cross-dataset context-stitching both unnecessary and against the grain of how Cognee scopes its graph traversal |

**Key insight:** Every "don't hand-roll" item above exists because Cognee's `datasets.list_datasets()` is already the single source of truth for what's alive, and `search.py` already has the only version-parsing logic this project needs — Phase 3's job is almost entirely *composition* of Phase 1/2's existing primitives (`forget()`, `list_datasets()`, `_version_sort_key`, the validate-before-lifecycle-verb pattern), not new infrastructure.

## Common Pitfalls

### Pitfall 1: Demo corpus is currently in a post-forget state (Wave 0 blocker)
**What goes wrong:** A live query against the current `.patchpilot_memory/` (run during this research) shows only `spike_incident`, `incidents`, `workarounds_v1_9`, and `canary` — **`workarounds_v1_8` does not exist**. `seed/seed_cli.py`'s own `--flip` function (Phase 1's exit-gate test) calls `forget(dataset=WORKAROUNDS_V1_8)` as part of proving the before/after flip works, and that flip already ran against the live memory tree. There is currently no old workaround left to drift-flag or forget for Phase 3's demo.
**Why it happens:** Phase 1's flip test and Phase 2's UAT sessions both wrote to the same live `.patchpilot_memory/` tree that Phase 3 will build against; nothing resets it automatically between phases.
**How to avoid:** Wave 0 of this phase's plan must run `.venv/bin/python seed/seed_cli.py --reset`, which calls `scripts/snapshot_memory.py.restore()` — a $0 filesystem restore (no re-`cognify()` billing) from `patchpilot_memory.snapshot.tar`, which (per file timestamps: snapshot taken 2026-07-02T01:36, live DB last modified 2026-07-02T01:54, i.e. after the snapshot) predates the Phase 1 flip's `forget()` call and should therefore contain both `workarounds_v1_8` and `workarounds_v1_9` live, with none of Phase 2's leftover UAT/spike datasets. **This restore also resolves B-01** (leftover `workarounds_v2_0`/`workarounds_v2_1`/`spike_incident`/`canary` debris) in the same step, since restore replaces the entire memory tree wholesale rather than surgically removing individual strays.
**Warning signs:** `GET /datasets` showing only one `workarounds_v*` entry, or a "no results" / non-flipping demo when rehearsing the search → drift → forget → re-search loop.

### Pitfall 2: `cognee.forget()` raises an ugly `AttributeError`, not a clean error, for an unknown dataset name
**What goes wrong:** Tracing `forget(dataset=name)` → `_forget_dataset()` → `_resolve_dataset_id()` → `get_authorized_dataset_by_name()`: the lookup function returns `None` when no dataset matches the name, and `_resolve_dataset_id` immediately does `return dataset.id` with no None-check — raising `AttributeError: 'NoneType' object has no attribute 'id'` for any unrecognized/forged dataset name, not a descriptive `ValueError`/`DatasetNotFoundError`.
**Why it happens:** `forget()`'s internal validation assumes the caller already validated the dataset exists (this is exactly the gap `feedback.py`'s `_is_known_dataset` pattern was written to close for `improve()`).
**How to avoid:** Pre-validate the target dataset against `cognee.datasets.list_datasets()` in the `POST /forget` handler before ever calling `cognee.forget()` — see Pattern 5. The broad `except Exception` + D-24 short message is still needed as defense-in-depth (in case Cognee's internals change), but should never be the *only* line of defense given how unfriendly the raw exception is.
**Warning signs:** A raw `AttributeError` traceback in server logs when testing the Forget button against a stale/already-forgotten dataset name (e.g., double-clicking Forget, or a race where the dataset list is stale).

### Pitfall 3: D-02's 🔴 rule is unconditional — it leaves no version-based signal for "aging"
**What goes wrong:** D-02 states any non-highest-version `workarounds_v{N}` is automatically 🔴. If a planner tries to derive "aging" from a *weaker* version gap (e.g., "same major line, different minor" vs. "different major line = confirmed replacement"), it directly contradicts D-02 for this project's actual naming scheme: `workarounds_v1_8` → `workarounds_v1_9` (the canonical demo arc) parses as major=1, minor=8 vs. major=1, minor=9 — i.e., the load-bearing demo transition IS a same-major, different-minor change. A major/minor split would incorrectly leave `workarounds_v1_8` as "aging" instead of "drifting," breaking the entire demo.
**Why it happens:** The `_version_sort_key` regex's two capture groups (`major`, `minor`) look like they map naturally onto a "confirmed vs. related" split, but they don't correspond to that distinction in this project's actual version-numbering convention.
**How to avoid:** Keep 🔴's rule exactly as D-02 states it (any non-max version, full stop) and derive 🟡 from something orthogonal to version-number comparison entirely — see Open Question 1 for the two viable candidate designs.
**Warning signs:** Unit test `test_pick_primary_result_prefers_highest_version_number`-style assertions failing, or the canonical Stripe demo arc rendering `workarounds_v1_8` as 🟡 instead of 🔴 after `v1.9`'s upload.

### Pitfall 4: `GET /datasets` currently has no polling interval, but will still get called more often once Forget exists
**What goes wrong:** Today `frontend/components/DatasetList.tsx` only refetches on explicit `queryClient.invalidateQueries` calls from `UploadPanel.tsx` (upload success, sample-load success, ready-status poll) — there's no `refetchInterval`. Once a Forget button exists, invalidating `DATASETS_QUERY_KEY` after every forget action, plus possibly `staleTime`/`refetchOnWindowFocus` defaults, means the live reason-generation call in Pattern 3 can still fire more than once per drift fact if the cache key isn't designed carefully.
**Why it happens:** React Query's default `staleTime: 0` refetches on every mount/window-focus unless configured otherwise.
**How to avoid:** Rely on the backend-side cache (Pattern 4) as the actual mitigation rather than trying to prevent frontend refetches — the cache key `(dataset_name, current_highest_version)` is stable across repeated `/datasets` calls as long as no new release has shipped, so redundant frontend refetches cost at most one cheap `list_datasets()` round-trip, not a repeated LLM call.
**Warning signs:** Server logs showing multiple GRAPH_COMPLETION calls for the same `(old, new)` dataset pair within a short window.

### Pitfall 5: Unbounded in-process cache growth is a non-issue at this scale — don't over-engineer eviction
**What goes wrong:** A naive review might flag the module-level `_reason_cache` dict in Pattern 4 as an unbounded-growth risk.
**Why it happens:** General caching hygiene instinct.
**How to avoid:** For this project's scale (a handful of datasets, single demo session, single-worker process that restarts on redeploy), an unbounded dict is correct and simpler than adding TTL/LRU eviction. Do not add `functools.lru_cache`/`cachetools` for this — it would be solving a problem that doesn't exist in a hackathon-scale demo app and would add a dependency (see Standard Stack "Alternatives Considered").
**Warning signs:** N/A for this project's scope — only relevant if PatchPilot were ever deployed long-running with hundreds of distinct release datasets, which is explicitly out of scope (see REQUIREMENTS.md "Out of Scope").

## Code Examples

### Verified: `cognee.forget()` fully deletes the dataset row (not just its documents)
```python
# Source: .venv/lib/python3.14/site-packages/cognee/api/v1/forget/forget.py
# and cognee/api/v1/datasets/datasets.py::empty_dataset,
# and cognee/modules/data/methods/delete_dataset.py

# forget(dataset="workarounds_v1_9") with default memory_only=False resolves to:
async def _forget_dataset(dataset_ref, user) -> dict:
    dataset_id = await _resolve_dataset_id(dataset_ref, user)
    await datasets.empty_dataset(dataset_id, user=user)   # <-- deletes the Dataset ROW
    return {"dataset_id": str(dataset_id), "status": "success"}

# Inside empty_dataset -> delete_dataset(dataset):
async def delete_dataset(dataset: Dataset):
    # ... deletes graph/vector handler data for the dataset first ...
    async with db_engine.get_async_session() as session:
        dataset = await session.get(Dataset, dataset.id)
        if dataset:
            await session.delete(dataset)   # <-- the relational row is GONE, not emptied
            await session.commit()
```
This confirms `_active_search_datasets()` (`backend/search.py`) and `list_datasets()` (`backend/datasets_router.py`) both need **zero new logic** to reflect a forget — they already re-query `cognee.datasets.list_datasets()` fresh on every call, and a forgotten dataset simply won't be in that list anymore. `[VERIFIED: cognee 1.2.2 installed source]`

### Verified: `search()` never fuses multiple `datasets=` into one answer
```python
# Source: .venv/lib/python3.14/site-packages/cognee/api/v1/search/search.py, lines 289-335
# datasets is resolved to a list of dataset_ids and passed straight through
# to search_function() -- one SearchResult per dataset, never merged.
# backend/search.py's own module docstring already documents this:
#   "Cognee returns one result per dataset searched, never a single fused
#    answer across datasets ... this module owns that fusion" (for CHUNKS
#    evidence across incidents+workarounds -- but GRAPH_COMPLETION answers
#    are still one-per-dataset, which is why _pick_primary_result exists).
```
`[VERIFIED: cognee 1.2.2 installed source]`

### Live-confirmed current dataset state (this research session, 2026-07-02)
```
$ .venv/bin/python -c "... await cognee.datasets.list_datasets() ..."
spike_incident   31a65c94-2dae-5381-867f-39c7787ebc11
incidents        2d9b4950-12e8-5dac-9768-68adcae97926
workarounds_v1_9 b332adea-342e-57e3-ad52-828d12227653
canary           b5db4287-3a4b-5d65-a9b3-0b11690e5777
```
No `workarounds_v1_8` — confirms Pitfall 1. `[VERIFIED: live query against project's own .patchpilot_memory/]`

## State of the Art

Not applicable in the usual "library version changed" sense — this phase uses the same `cognee==1.2.2` already pinned in Phase 1/2, and no new library versions are introduced. The one relevant "state of the art" fact is architectural: Cognee 1.2.2's `forget()` is the unified V1.0 API replacing the older separate prune/delete/empty_dataset call pattern (per the installed package's own startup log: *"Cognee 1.0 changes: New API — remember/recall/forget/improve (V1 add/cognify/search still work)"*), which matches `.claude/CLAUDE.md`'s existing "What NOT to Use" guidance to prefer `forget(dataset=...)` over `prune.prune_system()` for per-dataset removal — already correctly followed by this project's `backend/main.py::health_cognee()` and `seed/seed_cli.py::flip()`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The restored snapshot (`patchpilot_memory.snapshot.tar`, timestamped before the live DB's last modification) actually contains both `workarounds_v1_8` and `workarounds_v1_9` pre-forget, based on file-timestamp ordering and `snapshot_memory.py`'s documented "save after first successful --seed" workflow — not independently verified by extracting and querying the tarball in this research session | Pitfall 1 / Summary | If the snapshot was actually taken post-flip (unlikely given timestamps, but not extraction-verified), Wave 0's `--reset` would not restore `workarounds_v1_8` and the plan would need a full `--seed` re-run instead (which bills `cognify()` — still low-cost on Mistral's free tier, but not zero-cost) |
| A2 | The `.claude/CLAUDE.md`-documented LLM is OpenAI `gpt-4o-mini`, but `.planning/STATE.md`'s Decisions log records the project has since switched to Mistral (`LLM_PROVIDER=mistral`, `LLM_MODEL=mistral/mistral-small-latest`) for all LLM calls including Phase 1/2's `cognify()`/`search()` — this research assumes Phase 3's new GRAPH_COMPLETION reason-string call will also run on Mistral's free tier (not OpenAI), inheriting Phase 2's measured ~7s latency and the two `cognee_patches.py` Mistral-adapter bug fixes | Standard Stack, Pattern 3/4, Pitfall 4 | If a future `.env` change reverts to OpenAI, the reason-generation code itself needs no change (it's provider-agnostic), but the `_REASON_TIMEOUT_SECONDS = 10` value and the B-02 cache urgency were sized against Mistral's observed latency — OpenAI would likely be faster, making the cache less critical but still harmless |
| A3 | The manual in-process `dict` caching pattern (Pattern 4) is standard practice for a single-worker demo app — sourced from a general (non-Cognee-specific) WebSearch, not an authoritative citation | Standard Stack, Pattern 4 | Low risk: this is a well-known, simple pattern; worst case is a planner choosing a slightly different cache-key shape, not a wrong architecture |

## Open Questions

1. **Exact matching mechanics for the 🟡 "Aging" state (D-05)**
   - What we know: D-02's 🔴 rule is unconditional and consumes every non-max-version `workarounds_v{N}` dataset (Pitfall 3), so 🟡 cannot be a variant of version comparison — it must come from an orthogonal signal. The current dataset architecture has no component/topic metadata (`backend/datasets.py` only has `incidents`/`workarounds_v{N}` naming), and the demo corpus has only one arc (Stripe), so no dataset naturally qualifies for 🟡 today — CONTEXT.md's own D-05 acknowledges this.
   - What's unclear: which of the following two viable designs the planner should pick.
   - Recommendation: **Option A (recommended, minimal code):** `compute_drift_states()` accepts an optional keyword-overlap check between a non-versioned dataset (e.g. `incidents`) and the current highest-version `workarounds_v{N}`'s content — if they share significant terms (e.g., both mention "double-charged"/"Stripe"), mark the non-versioned dataset `"aging"` instead of always `"stable"`, since a recent release touched its topic without invalidating the incident record itself. This is real, deterministic, and — notably — **would actually fire in the current single-arc corpus** (since `incidents`'s Stripe ticket and `workarounds_v1_9`'s release note share vocabulary), which is a nicer outcome than CONTEXT.md's expectation that no 🟡 fires live, but doesn't violate any locked decision. **Option B (more conservative, matches CONTEXT.md's "won't fire live" framing exactly):** implement `"aging"` as a valid, tested code path (unit-testable with a synthetic multi-arc fixture) that is simply unreachable by the single-arc seed corpus, keeping the demo narrative exactly as CONTEXT.md described it. Either is acceptable; Option B is lower-risk if the planner wants to preserve CONTEXT.md's stated demo narrative precisely.

2. **Should `GET /datasets`'s `drift_reason` field be `null`/omitted for non-drifting datasets, or always present as an empty string?**
   - What we know: `frontend/lib/api.ts`'s `DatasetInfo` interface will need a new optional field; TypeScript's `exactOptionalPropertyTypes` conventions aren't established anywhere else in this codebase yet.
   - What's unclear: exact JSON shape preference.
   - Recommendation: `drift_state: "stable" | "aging" | "drifting"` always present (matches the existing `HealthState` type in `DiagnosisCard.tsx` exactly), `drift_reason: string | null` — `null` for `"stable"`/`"aging"` (no reason computed), a real string for `"drifting"`. This keeps the discriminated-union style already used throughout `api.ts` for `SearchResponse`/`IngestResponse`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Single-user local demo app, no auth layer (matches Phase 1/2's existing posture) |
| V3 Session Management | No | Forget/drift endpoints are stateless; no session token involved (unlike `/search`'s server-minted `session_id`, which this phase doesn't touch) |
| V4 Access Control | Yes | The Forget endpoint must enforce an application-level access-control rule Cognee itself does not provide: `incidents`/`healthcheck`/`canary` are never forgettable through `POST /forget`, even though `cognee.forget()` would technically permit it (see Pattern 5) |
| V5 Input Validation | Yes | `ForgetRequest.dataset` is a client-supplied string that reaches a destructive lifecycle verb (`cognee.forget()`) — must be validated against a strict allowlist (`workarounds_v{N}` regex AND present in `list_datasets()`) before use, exactly mirroring `feedback.py`'s `_is_known_dataset` pattern for `improve()`'s `dataset` argument (Pitfall 2) |
| V6 Cryptography | No | Not applicable to this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged dataset name reaching `cognee.forget(dataset=...)` (e.g., a client sending `"incidents"` or a crafted string colliding with an internal throwaway dataset) | Tampering / Elevation of Privilege | Validate-before-lifecycle-verb pattern (Pattern 5): allowlist check (`workarounds_v{N}` regex) + live-existence check (`list_datasets()`) + explicit durable-dataset denylist (`incidents`, `healthcheck`, `canary`), copying `feedback.py`'s established pattern |
| Raw exception text (e.g., an `AttributeError` traceback from `forget()`'s internals, Pitfall 2) leaking to the client on an invalid forget request | Information Disclosure | D-24 pattern already established across `search.py`/`ingest.py`/`feedback.py`/`datasets_router.py`: broad `except Exception`, `logger.exception(...)` server-side, fixed short human-readable message in the response body — apply identically in the new `forget.py`/`drift.py` modules |
| Denial-of-service via forcing repeated expensive LLM calls (e.g., rapid-fire `GET /datasets` polling once a 🔴 dataset exists) | Denial of Service | In-process reason cache (Pattern 4) plus a hard `asyncio.wait_for` timeout (Pattern 3) so a hung/slow LLM call can never stack up indefinitely per request |

## Sources

### Primary (HIGH confidence)
- `.venv/lib/python3.14/site-packages/cognee/api/v1/forget/forget.py` (installed package source, cognee==1.2.2) — exact `forget()` signature, all five internal code paths (`_forget_everything`, `_forget_dataset`, `_forget_data_item`, `_forget_dataset_memory`, `_forget_data_memory`)
- `.venv/lib/python3.14/site-packages/cognee/api/v1/datasets/datasets.py` — `empty_dataset()`, `delete_all()`, confirms dataset-row deletion, not just document emptying
- `.venv/lib/python3.14/site-packages/cognee/modules/data/methods/delete_dataset.py` — confirms `session.delete(dataset)` removes the relational `Dataset` row
- `.venv/lib/python3.14/site-packages/cognee/api/v1/search/search.py` — full `search()` signature; confirms one-result-per-dataset behavior, confirms `system_prompt` string param exists alongside `system_prompt_path`
- `.venv/lib/python3.14/site-packages/cognee/modules/retrieval/utils/completion.py` (lines 21, 135) — confirms `system_prompt` string takes precedence over `system_prompt_path` when both/either are set
- Live query against this project's own `.patchpilot_memory/` (`cognee.datasets.list_datasets()`) — confirmed current dataset state (Pitfall 1)
- `backend/search.py`, `backend/datasets_router.py`, `backend/feedback.py`, `backend/main.py`, `backend/datasets.py`, `backend/cognee_config.py`, `seed/seed_cli.py`, `scripts/snapshot_memory.py` — this project's own existing, verified-working code (patterns to extend, not alternatives to consider)
- `frontend/components/DatasetList.tsx`, `frontend/components/DiagnosisCard.tsx`, `frontend/lib/api.ts` — this project's own existing frontend contracts, including the pre-reserved `HealthState` type and `VersionTagBadge` slot from Phase 2 (D-09)
- `seed/workarounds_v1_9/release-v1.9.md`, `seed/workarounds_v1_8/nightly-dedup-workaround.md`, `seed/workarounds_v1_9/idempotency-fix-thread.md` — actual seed corpus content, confirms the release note already states the supersession explicitly (grounds Pattern 3's single-dataset query design)
- `.planning/phases/02-core-recall/02-VERIFICATION.md` — FEEDBACK-02 finding that `_pick_primary_result`'s tie-break already always favors the highest version, independent of any user action (the exact mechanism D-01 must now gate with a drift-exclusion condition)

### Secondary (MEDIUM confidence)
- `.planning/phases/01-foundation/01-RESEARCH.md` — GH #1023 cross-dataset leak history (closed, fixed in Cognee 0.2.0 via `ENABLE_BACKEND_ACCESS_CONTROL`); already mitigated in this project via isolated entity names + per-dataset scoped `cognify()` calls; no new risk introduced by Phase 3's forget flow since it reuses the same already-isolated datasets

### Tertiary (LOW confidence)
- WebSearch: "FastAPI simple in-memory cache dictionary async endpoint avoid repeated expensive call pattern" — general confirmation that a manual dict-based cache is a standard, accepted pattern for single-process apps; not Cognee-specific, general programming knowledge `[CITED: web — see search result titles: github.com/long2ice/fastapi-cache, dev.to/igorbenav/fastapi-mistakes-that-kill-your-performance-2b8k]`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all capabilities verified against installed `cognee==1.2.2` source directly
- Architecture: HIGH — every pattern above traces to either this project's own already-verified code or the installed Cognee package source, not external documentation that could be stale/aspirational
- Pitfalls: HIGH for Pitfalls 1-3 (all confirmed via direct source/live-query trace); MEDIUM for Pitfall 4/5 (general React Query/caching hygiene, not project-specific verification)

**Research date:** 2026-07-02
**Valid until:** 7 days (fast-moving: this research is tightly coupled to the exact live state of `.patchpilot_memory/`, which changes with every dev/test session — Pitfall 1's finding should be re-verified with a fresh `list_datasets()` query immediately before Wave 0 execution, not assumed still true from this research alone)
