---
phase: 04-demo-loop-stretch
verified: 2026-07-03T14:09:40Z
status: passed
score: 15/15 must-haves verified
behavior_unverified: 0
overrides_applied: 2
overrides:
  - must_have: "The complete loop finishes in under 120 seconds on the deployed Render instance (ROADMAP SC1)"
    reason: "Human-approved plan-time decision (D-01, .planning/phases/04-demo-loop-stretch/04-CONTEXT.md + 04-DISCUSSION-LOG.md, dated 2026-07-03): the project owner explicitly chose 'record local demo video' over deploying to Render, to avoid Render free-tier cold-start + Mistral latency risk against the 120s budget. Render deployment is documented as deferred/best-effort, not a Phase-4 blocker. The functional intent (loop completes visibly under 120s) is independently re-verified live in this report (23.6s over HTTP, plus UAT test 4 on-screen pass) — only the 'on the deployed instance' qualifier is unmet."
    accepted_by: "user (via discuss-phase, 04-DISCUSSION-LOG.md '120s Loop Target' section)"
    accepted_at: "2026-07-03"
  - must_have: "Demo reset button invokes prune_data() + prune_system() + reseed (ROADMAP SC2, literal wording)"
    reason: "Human-approved plan-time decision (04-DISCUSSION-LOG.md 'Demo Reset Mechanism' section): the project owner explicitly chose 'fresh-snapshot restore' over the literal prune+reseed, because reseed re-bills cognify() on every reset and is slower. The snapshot-restore mechanism satisfies DEMO-01's actual intent (clean, demo-ready state, verifiable by re-running the loop) and is independently re-verified live in this report (POST /reset -> {status:reset}, backend survives a missing-snapshot edge case, GET /graph works after reset)."
    accepted_by: "user (via discuss-phase, 04-DISCUSSION-LOG.md 'Demo Reset Mechanism' section)"
    accepted_at: "2026-07-03"
re_verification: null
---

# Phase 04: Demo Loop + Stretch Verification Report

**Phase Goal:** The full search → release → drift → forget → re-search loop runs in under 120 seconds on the deployed instance; demo reset works in one click; memory graph and stretch features add judge-facing depth gated behind a confirmed working loop.
**Verified:** 2026-07-03T14:09:40Z
**Status:** passed
**Re-verification:** No — initial verification

## Context

