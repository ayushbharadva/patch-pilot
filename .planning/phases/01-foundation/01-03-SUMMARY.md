---
phase: 01-foundation
plan: 03
subsystem: content
tags: [seed-corpus, cognee-dataset-isolation, markdown, demo-data]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Verified cognee 1.2.2 add/cognify/forget API and Pattern 4 isolated-entity-naming guidance for a clean forget flip"
  - phase: 01-02
    provides: "Locked dataset-naming constants in backend/datasets.py (INCIDENTS, WORKAROUNDS_V1_8, WORKAROUNDS_V1_9)"
provides:
  - "seed/incidents/ — 4 durable docs (Stripe double-charge bug + escalation, 2 decoys)"
  - "seed/workarounds_v1_8/ — 2 docs, the dataset that gets forgotten (isolated entities dedup_sweeper / nightly-dedup-cron)"
  - "seed/workarounds_v1_9/ — 2 docs, supplies the flipped answer (isolated entity idempotency_guard)"
  - "seed/README.md — documents the folder->dataset mapping, the before/after arc, the canonical query term, and the isolation rule"
affects: [01-04, seed-cli, phase-2-drift-detection, phase-3-demo-loop]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Isolated-entity naming (Pattern 4, from 01-01): the v1.8 fix artifact (dedup_sweeper / nightly-dedup-cron) and the v1.9 fix artifact (idempotency_guard) each appear in exactly one dataset folder, while shared stable vocabulary (\"customers double-charged\", \"Stripe webhook retries\") ties all three datasets together for recall"
    - "Folder = dataset name (1:1 mapping to backend/datasets.py constants): any future seed-CLI must add()+cognify() each folder into its matching dataset, never merging folders into one dataset"

key-files:
  created:
    - seed/incidents/stripe-double-charge-incident.md
    - seed/incidents/stripe-double-charge-escalation.md
    - seed/incidents/login-timeout-incident.md
    - seed/incidents/api-latency-spike-incident.md
    - seed/workarounds_v1_8/nightly-dedup-workaround.md
    - seed/workarounds_v1_8/dedup-runbook-thread.md
    - seed/workarounds_v1_9/release-v1.9.md
    - seed/workarounds_v1_9/idempotency-fix-thread.md
    - seed/README.md
  modified: []

key-decisions:
  - "Isolated entity strings locked for the seed CLI to assert on: v1.8 fix = `dedup_sweeper` (script) / `nightly-dedup-cron` (scheduled component), appears ONLY in seed/workarounds_v1_8/; v1.9 fix = `idempotency_guard` (idempotency-key check on the webhook handler), appears ONLY in seed/workarounds_v1_9/."
  - "Canonical demo query term locked: \"customers double-charged\" (also matches \"double-charged\" / \"duplicate charge\"), present in the Stripe arc's 6 docs (2 incidents + 2 v1.8 + 2 v1.9) and absent from both decoys."
  - "Decoy topics chosen to be maximally topic-distinct from billing/webhooks (login-timeout session-expiry bug, DB-index latency spike) so no shared vocabulary could accidentally pull them into the double-charge recall focus."

patterns-established:
  - "Seed corpus as human-authored source of truth: Cognee only ingests what these .md files say; any regeneration of the corpus must preserve the isolation rule documented in seed/README.md."

requirements-completed: [DEMO-02, INGEST-03]

coverage:
  - id: D1
    description: "Durable incidents dataset authored: Stripe double-charge bug + escalation in stable shared vocabulary, plus 2 decoys that never mention double-charging"
    requirement: "DEMO-02"
    verification:
      - kind: other
        ref: "grep -qi 'double-charged' seed/incidents/stripe-double-charge-incident.md && ! grep -qi 'dedup_sweeper|idempotency' seed/incidents/stripe-double-charge-incident.md && ! grep -qi 'double-charged' seed/incidents/login-timeout-incident.md seed/incidents/api-latency-spike-incident.md -> all pass"
        status: pass
    human_judgment: false
  - id: D2
    description: "v1.8/v1.9 workaround datasets authored with fully isolated fix-artifact names (B-01), enabling a clean forget flip"
    requirement: "DEMO-02"
    verification:
      - kind: other
        ref: "grep -rqi 'dedup_sweeper' seed/workarounds_v1_8/ && ! grep -rqi 'dedup_sweeper' seed/incidents/ seed/workarounds_v1_9/ && grep -qi 'idempotency' seed/workarounds_v1_9/release-v1.9.md && ! grep -rqi 'idempotency' seed/workarounds_v1_8/ -> all pass"
        status: pass
    human_judgment: false
  - id: D3
    description: "Folder layout maps 1:1 to the locked dataset names (backend/datasets.py), enabling surgical forget(dataset=...)"
    requirement: "INGEST-03"
    verification:
      - kind: other
        ref: "seed/incidents/ -> incidents, seed/workarounds_v1_8/ -> workarounds_v1_8, seed/workarounds_v1_9/ -> workarounds_v1_9 (matches backend/datasets.py constants verbatim); documented in seed/README.md"
        status: pass
    human_judgment: false
  - id: D4
    description: "seed/README.md documents the arc, dataset mapping, query term, and isolation rule for the seed CLI"
    verification:
      - kind: other
        ref: "test -f seed/README.md && grep -q 'workarounds_v1_8' seed/README.md && grep -q 'workarounds_v1_9' seed/README.md && grep -qi 'double-charged' seed/README.md -> all pass"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-07-02
status: complete
---

# Phase 1 Plan 03: Seed Corpus Authoring Summary

**8-document Markdown seed corpus (Stripe double-charge before/after arc + 2 decoys) authored across incidents/workarounds_v1_8/workarounds_v1_9, with the v1.8 fix artifact (`dedup_sweeper`/`nightly-dedup-cron`) and v1.9 fix artifact (`idempotency_guard`) each isolated to exactly one dataset so a surgical `forget()` cleanly flips recall.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-01T19:47:00Z (approx, per STATE.md session position)
- **Completed:** 2026-07-01T19:53:16Z
- **Tasks:** 3 (all auto)
- **Files modified:** 9 created (8 seed docs + seed/README.md)

## Accomplishments
- Authored the durable `incidents` dataset: `stripe-double-charge-incident.md` (bug report) and `stripe-double-charge-escalation.md` (chat escalation), both using stable shared vocabulary ("customers double-charged", "Stripe webhook retries") with zero mention of either workaround's fix-specific artifact names
- Authored two topic-distinct decoy incidents (`login-timeout-incident.md`, `api-latency-spike-incident.md`) that never mention double-charging, keeping the demo query focused on the Stripe arc (B-02)
- Authored the `workarounds_v1_8` dataset (the dataset that gets forgotten): `nightly-dedup-workaround.md` and `dedup-runbook-thread.md`, both centered on the isolated entity `dedup_sweeper` script / `nightly-dedup-cron` scheduled component, appearing in no other dataset
- Authored the `workarounds_v1_9` dataset (survives forget, supplies the flipped answer): `release-v1.9.md` and `idempotency-fix-thread.md`, both centered on the isolated entity `idempotency_guard`, stating the v1.8 dedup approach is redundant/superseded (the drift signal Phase 3 will use)
- Verified full entity isolation via grep across all three folders: `dedup_sweeper`/`nightly-dedup-cron` present ONLY in `workarounds_v1_8/`; `idempotency_guard` present ONLY in `workarounds_v1_9/`
- Authored `seed/README.md` documenting the folder->dataset mapping, the search->upload->forget->re-search arc, the canonical demo query term, and the isolation rule as a contract for the future seed CLI

## Task Commits

Each task was committed atomically:

1. **Task 1: Author durable incidents dataset (Stripe bug + escalation + 2 decoys)** - `8184400` (feat)
2. **Task 2: Author the two workaround datasets with isolated entities** - `68e8797` (feat)
3. **Task 3: Author seed/README.md documenting the arc, dataset mapping, and isolation rule** - `dc4174b` (docs)

_Note: this SUMMARY commit follows as a separate `docs(...)` metadata commit._

## Files Created/Modified
- `seed/incidents/stripe-double-charge-incident.md` - Durable bug report; shared vocab, no workaround-specific proper nouns
- `seed/incidents/stripe-double-charge-escalation.md` - Durable escalation chat; same shared vocab
- `seed/incidents/login-timeout-incident.md` - Decoy (session-expiry bug); never mentions double-charging
- `seed/incidents/api-latency-spike-incident.md` - Decoy (DB-index latency spike); never mentions double-charging
- `seed/workarounds_v1_8/nightly-dedup-workaround.md` - Old fix; introduces isolated `dedup_sweeper` / `nightly-dedup-cron`
- `seed/workarounds_v1_8/dedup-runbook-thread.md` - Runbook thread reinforcing the same isolated entity
- `seed/workarounds_v1_9/release-v1.9.md` - Release note; introduces isolated `idempotency_guard`, states v1.8 fix is redundant
- `seed/workarounds_v1_9/idempotency-fix-thread.md` - Engineering thread confirming the new fix, no v1.8 artifact names
- `seed/README.md` - Documents mapping, arc, query term, and isolation rule

## Decisions Made
- Locked the exact isolated entity strings the future seed CLI should assert on: `dedup_sweeper` / `nightly-dedup-cron` (workarounds_v1_8 only) and `idempotency_guard` (workarounds_v1_9 only) — see `key-decisions` in frontmatter.
- Locked the canonical demo query term: "customers double-charged" (also matches "double-charged" / "duplicate charge").
- Chose maximally topic-distinct decoy subjects (session-timeout bug, DB-index latency spike) so no incidental shared vocabulary with billing/webhooks could pull the decoys into the Stripe-arc recall.

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria and the plan's `<verify>` automated commands were run and passed for each task before committing.

## Issues Encountered

None.

## User Setup Required

None - this plan is pure content authoring (Markdown files), no code, no external services, no environment configuration.

## Next Phase Readiness

- **Ready:** The seed corpus is complete and isolation-verified. Plan 01-04 (seed CLI) can now write `add()`+`cognify()` per-dataset calls that ingest `seed/incidents/` -> `incidents`, `seed/workarounds_v1_8/` -> `workarounds_v1_8`, `seed/workarounds_v1_9/` -> `workarounds_v1_9`, using `backend/datasets.py`'s constants (already confirmed matching this plan's folder names).
- **Carry forward:** The seed CLI's before/after CLI assertion (Phase 1 exit gate, per STATE.md's Cognee #1023 blocker) should assert that a `GRAPH_COMPLETION` search for "customers double-charged" mentions `dedup_sweeper`/`nightly-dedup-cron` BEFORE `forget(dataset="workarounds_v1_8")` and mentions `idempotency_guard` (not the v1.8 terms) AFTER — these are the exact isolated strings authored here.
- **Carry forward:** All 8 docs are well under the ~300-word budget (172-220 words each), keeping the corpus's `cognify()` cost low and within the project's spending constraints regardless of which LLM provider is active (Mistral, per 01-02's pivot).
- **No blockers** for Plan 01-04 or the rest of Phase 1.

---
*Phase: 01-foundation*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: seed/incidents/stripe-double-charge-incident.md
- FOUND: seed/incidents/stripe-double-charge-escalation.md
- FOUND: seed/incidents/login-timeout-incident.md
- FOUND: seed/incidents/api-latency-spike-incident.md
- FOUND: seed/workarounds_v1_8/nightly-dedup-workaround.md
- FOUND: seed/workarounds_v1_8/dedup-runbook-thread.md
- FOUND: seed/workarounds_v1_9/release-v1.9.md
- FOUND: seed/workarounds_v1_9/idempotency-fix-thread.md
- FOUND: seed/README.md
- FOUND: commit 8184400
- FOUND: commit 68e8797
- FOUND: commit dc4174b
