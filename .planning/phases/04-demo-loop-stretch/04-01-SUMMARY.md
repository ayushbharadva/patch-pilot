---
phase: 04-demo-loop-stretch
plan: 01
subsystem: infra
tags: [cognee, seed-corpus, cognify, snapshot, mistral]

# Dependency graph
requires:
  - phase: 03-drift-forget
    provides: forget()/drift-state guard, live-UAT-verified search->drift->forget->re-search loop
provides:
  - 3 new isolated seed documents (1 decoy incident, 1 workarounds_v1_8 reinforcement, 1 workarounds_v1_9 reinforcement)
  - Enriched 11-doc corpus cognified across incidents/workarounds_v1_8/workarounds_v1_9
  - Fresh patchpilot_memory.snapshot.tar (post-enrichment, pre-flip, contains workarounds_v1_8) for Plan 02's reset endpoint
affects: [04-02-demo-reset, 04-03-memory-graph]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Seed content wording must avoid lexical overlap with the canonical demo query ('customers', billing-adjacent vocabulary) even in unrelated decoy docs -- Cognee's GRAPH_COMPLETION retrieval can surface an unrelated decoy's subgraph for a query if wording overlaps, independent of the isolated-entity-name rule"
    - "Never call cognee's low-level engine APIs (get_unified_engine/get_vector_engine) directly outside the request/CLI context that sets up dataset+auth context -- doing so left workarounds_v1_8's on-disk LanceDB collections incomplete after a subsequent cognify() run"

key-files:
  created:
    - seed/incidents/queue-backlog-incident.md
    - seed/workarounds_v1_8/dedup-monitoring-note.md
    - seed/workarounds_v1_9/idempotency-rollout-note.md
  modified:
    - patchpilot_memory.snapshot.tar (gitignored, re-captured)

key-decisions:
  - "Reworded the new incidents decoy to avoid 'customers'/billing-adjacent language after live testing showed it could dominate the incidents dataset's GRAPH_COMPLETION retrieval for the canonical query"
  - "Diagnosed and worked around ad-hoc raw cognee engine access as the cause of incomplete on-disk collections; final snapshot was captured from a clean, uninterrupted reset->save->flip->restore cycle"

patterns-established:
  - "Corrected snapshot-content verification: check tar member bytes of the relational cognee_db SQLite file for the literal dataset name (grep-equivalent), not tar member path names -- Cognee stores all dataset paths by UUID, never by human-readable dataset name"

requirements-completed: [GRAPH-01, DEMO-01]

coverage:
  - id: D1
    description: "3 new isolated seed docs added (1 decoy incident, 1 workarounds_v1_8 reinforcement, 1 workarounds_v1_9 reinforcement) without breaking the #1023 isolation invariant or touching arc-critical docs"
    verification:
      - kind: other
        ref: "grep isolation gate (Task 1 verify) + git status --porcelain arc-docs-untouched gate -- both printed ISOLATION_OK / ARC_DOCS_UNTOUCHED"
        status: pass
    human_judgment: false
  - id: D2
    description: "Re-seeded 11-doc enriched corpus (5 incidents + 3 workarounds_v1_8 + 3 workarounds_v1_9); before/after forget flip still produces FLIP OK + INCIDENTS SURVIVED post-enrichment"
    verification:
      - kind: e2e
        ref: "seed/seed_cli.py --flip (clean run, uninterrupted) -- printed FLIP OK and INCIDENTS SURVIVED with real Stripe-topic incidents answer"
        status: pass
    human_judgment: false
  - id: D3
    description: "Fresh patchpilot_memory.snapshot.tar captured post-enrichment, pre-flip, contains workarounds_v1_8, and restores cleanly for Plan 02's reset endpoint"
    verification:
      - kind: other
        ref: "corrected tar-content check (grep-equivalent byte search for 'workarounds_v1_8' inside the tar's databases/cognee_db member) + scripts/snapshot_memory.py --restore round-trip"
        status: pass
    human_judgment: false

duration: 63min
completed: 2026-07-03
status: complete
---

# Phase 4 Plan 1: Seed Corpus Enrichment + Snapshot Recapture Summary

**Enriched the seed corpus to 11 isolated documents and recaptured `patchpilot_memory.snapshot.tar` from a clean cognify pass, verified the Stripe double-charged flip still holds (FLIP OK + INCIDENTS SURVIVED) post-enrichment.**

## Performance

- **Duration:** ~63 min
- **Started:** 2026-07-03T06:15:00Z (approx.)
- **Completed:** 2026-07-03T07:18:00Z
- **Tasks:** 2 (both complete)
- **Files modified:** 4 (3 new seed docs + snapshot tar, gitignored)

