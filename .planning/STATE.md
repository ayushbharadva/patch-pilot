---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: milestone
current_phase: 02
current_phase_name: core-recall
status: complete
stopped_at: Phase 3 context gathered
last_updated: "2026-07-02T14:26:09.927Z"
last_activity: 2026-07-02
last_activity_desc: "Completed quick task 260702-ros: widen demo-loop timing constraint 60s -> 120s"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-30)

**Core value:** search → drift-detected → forget → re-search loop works visibly in under 120 seconds — PatchPilot is obviously impossible without Cognee's memory lifecycle
**Current focus:** Phase 02 — core-recall

## Current Position

Phase: 02 (core-recall) — COMPLETE (4/4 plans)
Next: Phase 03 (Drift + Forget) — not yet planned
Status: Phase 02 complete; 1 success criterion (FEEDBACK-02 / SC#3) deferred — see 02-VERIFICATION.md
Last activity: 2026-07-02 — Phase 02 complete, STATE reconciled with ROADMAP

Progress: [█████░░░░░] 50% of milestone (2 of 4 phases)

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
| Phase 02 P02 | 70min | 3 tasks | 31 files |
| Phase 02 P03 | 180min | 2 tasks | 12 files |

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
- [Phase 02-02]: Frontend scaffold moves create-next-app's src/app -> app and repoints the @/* alias to ./* so paths match the plan's declared frontend/app + frontend/lib + frontend/components layout.
- [Phase 02-02]: UI-SPEC indigo brand accent mapped to shadcn's primary token (CTA fills, focus rings, active chip); shadcn's own accent token left as a neutral hover color to avoid terminology collision.
- [Phase 02-02]: shadcn v4 CLI replaced --base-color with --base <radix|base> + -p <preset>; used 'shadcn init --template next --base radix --css-variables -p nova -y' (neutral base carried by components.json baseColor:neutral) — same six blocks + CSS-variable theming landed.
- [Phase 02-02]: DiagnosisCardSkeleton shows a shape-matched card + "Searching memory…" label (not a bare spinner) because Plan 01 measured ~7.1s fused-search latency, above the ~5s bare-skeleton threshold (D-20/B-02).
- [Phase 02-03]: asyncio.create_task() replaces FastAPI BackgroundTasks for all cognee background work in this project -- BackgroundTasks reliably hangs cognify() in the live uvicorn process (A/B-verified); every future background cognee call must reuse this pattern
- [Phase 02-03]: cognee.add() always receives decoded UTF-8 text (str), never the UploadFile object, across every ingest path in this project -- sidesteps a real cognee bug (BinaryData.get_metadata->run_sync RuntimeError under asyncio.create_task) and a closed-file-handle bug
- [Phase 02-03]: Every background-scheduled batch (multi-file upload, multi-dataset sample load) processes items SEQUENTIALLY inside one task, never as concurrent asyncio.create_task() calls -- concurrent cognify() calls stall in this environment

### Pending Todos

None yet.

### Blockers/Concerns

- **FEEDBACK API unresolved**: `improve(feedback_alpha=)` (V2 API) vs `search(SearchType.FEEDBACK)` (server-mode) — Day-1 runtime spike required before Phase 2 planning; do not assume either works until verified against cognee==1.2.2
- **Cognee #1023**: `forget(dataset=...)` leaks across datasets in vector layer; seed data must use strictly isolated entity names (Phase 1 exit gate includes before/after CLI assertion)
- **Cognify budget**: Seed corpus is 8 files (per D-03/01-03-PLAN), each 172-220 words, well under the ~300-word budget; provider is now Mistral free tier (not OpenAI, see Decisions), so per-token cost risk is lower than originally assumed. Still cache cognified state as tar snapshot for zero-cost reseeds.
- **RESOLVED** — Gemini free-tier daily quota (20 req/day, gemini-2.5-flash) exhausted mid-Task-3 verification (backend/persistence_check.py --store); cognify() retries never succeeded. User pivoted to Mistral's free tier instead of waiting for reset or paying for OpenAI (see Decisions).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260702-ros | Widen demo-loop timing constraint 60s → 120s across 14 planning docs (PROJECT.md, CLAUDE.md, REQUIREMENTS.md DEMO-03, ROADMAP.md Phase 4, research corpus, phase context docs) | 2026-07-02 | 1c42254, 3e313c2 | [260702-ros-change-the-demo-video-loop-timing-constr](./quick/260702-ros-change-the-demo-video-loop-timing-constr/) |

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Verification | FEEDBACK-02 / ROADMAP SC#3 — "Accept makes re-search show the fix with higher priority." Verifier (02-VERIFICATION.md, human_needed) found the dataset winner is a fixed highest-version tie-break (`_pick_primary_result`/`_version_sort_key`) independent of `feedback_influence`, so a visible pre/post-Accept reorder is not demonstrable with the current seed corpus. Address in a later phase (change tie-break or seed corpus) if the demo must show reinforcement changing results. | Open (deferred) | Phase 02 (2026-07-02) |

## Session Continuity

Last session: 2026-07-02T14:24:05.685Z
Stopped at: Phase 3 context gathered
Resume file: .planning/phases/03-drift-forget/03-CONTEXT.md