This phase already went through a full UAT session (04-UAT.md, 16/16 passed, 0 issues) and a code-review + fix cycle (04-REVIEW.md: 2 critical + 4 warning findings; 04-REVIEW-FIX.md: all 6 fixed in commits `a5006e3`, `25090c5`, `00a4048`, `ba472e3`, `7aa7f0c`, `9f280d4`). Per the adversarial verification mandate, none of those claims were trusted at face value — every fix was independently re-read in the current source, and the two critical fixes (which change runtime crash behavior) were independently re-exercised live against a running backend, not just re-read as diffs.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Full loop (search → release → drift → forget → re-search) finishes under 120s on the deployed Render instance (ROADMAP SC1, literal) | PASSED (override) | Never deployed to Render — explicit, documented, human-approved plan-time decision (D-01). Functional loop timing independently re-verified locally: `scripts/time_demo_loop.py` re-run live against the running backend → `TOTAL: 23.6s` (well under 120s), all step assertions passed, cleanup reset succeeded. |
| 2 | Demo reset returns memory to a clean, demo-ready state, verifiable by re-running the loop (ROADMAP SC2 intent; literal "prune_data+prune_system+reseed" mechanism overridden) | PASSED (override) | Mechanism is snapshot-restore, not prune+reseed — explicit, documented, human-approved plan-time decision. Verified live: `curl -X POST /reset` → `{"status":"reset"}`; `GET /graph` and `GET /health/cognee` both healthy immediately after; demo-loop harness's own leading/trailing resets succeed. |
| 3 | Memory graph view renders incidents/fixes/components as a navigable graph, visually proving Cognee builds a real knowledge graph (ROADMAP SC3, GRAPH-01) | ✓ VERIFIED | `GET /graph` (live) → `{"status":"ok", nodes: 111, links: 227}`, real Cognee entity/relationship data, no chunk-text leak. `frontend/components/MemoryGraphView.tsx` renders `ForceGraph3D` behind a search/graph tab in `page.tsx`; click-to-explore wired (`onNodeClick` → side panel). UAT test 3: pass (post-fix commit `c87c8a1`). |
| 4 | Stretch: confidence score on diagnosis card (STRETCH-01) | ✓ VERIFIED | `backend/search.py` uses `verbose=True` CHUNKS + `_confidence_from_results`; live `POST /search {"query":"customers double-charged"}` → `"confidence": 0.7729`. `DiagnosisCard.tsx` renders the badge when `confidence != null`. Unit tests present in `test_search_helpers.py`. |
| 5 | Stretch: memory health dashboard shows 🟢/🟡/🔴 counts (STRETCH-02) | ✓ VERIFIED | `frontend/components/HealthDashboard.tsx` exists, imports `DATASETS_QUERY_KEY` (shared cache with `DatasetList`), mounted in `page.tsx` (line 122). tsc clean. |
| 6 | Stretch: incident timeline shows incidents/releases chronologically (STRETCH-03, cuttable) | ✓ VERIFIED (not cut) | `frontend/components/IncidentTimeline.tsx` exists and is mounted in `page.tsx` (line 126) — the team chose to build it, not cut it. |
| 7 | Stretch: click-to-explore on graph nodes (STRETCH-04) | ✓ VERIFIED | `MemoryGraphView.tsx`'s `onNodeClick` sets `selected` state and renders a detail panel (label/group/id). UAT test 3 confirms live click behavior. |
| 8 | POST /reset never crashes the backend process, even when the snapshot is missing (CR-01 fix) | ✓ VERIFIED | Independently reproduced live: renamed `patchpilot_memory.snapshot.tar` away, `POST /reset` → `{"status":"error","message":"Could not reset memory. Please try again."}` (graceful, no raw exception text), then `GET /health/cognee` immediately succeeded — backend process survived. `scripts/snapshot_memory.py::restore()` now raises `FileNotFoundError` instead of `sys.exit(1)`; `backend/reset.py` catches `(Exception, SystemExit)`. |
| 9 | GET /graph error shape is detectable by the frontend, no uncaught crash (CR-02 fix) | ✓ VERIFIED | `backend/graph.py` success path now emits `"status": "ok"`; `frontend/lib/api.ts`'s `getMemoryGraph()` parses a `GraphOkResponse \| GraphErrorResponse` union and throws on the error variant, which `MemoryGraphView.tsx`'s pre-existing `isError` branch renders. |
| 10 | Graph edge labels are always strings (WR-01 fix) | ✓ VERIFIED | `backend/graph.py`: `"label": str(edge[2]) if edge[2] is not None else ""`. |
| 11 | Private Cognee API surface has CI regression coverage (WR-02 fix) | ✓ VERIFIED | New `backend/tests/test_private_api_imports.py` imports every private symbol `graph.py`/`reset.py` depend on and asserts callability; full `pytest backend/tests/ -q` → 52 passed (independently re-run, not just trusted from SUMMARY). |
| 12 | CORS allow_headers restricted to least privilege (WR-03 fix) | ✓ VERIFIED | `backend/main.py`: `allow_headers=["Content-Type"]` (was `["*"]`). |
| 13 | Version-regex/drift-label duplication eliminated (WR-04 fix) | ✓ VERIFIED | New `frontend/lib/version.ts` exports `WORKAROUNDS_VERSION_RE`, `versionTagFromDataset`, `DRIFT_LABEL`; imported by `DiagnosisCard.tsx`, `IncidentTimeline.tsx`, `HealthDashboard.tsx`. `npx tsc --noEmit` → clean (independently re-run). |
| 14 | Seed corpus enrichment preserves the #1023 isolation invariant and the Stripe arc (04-01) | ✓ VERIFIED | Independently re-ran the plan's isolation grep gate against current files → `ISOLATION_OK`. `dedup_sweeper`/`idempotency_guard` correctly isolated per-dataset; decoy incident free of arc vocabulary. |
| 15 | A failed reset shows a short human message, never a raw exception (D-24) | ✓ VERIFIED | Confirmed live in the missing-snapshot repro above — response body is the fixed `_MSG_ERROR` string, no traceback/exception text. |