## Accomplishments
- Authored 3 new isolated seed documents (1 decoy incident, 1 `workarounds_v1_8` reinforcement, 1 `workarounds_v1_9` reinforcement), preserving the Cognee #1023 isolation invariant and leaving the 4 arc-critical documents untouched
- Re-seeded the full 11-document corpus (5 incidents + 3 `workarounds_v1_8` + 3 `workarounds_v1_9`) with a single clean `cognify()` pass per dataset
- Confirmed the Stripe double-charged before/after forget flip still works post-enrichment: `FLIP OK` + `INCIDENTS SURVIVED`
- Captured a fresh `patchpilot_memory.snapshot.tar` (gitignored) containing the enriched, pre-flip state with `workarounds_v1_8` present, verified it restores cleanly — this is the exact payload Plan 02's reset endpoint will restore

## Task Commits

Each task was committed atomically:

1. **Task 1: Author 3 isolated enrichment docs (D-09)** - `7f7cc65` (feat)
2. **Task 2: Re-seed once + capture fresh post-enrichment snapshot (B-03)** - `8d577f2` (fix, includes a Task-1 content follow-up fix required to pass Task 2's live verification)

**Plan metadata commit:** pending (this commit)

## Files Created/Modified
- `seed/incidents/queue-backlog-incident.md` - New isolated decoy incident (background job queue backlog / worker starvation); no arc entity names, no double-charged/Stripe/customer-billing vocabulary
- `seed/workarounds_v1_8/dedup-monitoring-note.md` - Monitoring/ops note reinforcing `dedup_sweeper`/`nightly-dedup-cron`, `workarounds_v1_8`-only
- `seed/workarounds_v1_9/idempotency-rollout-note.md` - Rollout verification note reinforcing `idempotency_guard`, `workarounds_v1_9`-only
- `patchpilot_memory.snapshot.tar` - (gitignored) re-captured post-enrichment tarball of `.patchpilot_memory/`, restore payload for `backend/reset.py` (Plan 02)

## Decisions Made
- Reworded `queue-backlog-incident.md` to remove "customers"/"financial impact" phrasing after live testing showed the incidents dataset's `GRAPH_COMPLETION` retrieval could surface the decoy's subgraph instead of the Stripe incident's for the canonical `"customers double-charged"` query — not an entity-isolation violation (the doc never named `dedup_sweeper`/`idempotency_guard`/"double-charged"), but a retrieval-relevance collision discovered only after a real `cognify()` pass.
- Diagnosed that direct, ad-hoc calls to cognee's low-level engine APIs (`get_unified_engine()`/`get_vector_engine()`) outside the normal request/CLI dataset-context flow left `workarounds_v1_8`'s on-disk LanceDB collections incomplete after a subsequent `cognify()` run. Resolved by wiping `.patchpilot_memory/` and re-running the full official CLI sequence (`--reset` → `--save` → `--flip` → `--restore`) uninterrupted, with no custom engine probing in between. The final committed snapshot comes from this clean run.
- Corrected the plan's Task 2 snapshot-content verification: the literal command `assert any('workarounds_v1_8' in n for n in names)` cannot pass because Cognee stores every per-dataset path by UUID, never by the human-readable dataset name (confirmed via `SELECT id, name FROM datasets` on `.patchpilot_memory/databases/cognee_db`). The underlying requirement (snapshot contains `workarounds_v1_8`'s data) is real and was verified instead by grepping the tar's `databases/cognee_db` member bytes for the literal string `workarounds_v1_8` (present as SQLite row data) and by cross-referencing the dataset's UUID (`cbc1a498-...`) against tar member paths, confirming non-empty `DocumentChunk_text.lance/data/*.lance` files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed customer/billing-adjacent vocabulary from the new incidents decoy**
- **Found during:** Task 2 (live `--flip` verification, first cognify pass)
- **Issue:** `queue-backlog-incident.md`'s original wording ("Several customers complained...", "no financial impact") embedded close enough to the canonical `"customers double-charged"` query that the incidents dataset's `GRAPH_COMPLETION` retrieval sometimes returned the decoy's queue-backlog answer instead of the Stripe incident's answer for the isolation check, failing `INCIDENTS SURVIVED`.
- **Fix:** Reworded the doc to purely internal/technical language ("internal teams flagged", "purely an internal queueing issue with no user-facing outage"), removing all customer-facing/billing phrasing while keeping the same incident scenario and isolation guarantees.
- **Files modified:** `seed/incidents/queue-backlog-incident.md`
- **Verification:** Isolation gates still pass (`ISOLATION_OK`, `ARC_DOCS_UNTOUCHED`); a clean, uninterrupted `--flip` run after the fix produced `FLIP OK` + `INCIDENTS SURVIVED` with a real, on-topic Stripe incidents answer.
- **Committed in:** `8d577f2`

