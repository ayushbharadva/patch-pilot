---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: milestone
current_phase: 02
current_phase_name: core-recall
status: executing
stopped_at: Completed 02-01-PLAN.md (fused /search + config keystone)
last_updated: "2026-07-02T06:49:57.081Z"
last_activity: 2026-07-02
last_activity_desc: Phase 02 execution started
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 8
  completed_plans: 5
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-30)

**Core value:** search → drift-detected → forget → re-search loop works visibly in under 60 seconds — PatchPilot is obviously impossible without Cognee's memory lifecycle
**Current focus:** Phase 02 — core-recall

## Current Position

Phase: 02 (core-recall) — EXECUTING
Plan: 2 of 4
Status: Ready to execute
Last activity: 2026-07-02 — Phase 02 execution started

Progress: [██████████] 100% (Phase 01 plans) — 25% of milestone (1 of 4 phases)

## Performance Metrics

**Velocity:**

- Total plans completed: 4
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P02 | 70min | 3 tasks | 6 files |
| Phase 01 P03 | 15min | 3 tasks | 9 files |
| Phase 01 P04 | 35min | 3 tasks | 2 files |
| Phase 02 P01 | 95min | 2 tasks | 9 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **LLM provider is now Mistral (free tier), superseding 01-01's Gemini decision.** Gemini's free-tier daily quota (20 req/day) was exhausted mid-Task-3; user chose Mistral over waiting ~24h or paying for OpenAI. `.env`: `LLM_PROVIDER=mistral`, `LLM_MODEL=mistral/mistral-small-latest`, `EMBEDDING_PROVIDER=mistral`, `EMBEDDING_MODEL=mistral/mistral-embed`, `EMBEDDING_DIMENSIONS=1024`. Both model names verified working via direct `litellm.acompletion`/`litellm.aembedding` calls (chat: "OK" response; embedding: 1024-dim vector) — no deprecated-name correction needed this time, unlike Gemini's in 01-01. Also auto-fixed (Rule 3): the leftover `LLM_API_KEY` (a stale Gemini key from 01-01) was still active in `.env` and would have been used for Mistral auth too, since cognee's `MistralAdapter` and its embedding-engine fallback both resolve `api_key` from the generic `llm_api_key` config field (not `MISTRAL_API_KEY`) — `LLM_API_KEY` was updated to match `MISTRAL_API_KEY`'s value.
- Roadmap: Dataset naming convention (incidents / workarounds_v{N}) must be locked in Phase 1 before any other code touches Cognee
- Roadmap: FEEDBACK-01/02 planned for Phase 2 — Day-1 spike on improve() API still required before Phase 2 planning begins (unresolved: improve(feedback_alpha=) vs search(SearchType.FEEDBACK))
- Roadmap: STRETCH-01..04 gated behind confirmed working core loop in Phase 4; cut in reverse order if time-boxed
- [Phase 01-02]: Pinned mistralai==1.12.4 and mistral-common==1.11.5 (not latest) -- mistralai 2.5.1's v2 SDK layout breaks cognee 1.2.2's unconditional 'from mistralai import Mistral' import; mistral-common's PyPI floor fails to build on Python 3.14.
- [Phase 01-02]: Disabled cognee's session/auto-feedback layer (CACHING=false in backend/cognee_config.py) -- left enabled, repeat GRAPH_COMPLETION queries against a dataset with prior session history return a canned 'Got it.' instead of the real answer, which would silently break PatchPilot's search->drift->forget->re-search core loop.
- [Phase 01-02]: Added backend/cognee_patches.py, a new runtime-monkeypatch module fixing three cognee 1.2.2 bugs in its Mistral provider support (MistralAdapter response parsing, embedding tokenizer selection, unsupported 'dimensions' param) -- required for PLAT-02 to pass on the Mistral provider, not in the original plan's artifact list.
- [Phase 01-03]: Isolated entity strings locked for seed CLI to assert on: dedup_sweeper/nightly-dedup-cron (workarounds_v1_8 only), idempotency_guard (workarounds_v1_9 only)
- [Phase 01-03]: Canonical demo query term locked: customers double-charged (Stripe arc only, absent from decoys)
- [Phase 01-04]: flip() search() is deliberately unscoped (matches 01-RESEARCH.md Pattern 3), which surfaces harmless leftover spike/healthcheck datasets in the printed demo diff -- cosmetic only, both FLIP OK and INCIDENTS SURVIVED assertions passed
- [Phase 01-04]: scripts/snapshot_memory.py is pure filesystem tar work with no cognee import -- verified restore-then-search round trip with zero add()/cognify() calls
- [Phase 02-01]: CACHING=true + AUTO_FEEDBACK=false: two independent flags keep Q&A history recording (for feedback) while permanently disabling the LLM turn-continuation classifier that caused the Phase 1 'Got it.' regression. Verified live. Unblocks FEEDBACK-01/02 (B-01 resolved).
- [Phase 02-01]: cognee 1.2.2 ingestion: cognee.add() must be passed the whole FastAPI/Starlette UploadFile (reads .file+.filename), NOT upload.file/bare BinaryIO (raises IngestionError). Falsifies RESEARCH Assumption A2; Plan 02 ingest.py must pass the UploadFile object.
- [Phase 02-01]: Fused-search latency measured ~7.1s (Mistral free tier, seed corpus), above RESEARCH's ~5s assumption. Plan 02 must size the D-20 skeleton-card minimum-display time accordingly.

### Pending Todos

None yet.

### Blockers/Concerns

- **FEEDBACK API unresolved**: `improve(feedback_alpha=)` (V2 API) vs `search(SearchType.FEEDBACK)` (server-mode) — Day-1 runtime spike required before Phase 2 planning; do not assume either works until verified against cognee==1.2.2
- **Cognee #1023**: `forget(dataset=...)` leaks across datasets in vector layer; seed data must use strictly isolated entity names (Phase 1 exit gate includes before/after CLI assertion)
- **Cognify budget**: Seed corpus is 8 files (per D-03/01-03-PLAN), each 172-220 words, well under the ~300-word budget; provider is now Mistral free tier (not OpenAI, see Decisions), so per-token cost risk is lower than originally assumed. Still cache cognified state as tar snapshot for zero-cost reseeds.
- **RESOLVED** — Gemini free-tier daily quota (20 req/day, gemini-2.5-flash) exhausted mid-Task-3 verification (backend/persistence_check.py --store); cognify() retries never succeeded. User pivoted to Mistral's free tier instead of waiting for reset or paying for OpenAI (see Decisions).

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-02T06:49:57.069Z
Stopped at: Completed 02-01-PLAN.md (fused /search + config keystone)
Resume file: None
