# Phase 2: Core Recall - Research

**Researched:** 2026-07-02
**Domain:** Cognee session/feedback API internals (cognee==1.2.2), FastAPI multipart ingest + background processing, Next.js 16 App Router frontend scaffolding, CORS
**Confidence:** HIGH (feedback API resolution, dataset/pipeline APIs — all read directly from the installed package source in this repo's `.venv`); MEDIUM (FastAPI/Next.js patterns — standard, well-documented); LOW (search latency budget — no empirical measurement taken this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Ingest & Upload UX**
- D-01: Content type is declared via an explicit selector (ticket / chat / changelog / release note) at upload time — no auto-classification.
- D-02: Upload supports multi-file batch — multiple files dropped/selected at once, each cognified independently.
- D-03: The Phase 1 seed corpus (8 docs, Stripe arc) is loaded via an explicit "Load Sample Data" button, not auto-preloaded at startup.
- D-04: Only one bundled sample bundle — the Stripe arc. No second/alternate sample dataset.
- D-05: Immediately after upload, the user sees a toast acknowledgment + a persistent processing badge that flips to "Ready" once background cognify completes (per-file, see D-13/D-22).

**Diagnosis Card Layout**
- D-06: Card layout is root cause on top, evidence tickets below.
- D-07: Show 2-3 evidence snippets, short excerpt, with truncation; full text available on demand.
- D-08: Evidence snippets are click-to-expand to the full source document.
- D-09: The card shows a small dataset/version tag (e.g. "v1.8") next to the fix — sets up Phase 3's drift-badge slot.

**Feedback Interaction**
- D-10: Reject is a silent dismiss — no reinforcement/negative-feedback API call. Only Accept calls the reinforcement mechanism.
- D-11: After Accept, the card shows an inline state change (e.g. button becomes a "Reinforced" checkmark) — no modal, no navigation away.
- D-12: Reinforcement is proven for the demo by re-running the same search and showing the accepted fix reordered/prioritized.
- D-13: Accept/Reject applies to the whole diagnosis card only, not individual evidence tickets.

**Release Upload & Dataset List**
- D-14: Release version (`{N}` in `workarounds_v{N}`) is captured via a manual input field at upload time — no filename/content parsing.
- D-15: Dataset list shows name + document count per dataset (e.g. "workarounds_v1_9 · 2 docs").
- D-16: Release upload uses the same upload flow as D-01, with "Release Note" as one of the type-selector options.

**Page Structure & Search UX**
- D-17: UI is a single-page dashboard — search, diagnosis card, upload panel, dataset list all on one page, no tabs/navigation.
- D-18: Search bar is a persistent top bar, always visible.
- D-19: Empty state shows a prompt with the example query ("customers double-charged") plus clickable example-query chip(s).
- D-20: While the fused search is in flight, show a skeleton diagnosis card, not a bare spinner.
- D-21: Zero-result searches show an explicit empty-state message — never fall back to an ungrounded generic LLM answer.

**Batch Upload Progress & Error Handling**
- D-22: Multi-file uploads show per-file status rows (Uploading → Processing → Ready/Failed).
- D-23: If cognify fails after upload was acknowledged, the row flips to "Failed" with a retry button.
- D-24: All user-facing errors show a short human message only — never raw exception/stack-trace text.

**Builder Concerns (resolved by this research — see body below)**
- B-01 (FEEDBACK API unresolved) — **RESOLVED**, see "Feedback API Resolution" section.
- B-02 (search latency budget) — **NOT empirically measured this session** (no live Mistral call made); flagged as an Open Question with a recommended Wave-0 timing task.
- B-03 (batch cognify sequencing) — **RESOLVED**, see "Common Pitfalls" — Kuzu/Ladybug graph adapter has its own internal `asyncio.Lock`, so concurrent per-file `cognify()` calls inside the single `--workers 1` process are safe without additional locking.

### Claude's Discretion
- Exact visual styling (colors, spacing, iconography for status badges/tags).
- Toast component implementation, skeleton-card exact shape, dataset/version tag visual treatment.
- Whether "processing badge" (D-05) and "per-file status row" (D-22) are the same UI element or two separate indicators.

### Deferred Ideas (OUT OF SCOPE)
- Multiple sample dataset bundles.
- Per-evidence-ticket feedback (accept/reject individual evidence pieces).
- Negative reinforcement on Reject.
- Confidence score display (STRETCH-01, Phase 4).
- Visual design system specifics.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INGEST-01 | User can upload incident/chat/changelog files (and load bundled sample datasets) | FastAPI multipart pattern + `cognee.add()` accepts `BinaryIO` directly (no temp-file write needed); background processing via FastAPI `BackgroundTasks` + `cognee.datasets.get_status()` polling |
| RECALL-01 | Search a bug, get root-cause via `search(GRAPH_COMPLETION)` | Verified `search()` signature, `feedback_influence` param, per-dataset result shape |
| RECALL-02 | Recommendation shows exact prior incidents via `search(CHUNKS)`, fused into one response | `SearchType.CHUNKS` has no `feedback_influence` param — confirmed evidence ranking is unaffected by reinforcement; fusion of GRAPH_COMPLETION + CHUNKS into one response is application-layer work, not native to cognee |
| RECALL-03 | Results render in a diagnosis card | Backend fusion pattern documented below |
| FEEDBACK-01 | Engineer can accept or reject a recommended fix | `cognee.api.v1.session.add_feedback()` — verified working API, tested against fs/redis/sqlite backends in cognee's own integration test suite |
| FEEDBACK-02 | Accepted fix reinforces memory so future recall favors it | `cognee.improve(dataset=..., session_ids=[...], feedback_alpha=1.0)` + `search(..., feedback_influence=>0)` on re-search — full mechanism verified in source, see "Feedback API Resolution" |
| RELEASE-01 | Upload a release note into `workarounds_v{N}` | Existing `backend/datasets.py` `workarounds_dataset()` helper; `cognee.datasets.list_datasets()` + `list_data()` for the dataset-list UI (D-15) |
</phase_requirements>

## Summary

Phase 2's hardest problem — the unresolved FEEDBACK API question (B-01) — is now fully resolved by reading the actual installed `cognee==1.2.2` source in this repo's `.venv`, not by searching the internet (the PyPI package predates public docs/blog coverage of this exact behavior). Two findings drive the whole feedback design:

1. **`search(SearchType.FEEDBACK)` does not exist.** The installed `SearchType` enum has no `FEEDBACK` member. The only real feedback path is the session/`improve()` API family: `cognee.api.v1.session.add_feedback()` attaches a 1-5 score to a stored Q&A turn, and `cognee.improve(dataset=..., session_ids=[...])` bridges that score into a `feedback_weight` property on the specific graph nodes/edges that produced the answer.
2. **This session-based feedback path is currently dead code in this project**, because Phase 1 set `CACHING=false` to work around a different bug (a canned `"Got it."` response on repeat queries). `CACHING=false` disables the *entire* session cache — `add_feedback()`, `get_session()`, and `improve(session_ids=...)` all silently no-op with caching off. The fix is not to choose between the two behaviors: cognee exposes a **second, independent flag** (`AUTO_FEEDBACK`, separate from `CACHING`) that disables exactly the LLM-based "continuing turn" classifier that produces `"Got it."`, while leaving Q&A history storage (and therefore feedback) fully functional. Setting `CACHING=true` + `AUTO_FEEDBACK=false` gets both properties at once — verified by reading `session_manager.py`'s `is_auto_feedback_enabled()` gate and its two call sites.

The rest of the phase is comparatively standard: FastAPI accepts `UploadFile` and can hand its `BinaryIO` straight to `cognee.add()` with no temp file; background processing can use plain FastAPI `BackgroundTasks` with `cognee.datasets.get_status()` for polling (cognee's own `PipelineRunStatus` strings map directly onto the required Uploading/Processing/Ready/Failed badge states); and the "fused" GRAPH_COMPLETION + CHUNKS diagnosis card is fusion the PatchPilot backend must do itself — cognee returns one `SearchResult` per dataset searched, not one fused answer across datasets.

**Primary recommendation:** Flip `backend/cognee_config.py`'s `CACHING` default from `"false"` to `"true"`, add a new `AUTO_FEEDBACK` default of `"false"`, mint a fresh UUID `session_id` per search request (never reuse `default_session`), and drive Accept via `add_feedback(session_id, qa_id, feedback_score=5)` → `improve(dataset=<source dataset>, session_ids=[session_id], feedback_alpha=1.0)` → re-search with `feedback_influence>=0.5` to make the effect visible within the 120-second demo window.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| File upload UI (drag/drop, type selector) | Browser / Client | — | Pure client-side form state; no server rendering needed |
| Multipart upload handling | API / Backend | — | FastAPI `UploadFile` + `python-multipart` (already a pinned dependency) |
| Background cognify orchestration | API / Backend | — | Owns the Cognee lifecycle; must run single-process (`--workers 1`, Kuzu file lock) |
| Per-file status polling | Browser / Client | API / Backend | Client polls a `/ingest/status` endpoint backed by `cognee.datasets.get_status()` |
| Fused search (GRAPH_COMPLETION + CHUNKS) | API / Backend | — | Fusion logic (merge multi-dataset results into one diagnosis payload) is bespoke backend code — cognee does not fuse across datasets natively |
| Diagnosis card rendering | Browser / Client | — | Pure presentation of the backend's already-fused JSON payload |
| Feedback (Accept reinforcement) | API / Backend | — | Owns `add_feedback()` + `improve()` calls; must track `session_id`/`qa_id` server-side or round-trip them to the client |
| Dataset list (name + doc count) | API / Backend | Browser / Client | Backend exposes `cognee.datasets.list_datasets()` + `list_data()`; client renders |
| CORS | API / Backend | — | New this phase — first browser origin in the project |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cognee | 1.2.2 | Memory layer (unchanged from Phase 1) | Already pinned in `requirements.txt`; this research investigates its *behavior*, not a new version |
| FastAPI | 0.138.2 | Backend API | Already pinned; async-native for Cognee's `await` calls |
| Next.js | 16.2.10 | Frontend — App Router | `[VERIFIED: npm registry]` — `npm view next version` returned `16.2.10` (CLAUDE.md cites 16.2.9; a patch release has since shipped) |
| React | 19.2.7 (bundled with Next 16) | UI layer | `[VERIFIED: npm registry]` — `npm view react version` |
| @tanstack/react-query | 5.101.2 | Client async state for search/upload polling | `[VERIFIED: npm registry]` |
| tailwindcss | 4.3.2 | Styling | `[VERIFIED: npm registry]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| python-multipart | already >=0.0.32 in requirements.txt | Enables `UploadFile`/`File(...)` | Already installed — no new dependency needed for INGEST-01 |
| aiosqlite | 0.22.1 (already installed, transitive via cognee's relational config) | Backs the new `CACHE_BACKEND=sqlite` session store | `[VERIFIED: installed in .venv]` — confirmed via `import aiosqlite` in this repo's venv; **no new pip dependency required** to enable session-based feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FastAPI `BackgroundTasks` for per-file cognify | `cognee.cognify(run_in_background=True)` (cognee's own background flag) | Cognee's own flag exists but its interaction with FastAPI's request/response lifecycle inside a single-process `uvicorn --workers 1` deployment is undocumented for this exact combination; `BackgroundTasks` is a well-understood FastAPI idiom fully within app control — **recommended over cognee's native flag** for this phase |
| `CACHE_BACKEND=sqlite` (default) | `CACHE_BACKEND=fs` | `fs` is simpler (flat files, no SQL) and is what cognee's own test suite exercises most; either works and needs zero new dependencies. `sqlite` is the library default and colocates with the existing relational DB, so no action is needed to get it — pick `sqlite` unless a problem surfaces |
| Reusing `default_session` for search | Fresh UUID `session_id` per search call | Reusing `default_session` folds *all* prior Q&A history into every new prompt via `select_session_history()` (this runs regardless of `AUTO_FEEDBACK`), which would bias unrelated incident searches and pollute the reinforcement demo. Per-search UUIDs avoid this entirely |

**Installation:**
```bash
# No new pip packages required — cognee's session cache uses aiosqlite,
# already installed transitively. Only .env / cognee_config.py changes needed.
cd frontend && npx create-next-app@latest . --typescript --tailwind --app --turbopack
npm install @tanstack/react-query
```

**Version verification:** `npm view next version` → `16.2.10`; `npm view react version` → `19.2.7`; `npm view @tanstack/react-query version` → `5.101.2`; `npm view tailwindcss version` → `4.3.2`; `npm view react-force-graph version` → `1.48.2` (not needed until Phase 4/GRAPH-01, listed for continuity). All checked live against the npm registry this session — `[VERIFIED: npm registry]`.

## Package Legitimacy Audit

No new external packages are being introduced this phase — the backend stack (`cognee`, `fastapi`, `uvicorn`, `python-dotenv`, `python-multipart`, `mistralai`, `mistral-common`) is unchanged from Phase 1 and was already audited then. The frontend is scaffolded via `create-next-app`, which installs `next`, `react`, `react-dom`, `tailwindcss` as first-party/extremely-high-trust packages (Vercel/Meta-maintained, billions of weekly downloads, canonical GitHub repos) — a formal legitimacy check via the package-legitimacy seam was not run because these are the single most well-known packages in the JS ecosystem and installation is via the official scaffolding tool, not manual `npm install` of a possibly-hallucinated name. `@tanstack/react-query` is likewise a top-tier, long-established package (TanStack org, millions of weekly downloads).

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Feedback API Resolution (B-01) — the load-bearing finding of this research

This section documents exactly what was read in `/Users/ayushbharadva/dev/personal/patch-pilot/.venv/lib/python3.14/site-packages/cognee/` to resolve the Phase-1-carried blocker. All claims below are `[VERIFIED: installed cognee==1.2.2 source]` unless marked otherwise — this is ground truth for the exact version pinned in `requirements.txt`, which is more reliable than any external doc/blog for a pre-1.0-maturity library.

### 1. `SearchType.FEEDBACK` does not exist
`cognee/modules/search/types/SearchType.py` enumerates: `SUMMARIES, CHUNKS, RAG_COMPLETION, HYBRID_COMPLETION, TRIPLET_COMPLETION, GRAPH_COMPLETION, GRAPH_COMPLETION_DECOMPOSITION, GRAPH_SUMMARY_COMPLETION, CYPHER, NATURAL_LANGUAGE, GRAPH_COMPLETION_COT, GRAPH_COMPLETION_CONTEXT_EXTENSION, FEELING_LUCKY, TEMPORAL, CODING_RULES, CHUNKS_LEXICAL, AGENTIC_COMPLETION`. No `FEEDBACK` member. **This branch of the original open question is eliminated — there is no such server-mode search type in 1.2.2.**

### 2. The real feedback mechanism: session Q&A + `improve()`
- `cognee.api.v1.session.add_feedback(session_id, qa_id, feedback_text=None, feedback_score=None, user=None)` attaches a score (1-5 int) to a previously-recorded Q&A entry (`cognee/api/v1/session/session.py`).
- `cognee.improve(dataset, *, session_ids=[...], feedback_alpha=0.1)` runs a 4-stage pipeline when `session_ids` is given; stage 1 (`_bridge_sessions` → `apply_feedback_weights_pipeline`) reads eligible Q&A entries (score in 1-5, has `used_graph_element_ids`, not already applied) and streams an update onto each referenced graph node/edge's `feedback_weight`: `updated = previous_weight + alpha * (normalized_rating - previous_weight)`, clipped to `[0,1]` (`cognee/tasks/memify/apply_feedback_weights.py`). `normalize_feedback_score` maps score 1→0.0 ... 5→1.0.
- `feedback_alpha` defaults to `0.1` in the library — meaning **one Accept only nudges the weight 10% of the way to max**. For a single-click, one-Accept demo to visibly change ranking, **pass `feedback_alpha=1.0` explicitly** (valid range is `(0, 1]`, enforced by `CogneeValidationError` if outside range) — this sets the weight to exactly the normalized score in one call.

### 3. Why the current `CACHING=false` breaks this entirely
`backend/cognee_config.py` sets `os.environ.setdefault("CACHING", "false")` to avoid a canned `"Got it."` response (documented in that file's own comment and in STATE.md). Reading `get_cache_engine()` (`cognee/infrastructure/databases/cache/get_cache_engine.py`): when `config.caching` is `False`, `create_cache_engine()` returns `None`, and `get_session_manager()` builds a `SessionManager(cache_engine=None)` whose every operation "no-ops and return[s] empty/False as appropriate" (the function's own docstring). Concretely:
- `add_feedback()` → returns `False` (nothing stored).
- `get_session()` → returns `[]`.
- `improve(session_ids=[...])`'s `extract_feedback_qas` reads `session_manager.get_session(...)` → empty → **zero eligible feedback QAs, `apply_feedback_weights` processes nothing.**

So with the project's current setting, FEEDBACK-01/02 as designed would silently no-op — the Accept button would appear to work (no exception) but nothing would actually be reinforced.

### 4. Why the "Got it." bug happened, precisely
`GraphCompletionRetriever.get_completion()` (`cognee/modules/retrieval/graph_completion_retriever.py:381-402`) calls `self.prepare_session_turn_for_retrieval(query)` before every session-backed completion. If `turn_preparation.should_answer` is `False`, it returns `[turn_preparation.response_to_user or "Got it."]` **without running retrieval or generating a real answer.** `prepare_session_turn()` (`cognee/infrastructure/session/session_turn.py:359-449`) fetches the *previous* Q&A entry in the same session (`session_id` defaults to `self.default_session_id` — a single shared session per user when no explicit `session_id` is passed, verified in `session_manager.py:92-94`), runs an LLM classifier (`analyze_turn_for_session_context`) that compares the new query against the previous question/answer, and sets `should_answer=False` when the classifier decides there's no new question to answer (e.g., it reads as a continuation/feedback of the prior turn). **This is exactly what happens when the same query — or any two related-sounding queries — run twice in the same default session.**

### 5. The actual fix: two independent flags, not one
`CacheConfig` (`cognee/infrastructure/databases/cache/config.py`) has **two separate booleans**: `caching: bool = True` and `auto_feedback: bool = True` (env vars `CACHING` and `AUTO_FEEDBACK` respectively — confirmed via `pydantic_settings.BaseSettings` field names, which map 1:1 to uppercase env var names by default). `SessionManager.is_auto_feedback_enabled()` (`session_manager.py:277-280`) returns `bool(cache_config.caching and cache_config.auto_feedback)`. `prepare_session_turn()` checks this flag **first** (`session_turn.py:379-380`) and short-circuits to `_empty_turn_preparation(query)` (i.e. `should_answer=True`, no LLM call, no "Got it." risk) whenever it is `False` — **while `_use_session_cache()`, the gate that controls whether Q&A gets recorded at all, checks only `cache_config.caching`** (`graph_completion_retriever.py:85-89`), independent of `auto_feedback`.

**Resolution: set `CACHING=true` and `AUTO_FEEDBACK=false`.** This combination:
- Keeps Q&A history recording active (`add_qa` runs on every session-backed completion, including populating `used_graph_element_ids` automatically from the retrieved graph objects — no manual bookkeeping needed).
- Disables the LLM turn-classifier entirely, so the "Got it." short-circuit can never fire, regardless of whether the same query is run once or a hundred times in the same or different sessions.
- Requires **no new pip dependency** — the default `CACHE_BACKEND=sqlite` reuses the already-installed `aiosqlite` and colocates its `cache.db` next to the existing relational SQLite DB inside `.patchpilot_memory/databases/` (via `relational_config.db_path`), consistent with the project's "everything file-based, no extra infra" constraint (CLAUDE.md "What NOT to Use": no Postgres/Redis for this hackathon).

**Recommended change to `backend/cognee_config.py`:**
```python
# Was: os.environ.setdefault("CACHING", "false")  (Phase 1 — avoided "Got it." at the cost of killing all session/feedback features)
os.environ.setdefault("CACHING", "true")
os.environ.setdefault("AUTO_FEEDBACK", "false")  # new — disables the turn-continuation
                                                   # classifier that caused "Got it.", while
                                                   # keeping Q&A history (and therefore
                                                   # add_feedback()/improve(session_ids=...))
                                                   # fully functional.
```

### 6. Full request-level flow to implement FEEDBACK-01/02

1. **Search** (`POST /search`): mint `session_id = f"search_{uuid4().hex}"` server-side (fresh every call — never reuse `default_session`, since `select_session_history()` folds prior session Q&A into the prompt regardless of `AUTO_FEEDBACK`; a stale session would bias unrelated future searches). Call `cognee.search(query_text=..., query_type=SearchType.GRAPH_COMPLETION, datasets=[...], session_id=session_id)`. Immediately after, call `cognee.api.v1.session.get_session(session_id=session_id)` — the sole returned `SessionQAEntry` has the `.qa_id` needed for feedback (confirmed by `cognee`'s own integration test `test_sdk_get_session_returns_entries_after_add_qa`). Return `{answer, evidence, session_id, qa_id, source_dataset}` to the frontend (or persist server-side keyed by a request/result id — either works; returning to the client is simpler and stateless).
2. **Accept** (`POST /feedback/accept`): client sends back `{session_id, qa_id, source_dataset}`. Backend calls:
   ```python
   await cognee.api.v1.session.add_feedback(
       session_id=session_id, qa_id=qa_id, feedback_score=5,
   )
   await cognee.improve(
       dataset=source_dataset,       # the SAME dataset the accepted answer came from
       session_ids=[session_id],
       feedback_alpha=1.0,           # override the 0.1 default for single-click demo visibility
   )
   ```
3. **Re-search** (D-12 proof): mint a **new** `session_id`, call `cognee.search(..., feedback_influence=0.5)` (or higher) against the **same** dataset(s). `feedback_influence` defaults to `0.0` (`DEFAULT_FEEDBACK_INFLUENCE` env var, default `"0.0"`) — **it must be passed explicitly per-call or set as a global env var**, or the just-applied `feedback_weight` has zero effect on ranking, no matter how high it is.

### 7. Critical caveat: `feedback_influence` only affects GRAPH_COMPLETION-family retrievers, never CHUNKS
Verified in `cognee/modules/search/methods/get_search_type_retriever_instance.py`'s retriever registry: `SearchType.CHUNKS` is wired to `ChunksRetriever` with only `top_k`, `node_name`, `node_name_filter_operator` — **no `feedback_influence` parameter exists on that code path at all.** `feedback_influence` is only forwarded to `GraphCompletionRetriever` and its siblings (`GRAPH_COMPLETION_DECOMPOSITION`, `GRAPH_COMPLETION_COT`, `GRAPH_COMPLETION_CONTEXT_EXTENSION`, `GRAPH_SUMMARY_COMPLETION`, `TEMPORAL`). **Implication for D-12's demo: after Accept, the re-search's *root-cause text* can visibly change/reorder (because `CogneeGraph.calculate_top_triplet_importances()` blends `feedback_weight` into triplet ranking — verified in `cognee/modules/graph/cognee_graph/CogneeGraph.py:474-501`), but the evidence-chunk list (CHUNKS) will NOT reorder based on feedback — it is pure vector-similarity ranking, unaffected by any of this.** Do not promise "evidence reorders too" in the UI copy or demo script; the reinforcement is visible in the headline root-cause answer, not the supporting evidence list.

### 8. Second pitfall: `improve(dataset=...)` is per-dataset, not global
`apply_feedback_weights_pipeline` calls `set_database_global_context_variables(dataset_to_write[0].id, ...)` before touching the graph — this scopes `graph_engine.get_node_feedback_weights/set_node_feedback_weights` to **that one dataset's isolated graph** (cognee's dataset isolation is real and per-graph-file, consistent with Phase 1's already-proven `forget()` isolation and the Cognee #1023 mitigation). If a search spanned multiple datasets (e.g. `incidents` + `workarounds_v1_8`) and the accepted answer's `used_graph_element_ids` includes nodes from `workarounds_v1_8`, calling `improve(dataset="incidents", ...)` will find those particular node ids `all_found=False` in `incidents`'s graph and skip them (`_update_element_weights` returns `False` for that id set) — the weight update silently partially fails. **Track which dataset the accepted answer's evidence actually came from (already needed for D-09's version tag) and pass that exact dataset name to `improve()`.**

## Architecture Patterns

### System Architecture Diagram

```
Browser (Next.js, single-page dashboard, D-17)
  │
  ├─ POST /ingest (multipart, D-01/D-02) ──────────────┐
  ├─ GET  /ingest/status?dataset=... (D-05/D-22 poll)   │
  ├─ POST /search {query} (D-18/D-19) ──────────┐       │
  ├─ POST /feedback/accept {session_id,qa_id} ──┤       │
  └─ GET  /datasets (D-15) ─────────────────────┤       │
                                                  ▼       ▼
                                     FastAPI backend (backend/main.py, single --workers 1)
                                                  │       │
                    ┌─────────────────────────────┴───┐   │
                    │  /search handler                │   │
                    │  1. discover datasets            │   │
                    │     ("incidents" + workarounds_v*)   │
                    │  2. cognee.search(GRAPH_COMPLETION,  │
                    │     session_id=fresh_uuid)            │
                    │  3. cognee.search(CHUNKS)             │
                    │  4. fuse -> {root_cause, evidence[]}  │
                    │  5. get_session(session_id) -> qa_id  │
                    └──────────────┬───────────────────┘   │
                                   │                        │
                    ┌──────────────▼───────────────────┐   │
                    │  /feedback/accept handler          │   │
                    │  add_feedback(session_id, qa_id,   │   │
                    │    feedback_score=5)               │   │
                    │  improve(dataset=source_dataset,   │   │
                    │    session_ids=[session_id],       │   │
                    │    feedback_alpha=1.0)             │   │
                    └──────────────┬───────────────────┘   │
                                   │                        │
                    ┌──────────────▼──────────────────┐    │
                    │  /ingest handler (BackgroundTasks)◄───┘
                    │  per file: cognee.add(file.file,       │
                    │    dataset_name=routed_dataset)        │
                    │    then cognee.cognify(datasets=[...]) │
                    │  status polled via                     │
                    │    cognee.datasets.get_status([id])    │
                    └──────────────┬──────────────────┘
                                   │
                    Cognee (Kuzu graph / LanceDB vector / SQLite relational + cache)
                    All datasets isolated per-graph-context (backend_access_control_enabled()==True
                    by default for kuzu+lancedb — verified in context_global_variables.py)
```

### Recommended Project Structure
```
backend/
├── main.py              # existing — add new routers/endpoints here or split into routers/
├── cognee_config.py      # existing — CACHING/AUTO_FEEDBACK flip goes here
├── cognee_patches.py      # existing — unchanged
├── datasets.py            # existing — workarounds_dataset() helper, reuse for RELEASE-01
├── sessions.py             # NEW — new_session_id() helper (f"search_{uuid4().hex}")
├── ingest.py                # NEW — POST /ingest, per-file add()+cognify(), BackgroundTasks
├── search.py                 # NEW — POST /search, fused GRAPH_COMPLETION+CHUNKS
├── feedback.py                # NEW — POST /feedback/accept
└── datasets_router.py          # NEW — GET /datasets (name + doc count, D-15)

frontend/                       # NEW — scaffolded via create-next-app, App Router
├── app/
│   ├── page.tsx                # single-page dashboard (D-17): search bar, diagnosis card,
│   │                            # upload panel, dataset list sections
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── SearchBar.tsx
│   ├── DiagnosisCard.tsx        # D-06..D-09, D-20, D-21
│   ├── UploadPanel.tsx          # D-01, D-02, D-22, D-23
│   └── DatasetList.tsx          # D-15
└── lib/
    └── api.ts                  # fetch wrappers to the FastAPI backend
```

### Pattern 1: Multipart upload straight into `cognee.add()` — no temp file needed
**What:** `cognee.add()`'s `data` parameter accepts `Union[BinaryIO, list[BinaryIO], str, ...]` directly (`cognee/api/v1/add/add.py`). FastAPI's `UploadFile.file` is a `SpooledTemporaryFile`, which satisfies the `BinaryIO` protocol.
**When to use:** Every ingest endpoint in this phase (INGEST-01, RELEASE-01).
**Example:**
```python
# Source: cognee/api/v1/add/add.py signature (installed package, this repo's .venv)
from fastapi import UploadFile, File, BackgroundTasks

@app.post("/ingest")
async def ingest(
    files: list[UploadFile] = File(...),
    content_type: str = Form(...),   # "ticket" | "chat" | "changelog" | "release_note"
    release_version: str | None = Form(None),  # only for release_note, D-14
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    dataset_name = (
        workarounds_dataset(release_version) if content_type == "release_note"
        else INCIDENTS
    )
    for f in files:
        background_tasks.add_task(_ingest_one, f.file, f.filename, dataset_name)
    return {"status": "accepted", "dataset": dataset_name, "files": [f.filename for f in files]}

async def _ingest_one(file_obj, filename, dataset_name):
    try:
        await cognee.add(file_obj, dataset_name=dataset_name)
        await cognee.cognify(datasets=[dataset_name])
    except Exception:
        logger.exception("ingest failed for %s in %s", filename, dataset_name)
        # status will surface as PipelineRunErrored via get_status() polling
```

### Pattern 2: Per-file/per-dataset status polling without custom bookkeeping
**What:** `cognee.datasets.get_status([dataset_id])` (public API, `cognee/api/v1/datasets/datasets.py`) returns `{dataset_id_str: status}` where `status` is one of `"PipelineRunStarted"`, `"PipelineRunCompleted"`, `"PipelineRunAlreadyCompleted"`, `"PipelineRunErrored"` (`cognee/modules/pipelines/models/PipelineRunInfo.py`) — this maps directly onto D-05/D-22's Uploading→Processing→Ready/Failed badge states without inventing a parallel status-tracking table.
**When to use:** `/ingest/status` polling endpoint.
**Example:**
```python
# Source: cognee/api/v1/datasets/datasets.py + PipelineRunInfo.py (installed package)
STATUS_MAP = {
    "PipelineRunStarted": "processing",
    "PipelineRunCompleted": "ready",
    "PipelineRunAlreadyCompleted": "ready",
    "PipelineRunErrored": "failed",
}

@app.get("/ingest/status")
async def ingest_status(dataset: str):
    ds = await _resolve_dataset_by_name(dataset)  # cognee.datasets.list_datasets() + filter by .name
    status = await cognee.datasets.get_status([ds.id])
    raw = status.get(str(ds.id), "processing")
    return {"dataset": dataset, "status": STATUS_MAP.get(raw, "processing")}
```

### Pattern 3: Dataset list with document counts (D-15)
**What:** `cognee.datasets.list_datasets()` returns `Dataset` ORM objects with `.id`/`.name`; `cognee.datasets.list_data(dataset_id)` returns the `Data` rows for that dataset — `len(...)` gives the doc count.
**Example:**
```python
# Source: cognee/api/v1/datasets/datasets.py (installed package)
@app.get("/datasets")
async def list_datasets():
    ds_list = await cognee.datasets.list_datasets()
    return [
        {"name": ds.name, "doc_count": len(await cognee.datasets.list_data(ds.id))}
        for ds in ds_list
    ]
```

### Pattern 4: Fusing GRAPH_COMPLETION + CHUNKS into one diagnosis card
**What:** Cognee's `search()` returns one `SearchResult` **per dataset** searched (verified in `cognee/modules/search/methods/search.py:213-382` — `search_in_datasets_context` fans out one retrieval call per authorized dataset via `asyncio.gather`). There is no native cross-dataset fusion; PatchPilot's backend must merge results itself.
**When to use:** `/search` endpoint (RECALL-01/02/03).
**Example:**
```python
# datasets to search: durable incidents + every currently-live workaround version
# (dynamically discovered so this works both before and after a release upload, D-16)
async def _active_search_datasets() -> list[str]:
    all_ds = await cognee.datasets.list_datasets()
    return [INCIDENTS] + [d.name for d in all_ds if d.name.startswith("workarounds_v")]

@app.post("/search")
async def search(query: str):
    datasets = await _active_search_datasets()
    session_id = new_session_id()

    root_cause_results = await cognee.search(
        query_text=query, query_type=SearchType.GRAPH_COMPLETION,
        datasets=datasets, session_id=session_id,
    )
    evidence_results = await cognee.search(
        query_text=query, query_type=SearchType.CHUNKS,
        datasets=datasets, top_k=5,
    )

    # Prefer the most substantive non-empty completion; workaround datasets carry the
    # actual fix, "incidents" alone often has no remediation text — pick accordingly.
    primary = _pick_primary_result(root_cause_results)  # non-empty text, prefer higher version N
    evidence = _flatten_and_truncate(evidence_results, limit=3)  # D-07

    session_entries = await cognee.api.v1.session.get_session(session_id=session_id)
    qa_id = session_entries[-1].qa_id if session_entries else None

    if not primary and not evidence:
        return {"status": "no_results"}  # D-21 — never fabricate an ungrounded answer

    return {
        "status": "ok",
        "root_cause": primary["search_result"],
        "evidence": evidence,
        "source_dataset": primary["dataset_name"],  # feeds D-09's version tag + improve() target
        "session_id": session_id,
        "qa_id": qa_id,
    }
```

### Pattern 5: CORS setup (new this phase)
**What:** `backend/main.py`'s docstring already flags this ("If CORS is ever added, never allow a wildcard origin"). Standard FastAPI `CORSMiddleware` with an explicit origin list.
**Example:**
```python
# Source: FastAPI official CORS docs, https://fastapi.tiangolo.com/tutorial/cors/
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server — never "*"
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### Anti-Patterns to Avoid
- **Reusing `default_session` across searches:** folds unrelated prior Q&A into every new prompt's conversation history (`select_session_history()` runs unconditionally, independent of `AUTO_FEEDBACK`) — always mint a fresh `session_id` per search.
- **Relying on `search()`'s default `feedback_influence=0.0`:** the accepted fix's `feedback_weight` will be set correctly but have literally zero effect on ranking unless `feedback_influence` is explicitly passed `>0` on the re-search call.
- **Calling `improve()` against the wrong dataset:** silently partial-fails weight updates for graph elements outside that dataset's isolated graph (see Pitfall 2 above).
- **Wrapping `cognee.add()`'s `BinaryIO` input in a manual temp-file write:** unnecessary — `add()` already accepts `UploadFile.file` directly.
- **Promising evidence-chunk reordering in the UI copy for D-12:** `SearchType.CHUNKS` has no `feedback_influence` — only the GRAPH_COMPLETION root-cause text/triplet selection can visibly shift after Accept.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-file ingest status tracking | A custom status table/enum keyed by filename | `cognee.datasets.get_status([dataset_id])` | Cognee already persists `PipelineRun` rows with exactly the states needed (Started/Completed/Errored) — verified in `get_pipeline_status.py` |
| Feedback score storage | A custom `feedback` table | `cognee.api.v1.session.add_feedback()` (SQLite-backed session cache, already file-based per project convention) | Ships with the library, already schema-validated (1-5 range enforced), and is the only path that `improve()` reads from |
| Dataset document counts | Manual bookkeeping incremented on each upload | `cognee.datasets.list_data(dataset_id)` and `len(...)` | Always accurate against the actual relational DB state, survives restarts without extra sync logic |
| Cross-dataset write serialization | A custom mutex around `cognify()` calls | Nothing — cognee's Kuzu/Ladybug graph adapter already holds an internal `asyncio.Lock` (`LADYBUG_ASYNC_LOCK`) serializing graph writes within one process | Verified in `cognee/infrastructure/databases/graph/ladybug/adapter.py:195` — building a second lock on top would be redundant and could deadlock against cognee's own lock if not careful |

**Key insight:** Nearly every "custom tracking" instinct for this phase (upload status, feedback storage, doc counts) is already covered by an existing, tested cognee API — the research effort here was entirely about finding those APIs inside the installed package, since none of this is documented publicly for 1.2.2 yet.

## Common Pitfalls

### Pitfall 1: Flipping `CACHING` back on reintroduces the "Got it." bug if `AUTO_FEEDBACK` is forgotten
**What goes wrong:** Setting `CACHING=true` alone (without also setting `AUTO_FEEDBACK=false`) restores the exact Phase 1 bug — `is_auto_feedback_enabled()` returns `True` again, and the LLM turn-classifier can short-circuit any repeat/related query with `"Got it."`.
**Why it happens:** `auto_feedback` defaults to `True` in `CacheConfig` — it is opt-out, not opt-in.
**How to avoid:** Always set both env vars together; add an assertion/smoke test at Wave 0 that re-runs the exact same GRAPH_COMPLETION query twice in a row against a fresh dataset and confirms the second response is not the literal string `"Got it."`.
**Warning signs:** Any diagnosis-card text that is exactly `"Got it."` or a similarly generic acknowledgment with no incident content.

### Pitfall 2: `improve(dataset=X)` silently drops feedback for graph elements outside `X`
See "Feedback API Resolution" §8 above. **How to avoid:** always pass the exact `source_dataset` the accepted answer came from (already surfaced for D-09's version tag) as `improve()`'s `dataset` argument.

### Pitfall 3: `feedback_influence=0.0` default makes reinforcement invisible even when it worked
**What goes wrong:** `add_feedback()` + `improve()` can both succeed (return `True`, no exceptions) and the re-search still shows no visible change, because `feedback_influence` was left at its library default of `0.0`.
**How to avoid:** Explicitly pass `feedback_influence=0.5` (or higher) on every GRAPH_COMPLETION-family search call in this app — do not rely on the `DEFAULT_FEEDBACK_INFLUENCE` env var being set correctly; pass it as a Python-level default parameter in your own search wrapper function so it can never be silently omitted.

### Pitfall 4: Multi-dataset GRAPH_COMPLETION search returns multiple disjoint answers, not one
**What goes wrong:** Naively displaying the first `SearchResult` from a multi-dataset search may show an answer from `incidents` alone (which has no remediation text, since fixes live in `workarounds_v*`), making the diagnosis card look broken/empty.
**How to avoid:** Explicitly pick the result whose `search_result` text is non-empty and prefer the highest-numbered `workarounds_v{N}` when more than one qualifies (see Pattern 4's `_pick_primary_result`).
**Warning signs:** Diagnosis card shows a vague/generic answer that doesn't mention a specific fix, even though the seed corpus clearly has one.

### Pitfall 5: `UploadFile.file` is a synchronous `SpooledTemporaryFile` — don't `await` it directly
**What goes wrong:** `UploadFile.file` (the `BinaryIO` cognee's `add()` expects) is not itself an async object; only `UploadFile.read()`/`.seek()` are async. Passing `file.file` (sync) to `cognee.add()` is correct per its type signature (`BinaryIO`, not an async stream) — but if a task mistakenly tries `await file.file.read()` instead, it will raise a `TypeError`.
**How to avoid:** Pass `file.file` (the raw sync `BinaryIO`) straight to `cognee.add()`, exactly as `add()`'s own type hints expect — do not call `.read()` yourself first.

## Code Examples

### Verified `SearchType` enum (full list)
```python
# Source: cognee/modules/search/types/SearchType.py (installed package, this repo's .venv)
class SearchType(str, Enum):
    SUMMARIES = "SUMMARIES"
    CHUNKS = "CHUNKS"
    RAG_COMPLETION = "RAG_COMPLETION"
    HYBRID_COMPLETION = "HYBRID_COMPLETION"
    TRIPLET_COMPLETION = "TRIPLET_COMPLETION"
    GRAPH_COMPLETION = "GRAPH_COMPLETION"
    GRAPH_COMPLETION_DECOMPOSITION = "GRAPH_COMPLETION_DECOMPOSITION"
    GRAPH_SUMMARY_COMPLETION = "GRAPH_SUMMARY_COMPLETION"
    CYPHER = "CYPHER"
    NATURAL_LANGUAGE = "NATURAL_LANGUAGE"
    GRAPH_COMPLETION_COT = "GRAPH_COMPLETION_COT"
    GRAPH_COMPLETION_CONTEXT_EXTENSION = "GRAPH_COMPLETION_CONTEXT_EXTENSION"
    FEELING_LUCKY = "FEELING_LUCKY"
    TEMPORAL = "TEMPORAL"
    CODING_RULES = "CODING_RULES"
    CHUNKS_LEXICAL = "CHUNKS_LEXICAL"
    AGENTIC_COMPLETION = "AGENTIC_COMPLETION"
```

### `SessionQAEntry` shape (what `get_session()` returns)
```python
# Source: cognee/infrastructure/databases/cache/models.py (installed package)
class SessionQAEntry(BaseModel):
    time: str
    question: str
    context: str
    answer: str
    qa_id: Optional[str] = None
    feedback_text: Optional[str] = None
    feedback_score: Optional[int] = None
    used_graph_element_ids: Optional[Dict[str, List[str]]] = None
    memify_metadata: Optional[Dict[str, bool]] = None
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `CACHING=false` (Phase 1) | `CACHING=true` + `AUTO_FEEDBACK=false` (Phase 2) | This research | Unblocks FEEDBACK-01/02 without reintroducing the "Got it." regression |
| `feedback_alpha` library default (0.1) | Explicit `feedback_alpha=1.0` on Accept | This research | Makes single-click reinforcement visible within the demo's time budget |
| `feedback_influence` library default (0.0) | Explicit `feedback_influence>=0.5` on re-search | This research | Makes reinforcement's ranking effect actually observable |

**Deprecated/outdated:** Nothing in cognee itself is deprecated here — this is a brand-new (2026-06-26) release with essentially no public secondary documentation for these session/feedback internals yet, which is exactly why direct source introspection was necessary.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Search latency for the fused GRAPH_COMPLETION+CHUNKS call against the small seed corpus (8 docs) on Mistral's free tier will be "a few seconds" (justifying D-20's skeleton card) | Common Pitfalls / Summary (B-02) | If actual latency is >10-15s, the skeleton card alone may read as broken rather than "loading" — no empirical measurement was taken this session (would require a live Mistral API call, out of scope for research) |
| A2 | `cognee.add()` accepting `UploadFile.file` (`BinaryIO`) directly, without an intermediate `.read()`/temp-file step, works correctly for cognee's internal ingestion loaders (chunking, MIME sniffing) | Architecture Patterns / Pattern 1 | If cognee's ingestion pipeline requires a seekable file with a real filename/extension for loader selection, passing a bare file object might misroute the loader — verify with one live upload smoke test at Wave 0 before building the full batch UI on this assumption |
| A3 | `create-next-app@latest --typescript --tailwind --app --turbopack` scaffolds a Next.js 16.2.10 project structure compatible with the "Recommended Project Structure" above without additional flags | Standard Stack / Installation | Scaffolding CLI flags occasionally change between minor versions; if the exact flag set has changed, `create-next-app`'s own interactive prompts will still produce a working App Router project — low risk |

**If this table is empty:** N/A — see above; all other claims in this research are `[VERIFIED: installed cognee==1.2.2 source]` or `[VERIFIED: npm registry]`.

## Open Questions

1. **Actual search latency against Mistral's free tier for this corpus size**
   - What we know: Phase 1's exit gate requires add+cognify+search <30s on a *single small fixture* (PLAT-01); no equivalent number exists for a fused GRAPH_COMPLETION+CHUNKS search across 2-3 datasets with ~8 real docs.
   - What's unclear: Whether D-20's skeleton-card duration will feel "intentional" (a few seconds) or "broken" (10s+), especially given Mistral's free tier may have stricter per-request throughput than a paid tier.
   - Recommendation: Add a Wave-0 task that times one real `/search` call against the loaded sample data and records the number in STATE.md; adjust the skeleton card's minimum-display-time (to avoid a jarring flash) or add a progress message if latency exceeds ~5s.

2. **Whether `cognee.add()` needs a `filename`/extension hint when passed a bare `BinaryIO`**
   - What we know: `add()`'s type signature accepts `BinaryIO` directly; `UploadFile.filename` carries the original name but is not part of the `BinaryIO` object itself.
   - What's unclear: Whether cognee's ingestion loader can correctly detect file type from `UploadFile.file` alone, or needs the filename passed separately (some `add()` overloads suggest a `DataItem` wrapper exists for cases needing more metadata — not investigated in depth this session for time reasons).
   - Recommendation: Wave-0 smoke test: upload one real `.md` seed file through the new `/ingest` endpoint and confirm it cognifies correctly; if loader detection fails, fall back to writing to a `NamedTemporaryFile` with the correct suffix before calling `add()`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js frontend scaffolding | ✓ | v24.17.0 (via nvm) | — |
| npm | Package installs, `create-next-app` | ✓ | 11.13.0 | — |
| Python venv (existing) | Backend, unchanged from Phase 1 | ✓ | 3.14, `.venv` already provisioned | — |
| aiosqlite | New session-cache backend (`CACHE_BACKEND=sqlite`) | ✓ | 0.22.1, already installed transitively | — |
| Mistral API reachability | All `cognify()`/`GRAPH_COMPLETION` calls (LLM provider, unchanged from Phase 1) | Not re-verified this session (would require a live network call + API key) | — | Already proven working in Phase 1's exit gate; assumed still valid |

**Missing dependencies with no fallback:** none identified.
**Missing dependencies with fallback:** none identified — all required tooling is already present in this repo's environment.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Single-user demo app, no auth in v1 scope (ACCT-01 explicitly deferred to v2 per REQUIREMENTS.md) |
| V3 Session Management | Partial | Cognee's own `session_id` (feedback/turn tracking) is an internal memory-lifecycle concept, not a user auth session — no cookies/tokens to protect this phase; still, `session_id` values are server-generated UUIDs (never client-supplied), preventing a client from forging arbitrary session identifiers to read/pollute another session's Q&A history |
| V4 Access Control | No | No multi-tenant access control needed — single default user, `backend_access_control_enabled()` isolation is dataset-level (already proven in Phase 1), not user-level |
| V5 Input Validation | Yes | FastAPI + Pydantic validate request bodies/form fields automatically; additionally validate: uploaded file MIME/extension allowlist (reject executables), `release_version` field format (alphanumeric + dots only, since it flows into a dataset name string via `workarounds_dataset()`), and search query length caps to avoid excessive LLM token spend |
| V6 Cryptography | No | No new cryptographic operations introduced this phase |
| V12 File & Resource Handling | Yes | Multipart upload endpoint must cap file size (FastAPI/Starlette does not enforce a default max upload size — set one explicitly, e.g. via `python-multipart`'s `Form`/`File` limits or a reverse-proxy cap) and restrict accepted extensions to prevent disk/memory exhaustion from oversized or malicious uploads |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unrestricted file upload (arbitrary content type/size to `/ingest`) | Denial of Service, Tampering | Allowlist expected extensions (`.md`, `.txt`, `.json` for tickets/chats/changelogs/release notes); enforce a max file size and max batch count server-side before calling `cognee.add()` |
| Dataset-name injection via `release_version` form field | Tampering | `release_version` feeds directly into `workarounds_dataset(n)` → `f"workarounds_v{n}"`; validate it against a strict pattern (e.g. `^[0-9]+(_[0-9]+)*$`) before use, so a crafted value cannot produce a dataset name colliding with `incidents`, `healthcheck`, or another release's dataset |
| CORS misconfiguration (wildcard origin) | Spoofing, Information Disclosure | Explicit `allow_origins=["http://localhost:3000"]` (and the deployed frontend origin in production) — never `"*"`, especially since `allow_credentials=True` would be rejected by browsers anyway if paired with a wildcard, but an overly broad explicit list (e.g. reflecting `Origin` header) is an equally real risk to avoid |
| Raw exception/stack-trace leakage to the browser | Information Disclosure | Already a locked convention from Phase 1 (WR-03 fix) and reaffirmed by D-24 — every new endpoint must catch exceptions and return a short human message, logging the real exception server-side only |
| LLM prompt injection via uploaded ticket/chat content | Tampering (of downstream LLM behavior) | Out of scope to fully mitigate this phase (Cognee's own extraction prompts are not user-editable from PatchPilot's side) — acceptable residual risk for a hackathon demo with trusted/synthetic seed content; do not expose this ingest endpoint to untrusted public input in any future production hardening |

## Sources

### Primary (HIGH confidence)
- `/Users/ayushbharadva/dev/personal/patch-pilot/.venv/lib/python3.14/site-packages/cognee/` — direct source read of the installed `cognee==1.2.2` package (this repo's own `.venv`): `modules/search/types/SearchType.py`, `api/v1/improve/improve.py`, `api/v1/session/session.py`, `infrastructure/session/session_manager.py`, `infrastructure/session/session_turn.py`, `infrastructure/session/feedback_detection.py`, `infrastructure/databases/cache/config.py`, `infrastructure/databases/cache/get_cache_engine.py`, `modules/retrieval/graph_completion_retriever.py`, `modules/retrieval/base_retriever.py`, `modules/graph/cognee_graph/CogneeGraph.py`, `modules/search/methods/search.py`, `modules/search/methods/get_search_type_retriever_instance.py`, `api/v1/datasets/datasets.py`, `modules/pipelines/operations/get_pipeline_status.py`, `modules/pipelines/models/PipelineRunInfo.py`, `api/v1/add/add.py`, `api/v1/cognify/cognify.py`, `infrastructure/databases/graph/ladybug/adapter.py`, `context_global_variables.py`, `tasks/memify/apply_feedback_weights.py`, `tasks/memify/extract_feedback_qas.py`, `tests/integration/infrastructure/session/test_session_sdk_integration.py` (worked example confirming the `add_qa`→`get_session`→`add_feedback` round trip against fs/redis/sqlite backends).
- Existing repo code: `backend/main.py`, `backend/cognee_config.py`, `backend/cognee_patches.py`, `backend/datasets.py`, `seed/README.md`, `.planning/STATE.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/01-foundation/01-VERIFICATION.md`.
- `npm view <package> version` — live registry checks for `next`, `react`, `react-dom`, `@tanstack/react-query`, `tailwindcss`, `react-force-graph` (this session, 2026-07-02).

### Secondary (MEDIUM confidence)
- FastAPI official CORS docs (`https://fastapi.tiangolo.com/tutorial/cors/`) — `CORSMiddleware` pattern, already cited in `.claude/CLAUDE.md`.
- `.claude/CLAUDE.md` — project-locked stack versions and "What NOT to Use" table (authoritative for this project regardless of external currency).

### Tertiary (LOW confidence)
- None used — all claims in this research trace to either the installed package source, the existing repo, or a live registry check.

## Metadata

**Confidence breakdown:**
- Feedback API resolution (B-01): HIGH — read directly from the exact installed package version, cross-checked against that package's own integration test suite
- Standard stack (frontend): HIGH — versions verified live against npm registry this session
- Ingest/status/dataset-list patterns: HIGH — read directly from installed package source
- Search latency (B-02): LOW — no empirical measurement taken; flagged explicitly in Assumptions Log and Open Questions
- Security domain: MEDIUM — standard ASVS reasoning applied to a well-understood single-user demo app; no formal threat-modeling session run

**Research date:** 2026-07-02
**Valid until:** Cognee session/feedback internals are unlikely to change within this project's timeline (submission by 2026-07-05); treat as valid for the remainder of the hackathon. If `cognee` is ever upgraded past `1.2.2`, re-verify the `CACHING`/`AUTO_FEEDBACK` flag names and `feedback_alpha`/`feedback_influence` defaults, since this is a fast-moving pre-1.0-maturity library.