**Score:** 15/15 truths verified (13 fully verified, 2 PASSED via documented human-approved override)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/reset.py` | POST /reset, Windows-safe handle release, D-24 error handling | ✓ VERIFIED | Exists, correct order (cache→relational dispose→cache_clear x3→restore), catches `(Exception, SystemExit)` post-fix |
| `backend/graph.py` | GET /graph, trimmed + aggregated graph | ✓ VERIFIED | Exists, `status: ok` discriminant added, edge label coerced to string, node text never forwarded |
| `frontend/components/ResetButton.tsx` | Modal confirm + animation | ✓ VERIFIED | Reviewed; wired to `resetMemory()`, invalidates all react-query caches on success |
| `frontend/components/ui/dialog.tsx` | shadcn dialog primitive | ✓ VERIFIED | Present, generated |
| `frontend/components/MemoryGraphView.tsx` | Client-only 3D graph, click-to-explore | ✓ VERIFIED | `ssr:false` dynamic import inside "use client", `onNodeClick` wired, width measured via callback ref (post-UAT-gap fix) |
| `frontend/lib/api.ts` | resetMemory(), getMemoryGraph(), confidence field | ✓ VERIFIED | All three present; `getMemoryGraph()` now handles error-shape union (CR-02 fix) |
| `scripts/time_demo_loop.py` | HTTP-only timing harness, asserts <120s | ✓ VERIFIED | Re-executed live: exits 0, `TOTAL: 23.6s`, per-step assertions pass, cleanup reset runs |
| `frontend/components/DiagnosisCard.tsx` | Confidence badge | ✓ VERIFIED | Renders badge conditionally on `confidence != null`; imports `versionTagFromDataset` from shared `lib/version.ts` |
| `frontend/components/HealthDashboard.tsx` | 🟢/🟡/🔴 counts | ✓ VERIFIED | Shares `DATASETS_QUERY_KEY`; mounted |
| `frontend/components/IncidentTimeline.tsx` | Chronological incidents/releases | ✓ VERIFIED | Built (not cut); mounted |
| `backend/tests/test_private_api_imports.py` | New WR-02 regression test | ✓ VERIFIED | Present, both tests pass in the full suite run |
| `frontend/lib/version.ts` | New WR-04 shared helper | ✓ VERIFIED | Present, imported by 3 components |
| `seed/incidents/queue-backlog-incident.md`, `seed/workarounds_v1_8/dedup-monitoring-note.md`, `seed/workarounds_v1_9/idempotency-rollout-note.md` | 3 isolated enrichment docs | ✓ VERIFIED | Present, isolation gate re-run → `ISOLATION_OK` |
| `patchpilot_memory.snapshot.tar` | Fresh post-enrichment snapshot | ✓ VERIFIED | Present on disk (gitignored); live reset from it succeeds |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `backend/main.py` | `backend/reset.py` | `app.include_router(reset_router)` | WIRED | Confirmed in source |
| `backend/main.py` | `backend/graph.py` | `app.include_router(graph_router)` | WIRED | Confirmed in source |
| `backend/reset.py` | `scripts/snapshot_memory.restore()` | engine dispose/cache_clear precedes restore | WIRED | Order confirmed in source; live-tested (reset works, and missing-snapshot case degrades gracefully instead of crashing) |
| `frontend/components/ResetButton.tsx` | react-query cache | `queryClient.invalidateQueries()` | WIRED | Confirmed via grep + UAT test 2 pass |
| `frontend/app/page.tsx` | `MemoryGraphView` / search view | `useState<"search"\|"graph">` tab toggle | WIRED | Confirmed in source, UAT test 3 pass |
| `frontend/components/HealthDashboard.tsx` / `IncidentTimeline.tsx` | `DatasetList`'s `DATASETS_QUERY_KEY` | shared react-query cache key | WIRED | Confirmed via grep in both files |
| `backend/graph.py` | `backend/search.py::_active_search_datasets` | reused live-dataset discovery | WIRED | Confirmed via grep + live curl parity |
| `frontend/lib/api.ts::getMemoryGraph` | `backend/graph.py` error shape | `status: "error"` discriminant check | WIRED (post-fix) | Independently re-read; the CR-02 fix closes the gap the review found |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend health | `curl /health/cognee` | `{"status":"ok","results":1}` | ✓ PASS |
| GET /graph returns real, trimmed graph | `curl /graph` | `status: ok`, 111 nodes, 227 links, no `text`/`full_text` keys | ✓ PASS |
| POST /reset succeeds | `curl -X POST /reset` | `{"status":"reset"}` | ✓ PASS |
| POST /reset degrades gracefully when snapshot missing (CR-01 regression check) | rename tar away, `curl -X POST /reset`, then `curl /health/cognee` | `{"status":"error","message":"Could not reset memory. Please try again."}` then backend still healthy | ✓ PASS |
| POST /search returns real confidence | `curl -X POST /search {"query":"customers double-charged"}` | `confidence: 0.7729`, `status: ok` | ✓ PASS |
| Full demo loop timing (DEMO-03) | `.venv/bin/python scripts/time_demo_loop.py` | Exit 0, `TOTAL: 23.6s` (<120s), all step assertions pass, `GET /graph` non-empty (89 nodes/178 links) mid-run | ✓ PASS |
| Seed isolation invariant (#1023) | Re-run plan's Task-1 grep gate | `ISOLATION_OK` | ✓ PASS |
| Full backend unit test suite | `pytest backend/tests/ -q` | `52 passed` | ✓ PASS |
| Frontend typecheck | `npx tsc --noEmit` (frontend/) | Exit 0, no output | ✓ PASS |
| Frontend page loads | `curl http://localhost:3000/` | HTTP 200, no PostCSS/error markers in HTML | ✓ PASS |
| Debt-marker scan across all 20 phase-touched files | grep TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER | No matches | ✓ PASS |