**2. [Rule 3 - Blocking] Stopped and restarted the running backend to release the Kuzu file lock**
- **Found during:** Task 2 (pre-flight check before `--reset`)
- **Issue:** The plan requires the backend NOT be running during the reseed (single-worker Kuzu file lock; the CLI process needs exclusive access). A `uvicorn` process was already running on port 8000 from a prior session.
- **Fix:** Identified the process via `wmic`/`tasklist` (confirmed it was the project's own `uvicorn main:app --workers 1 --host 127.0.0.1 --port 8000` from `backend/`), stopped it, ran the full reseed/save/flip/restore sequence, then restarted the identical command from `backend/` afterward.
- **Files modified:** None (process lifecycle only)
- **Verification:** `GET /health/cognee` returned `{"status":"ok","results":1}` after restart, confirming the backend is healthy against the restored, enriched memory state.
- **Committed in:** N/A (no file change)

**3. [Rule 1 - Bug] Diagnosed and recovered from self-inflicted state corruption during debugging**
- **Found during:** Task 2 (root-cause investigation of the `INCIDENTS SURVIVED` failure)
- **Issue:** While investigating why the incidents-only isolation check kept failing, several ad-hoc debug scripts called cognee's low-level engine APIs (`get_unified_engine()`, raw `vector_engine.search()`) directly, bypassing the dataset/auth context that `cognee.search()` normally sets up. This left `workarounds_v1_8`'s on-disk LanceDB folder missing its core content collections (`DocumentChunk_text.lance`, `Entity_name.lance`, etc. — only the session-QA collection remained), causing even in-topic queries against `workarounds_v1_8` to return "No information available."
- **Fix:** Deleted `.patchpilot_memory/` entirely and re-ran the full official sequence (`seed/seed_cli.py --reset` → `scripts/snapshot_memory.py --save` → `seed/seed_cli.py --flip` → `scripts/snapshot_memory.py --restore`) with no interspersed custom scripts, verifying all 3 datasets had complete LanceDB collections immediately after seeding.
- **Files modified:** None (runtime state only; the committed snapshot tar reflects the clean final run)
- **Verification:** Clean run produced `FLIP OK` + `INCIDENTS SURVIVED` with coherent, on-topic answers for both the fused Stripe query and the incidents-only isolation check; on-disk collection check confirmed all 3 datasets (`incidents`, `workarounds_v1_8`, `workarounds_v1_9`) had complete `DocumentChunk_text.lance`/`Entity_name.lance`/etc. folders before saving the final snapshot.
- **Committed in:** N/A (runtime state; snapshot itself is gitignored)

---

**Total deviations:** 3 auto-fixed (1 bug in seed content, 1 blocking process-lifecycle fix, 1 bug from self-inflicted debug-script state corruption, resolved before the final snapshot was captured)
**Impact on plan:** All fixes were necessary to make the plan's required assertions (`FLIP OK`, `INCIDENTS SURVIVED`, snapshot contains `workarounds_v1_8`) genuinely true, not just superficially pass. No scope creep — no application code was touched; all fixes were confined to seed content wording and re-running the plan's own prescribed CLI sequence cleanly.

## Issues Encountered
- The plan's literal Task 2 verify command (`assert any('workarounds_v1_8' in n for n in names)` over tar member *names*) cannot pass against Cognee 1.2.2's actual on-disk layout, which paths everything by dataset UUID rather than by human-readable name. Verified the underlying requirement instead by grepping the tar's `databases/cognee_db` SQLite member bytes for the literal string (present as row data in the `datasets` table) and cross-referencing the dataset UUID's `DocumentChunk_text.lance/data/*.lance` files are non-empty. See "Decisions Made" above for the exact corrected check.
- GRAPH_COMPLETION retrieval scoped to a single small dataset (`datasets=[...]`) is more sensitive to word-choice overlap with the query than expected — a decoy document sharing only the common word "customers" with the canonical query occasionally won the graph-completion answer over the actual on-topic document, purely on embedding/graph-traversal proximity. Resolved for this plan's docs; worth remembering for any future seed-corpus enrichment in this project.

## User Setup Required

None - no external service configuration required. Note: the project's `uvicorn` backend (port 8000) was stopped and restarted during this plan's execution; no manual action is needed, it is already running again.

## Next Phase Readiness
- The enriched, isolated 11-doc corpus and a fresh, verified `patchpilot_memory.snapshot.tar` (containing `workarounds_v1_8`, pre-flip) are ready for Plan 02's `backend/reset.py` to restore.
- No blockers for Plan 03 (memory graph) — the enriched corpus gives the graph visibly more nodes/edges than the original 8-doc corpus.
- Reminder for Plan 03/04 authors: if further seed-corpus enrichment is needed, avoid wording that overlaps with the canonical demo query even in datasets/docs that don't share isolated entity names — retrieval-relevance collisions are possible independent of the #1023 entity-isolation rule.

---
*Phase: 04-demo-loop-stretch*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: seed/incidents/queue-backlog-incident.md
- FOUND: seed/workarounds_v1_8/dedup-monitoring-note.md
- FOUND: seed/workarounds_v1_9/idempotency-rollout-note.md
- FOUND: patchpilot_memory.snapshot.tar (gitignored, verified on disk)
- FOUND: .planning/phases/04-demo-loop-stretch/04-01-SUMMARY.md
- FOUND commit: 7f7cc65 (Task 1)
- FOUND commit: 8d577f2 (Task 2 + follow-up fix)
- FOUND commit: ba5f2d1 (SUMMARY.md)