### Probe Execution

N/A — no `scripts/*/tests/probe-*.sh` declared or found for this phase (Step 7c skipped per discovery).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DEMO-01 | 04-01, 04-02 | Reset/reseed to clean demo state | ✓ SATISFIED | Snapshot-restore mechanism verified live (documented override on literal "prune+reseed" wording, see Overrides) |
| DEMO-03 | 04-04 | Full loop <120s | ✓ SATISFIED | Harness re-run: 23.6s; UAT test 4 on-screen pass (documented override on "deployed" wording) |
| GRAPH-01 | 04-01, 04-03 | Memory graph view | ✓ SATISFIED | Live `/graph` + `MemoryGraphView.tsx` verified |
| STRETCH-01 | 04-05 | Confidence score | ✓ SATISFIED | Live confidence 0.7729 confirmed |
| STRETCH-02 | 04-06 | Health dashboard | ✓ SATISFIED | Component wired, mounted |
| STRETCH-03 | 04-06 | Incident timeline | ✓ SATISFIED | Built (not cut), mounted |
| STRETCH-04 | 04-03 | Click-to-explore | ✓ SATISFIED | `onNodeClick` wired, UAT-confirmed |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps exactly these 7 IDs to Phase 4; all 7 appear in at least one plan's `requirements:` frontmatter field. No orphans.

### Anti-Patterns Found

None. Scanned all 20 files touched across the phase's 6 plans plus the review-fix commits (`backend/reset.py`, `backend/graph.py`, `backend/main.py`, `backend/search.py`, `backend/tests/test_search_helpers.py`, `backend/tests/test_private_api_imports.py`, `frontend/lib/api.ts`, `frontend/lib/version.ts`, `frontend/components/ResetButton.tsx`, `frontend/components/MemoryGraphView.tsx`, `frontend/components/DiagnosisCard.tsx`, `frontend/components/HealthDashboard.tsx`, `frontend/components/IncidentTimeline.tsx`, `frontend/components/ui/dialog.tsx`, `frontend/app/page.tsx`, `scripts/time_demo_loop.py`, `scripts/snapshot_memory.py`, 3 seed docs) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/empty-return patterns. Zero matches.

### Human Verification Required

None. All 16 UAT checkpoints already passed (04-UAT.md), all critical/warning code-review findings were independently re-verified in source (not just re-read from the fix report), and the two behaviorally-significant fixes (CR-01 process-crash, CR-02 frontend-crash) were independently reproduced live against a running backend rather than trusted from the SUMMARY's claimed regression pass.

### Gaps Summary

No gaps. Two ROADMAP success-criteria items (SC1's "on the deployed Render instance" and SC2's literal "prune_data()+prune_system()+reseed" mechanism) diverge from the roadmap's exact wording, but both divergences were explicit, dated, human-approved decisions made during discuss-phase (see `04-DISCUSSION-LOG.md`) — not silent scope-narrowing by an executor — and the underlying functional intent of each criterion (loop completes visibly under 120s; reset returns memory to a clean, re-testable state) was independently re-verified live in this report. Recorded as overrides in the frontmatter above per the verification-overrides protocol, since ROADMAP.md's literal text was not updated to reflect the discuss-phase decision.

---

_Verified: 2026-07-03T14:09:40Z_
_Verifier: Claude (gsd-verifier)_
