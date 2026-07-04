---
phase: 01-foundation
plan: 04
subsystem: content
tags: [seed-cli, cognee-forget, demo-proof, snapshot, memory-lifecycle]

# Dependency graph
requires:
  - phase: 01-02
    provides: "backend/cognee_config.py (config-before-import + CACHING=false), backend/datasets.py (locked dataset constants), backend/cognee_patches.py (Mistral-provider fixes)"
  - phase: 01-03
    provides: "seed/incidents, seed/workarounds_v1_8, seed/workarounds_v1_9 -- 8-doc corpus with isolated entity names (dedup_sweeper/nightly-dedup-cron vs idempotency_guard)"
provides:
  - "seed/seed_cli.py -- --seed / --flip / --reset CLI; the Phase-1 headline before/after forget-flip proof"
  - "scripts/snapshot_memory.py -- tar save/restore of .patchpilot_memory/ for $0 reseeds"
  - "Empirical proof (this run): FLIP OK + INCIDENTS SURVIVED against the real 8-doc corpus, not a spike fixture"
affects: [phase-2-drift-detection, phase-3-demo-loop, backend-api-search-forget-endpoints]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reused config-before-import + cognee_patches import order from backend/main.py and backend/persistence_check.py verbatim (Pattern 1/5 from 01-01/01-02)"
    - "Per-dataset scoped cognify(datasets=[name]) x3, never bare cognify() (Pattern 2 from 01-01)"
    - "Before/after flip via global search() (Pattern 3 from 01-RESEARCH.md) -- deliberately unscoped so the printed diff shows the full per-dataset result set disappearing/surviving across the forget"
    - "Pure-filesystem tar snapshot module with no cognee import (new, minor pattern) -- snapshot/restore never needs to resolve Cognee's LLM/embedding provider"

key-files:
  created:
    - seed/seed_cli.py
    - scripts/snapshot_memory.py
  modified: []

key-decisions:
  - "flip() calls cognee.search() WITHOUT a datasets= filter for the BEFORE/AFTER comparison (matching 01-RESEARCH.md Pattern 3 literally), so the printed result is Cognee's own per-dataset-grouped answer set across every currently-registered dataset, not just the three seed datasets. This surfaced leftover datasets from Plan 01-01/01-02 (spike_incident) in the demo output -- functionally harmless (the flip and isolation assertions both still passed cleanly) but noisier than an ideal demo read. Documented as a known cosmetic issue for Phase 3, not fixed here (out of this plan's scope per SCOPE BOUNDARY: pre-existing leftover state from earlier plans, not caused by this plan's code)."
  - "INCIDENTS SURVIVED check explicitly scopes datasets=[INCIDENTS] (unlike the main flip query) so the isolation assertion is unambiguous and immune to the same leftover-dataset noise."
  - "scripts/snapshot_memory.py intentionally does not import cognee or backend.cognee_config -- pure tarfile/shutil work, verified faster and simpler, and correctly avoids resolving an LLM provider for a filesystem operation."

requirements-completed: [DEMO-02, INGEST-02, INGEST-03]

coverage:
  - id: D1
    description: "Seed CLI ingests all 8 seed docs per-dataset (add + scoped cognify) into incidents / workarounds_v1_8 / workarounds_v1_9"
    requirement: "INGEST-02"
    verification:
      - kind: other
        ref: ".venv/bin/python seed/seed_cli.py --seed -> SEED OK printed; .patchpilot_memory/databases/ non-empty after run"
        status: pass
    human_judgment: false
  - id: D2
    description: "The CLI prints a DIFFERENT GRAPH_COMPLETION answer for the same query BEFORE vs AFTER forget(workarounds_v1_8)"
    requirement: "DEMO-02"
    verification:
      - kind: other
        ref: ".venv/bin/python seed/seed_cli.py --flip | tee /tmp/pp_flip.log -> FLIP OK printed; BEFORE answer contains dedup_sweeper/nightly-dedup-cron, AFTER answer contains idempotency_guard and no v1.8 terms"
        status: pass
    human_judgment: false
  - id: D3
    description: "After forget, the incidents dataset still returns results (surgical forget did not touch it)"
    requirement: "INGEST-03"
    verification:
      - kind: other
        ref: "Same --flip run -> INCIDENTS SURVIVED printed with a real GRAPH_COMPLETION answer describing the Stripe double-charge incident, scoped to datasets=[INCIDENTS]"
        status: pass
    human_judgment: false
  - id: D4
    description: "Tarball snapshot of .patchpilot_memory/ enables zero-cost re-runs (only cognify costs money)"
    verification:
      - kind: other
        ref: ".venv/bin/python scripts/snapshot_memory.py --save -> patchpilot_memory.snapshot.tar created; moved .patchpilot_memory/ aside, ran --restore, then ran a real search() against the restored tree with ZERO add()/cognify() calls -> real grounded GRAPH_COMPLETION answer returned"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-07-02
status: complete
---

# Phase 1 Plan 04: Seed CLI + Before/After Forget-Flip Proof Summary

**`seed/seed_cli.py` ingests the full 8-doc corpus into three isolated Cognee datasets and proves the Phase-1 headline claim live: the same GRAPH_COMPLETION query returns the `dedup_sweeper`/`nightly-dedup-cron` workaround before `forget(workarounds_v1_8)` and the `idempotency_guard` fix after, while the durable `incidents` dataset survives untouched — backed by a tar-snapshot save/restore mechanism (`scripts/snapshot_memory.py`) proven to serve a real recall with zero additional `cognify()` cost.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-01T~19:58:00Z (approx, per STATE.md session position)
- **Completed:** 2026-07-01T20:07:24Z
- **Tasks:** 3 (all auto)
- **Files modified:** 2 created (seed/seed_cli.py, scripts/snapshot_memory.py)

## Accomplishments

- `seed/seed_cli.py --seed` ingested all 8 seed docs via `add()` + three separate scoped `cognify(datasets=[name])` calls into `incidents`, `workarounds_v1_8`, `workarounds_v1_9` — confirmed via real graph-extraction log lines and a non-empty `.patchpilot_memory/databases/` afterward
- `seed/seed_cli.py --flip` ran the full before/after proof against the **real 8-doc corpus** (not a throwaway spike fixture): BEFORE named `dedup_sweeper`/`nightly-dedup-cron`; AFTER `forget(dataset="workarounds_v1_8")` named only `idempotency_guard`; printed `FLIP OK`
- The same run confirmed surgical isolation: a `datasets=[INCIDENTS]`-scoped search after the forget returned a real, unaffected answer describing the Stripe double-charge incident; printed `INCIDENTS SURVIVED`
- `scripts/snapshot_memory.py --save`/`--restore` verified end-to-end beyond the plan's minimum bar: moved the live `.patchpilot_memory/` tree aside, restored it from the tarball, then ran a fresh `search()` against the restored tree with **zero** `add()`/`cognify()` calls and got back a real grounded answer — proving the $0-reseed mechanism actually works, not just that the tar file exists
- `seed/seed_cli.py --reset` wired to `scripts/snapshot_memory.py`: restores from snapshot if one exists, else falls back to `prune.prune_data()` + `prune.prune_system()` + full reseed
- No secret literal found in any tracked file under `seed/` or `scripts/` (grep for `sk-`/hardcoded key patterns — clean)

## Task Commits

Each task was committed atomically:

1. **Task 1: Seed loader — per-dataset add + scoped cognify (INGEST-02, INGEST-03)** - `445ca74` (feat)
2. **Task 2: Before/after flip — search -> forget(workarounds_v1_8) -> re-search (DEMO-02)** - `bae93dc` (feat)
3. **Task 3: Zero-cost reseed snapshot + wire --reset** - `1b7855d` (feat)

_Note: this SUMMARY commit follows as a separate `docs(...)` metadata commit._

## Files Created/Modified

- `seed/seed_cli.py` - CLI with `--seed`/`--flip`/`--reset` flags and a no-flag default (seed then flip). `seed()` iterates `backend.datasets`' three constants, reading each `seed/<folder>/*.md` and calling `add()` then a scoped `cognify()`. `flip()` runs the BEFORE/AFTER `GRAPH_COMPLETION` comparison, asserts the answers differ, and separately asserts the `incidents` dataset survives. `reset()` delegates to the snapshot module or falls back to prune+reseed.
- `scripts/snapshot_memory.py` - `--save` tars `.patchpilot_memory/` into `patchpilot_memory.snapshot.tar`; `--restore` extracts it back (using `filter="data"` for Python 3.14's tarfile extraction-filter default). Pure filesystem module, no `cognee` import.

## Decisions Made

See `key-decisions` in frontmatter: (1) the flip query intentionally runs unscoped `search()` matching 01-RESEARCH.md's documented Pattern 3, which surfaced harmless leftover datasets from earlier plans in the printed diff; (2) the incidents-survival check is explicitly dataset-scoped for an unambiguous assertion; (3) the snapshot module avoids importing `cognee` entirely since it is pure tar/filesystem work.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `tarfile.extractall()` requires an explicit `filter=` argument on Python 3.14**

- **Found during:** Task 3 (writing `scripts/snapshot_memory.py`)
- **Issue:** Python's tarfile extraction-filter deprecation cycle (PEP 706) reached its default-enforcement point on the installed Python 3.14.6 — calling `extractall()` without a `filter=` argument either warns loudly or (depending on point release) raises, rather than silently using the old unrestricted behavior.
- **Fix:** Passed `filter="data"` explicitly to `tarfile.extractall()`, which is the documented safe default (strips absolute paths, `..` traversal, device files, etc.) and is appropriate here since the tarball only ever contains our own `.patchpilot_memory/` tree.
- **Files modified:** `scripts/snapshot_memory.py`
- **Verification:** `--restore` ran cleanly with no warnings; restored tree byte-for-byte usable (confirmed via a real post-restore search returning correct content)
- **Committed in:** `1b7855d` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (blocking/Rule 3, Python-version compatibility)
**Impact on plan:** No scope creep. Every artifact in the plan's `<artifacts_produced>` list was created exactly as specified; the fix was required for `--restore` to work correctly at all on the project's pinned Python 3.14.6.

## Issues Encountered

- **Leftover datasets from earlier plans (`spike_incident`, `healthcheck`, `canary`) appear in the unscoped `flip()` search output.** These are artifacts of Plan 01-01's spike and Plan 01-02's health/persistence checks that were never fully pruned from the shared `.patchpilot_memory/` tree (the spike's own cleanup step ran `prune.prune_data()+prune.prune_system()`, but subsequent plans' health-check/persistence-check runs recreated `healthcheck`/`canary` entries, and `spike_incident` content was apparently never fully purged). This is out of scope for this plan per the SCOPE BOUNDARY rule (pre-existing state from earlier plans, not caused by this plan's code) and did not affect either assertion (`FLIP OK` and `INCIDENTS SURVIVED` both passed cleanly). Flagged for Phase 2/3 planning: a `prune`-based `--reset` run (already wired in this plan) will clear all of this leftover noise the next time it executes without a snapshot present, since `prune.prune_data()+prune.prune_system()` wipes every dataset, not just `workarounds_v1_8`.

## User Setup Required

None. This plan is pure code (Python CLI scripts); the LLM/embedding provider (Mistral free tier) was already configured and verified in Plan 01-01/01-02.

## Known Stubs

None. Both CLI scripts are fully functional — verified via real, live Cognee API calls (not mocked), including a genuine zero-cost restore-then-search round trip.

## Threat Flags

None. Both new files stay within the threat model already registered in the plan's `<threat_model>` (T-01-01 API key handling via `cognee_config`, T-01-02 gitignored memory/snapshot artifacts, T-01-03 bounded cognify cost via small corpus + snapshot reuse) — no new network endpoints, auth paths, or trust-boundary-crossing surface was introduced.

## Next Phase Readiness

- **Ready:** Phase 1's exit gate (ROADMAP SC3, the visible search -> forget -> re-search flip) is empirically proven against the real seed corpus, not just a spike fixture. `seed/seed_cli.py` is the reusable demo entrypoint for Phase 3's actual UI-driven demo loop and for Phase 2's drift-detection work to build on.
- **Carry forward:** `.patchpilot_memory/` currently has `workarounds_v1_8` forgotten (from this plan's own `--flip` verification run) and a `patchpilot_memory.snapshot.tar` sitting at the repo root (gitignored, not committed) capturing a fully-seeded pre-forget state. Any future work that wants a fresh "all three datasets present" starting point should run `seed/seed_cli.py --reset` (restores that snapshot for $0) rather than `--seed` again.
- **Carry forward:** The unscoped `flip()` search surfaces leftover non-seed datasets (`spike_incident`, `healthcheck`, `canary`) in its printed diff. Cosmetically noisy but functionally harmless; a future demo-polish pass (Phase 3) may want to either scope the flip query to `datasets=[INCIDENTS, WORKAROUNDS_V1_8, WORKAROUNDS_V1_9]` for a cleaner read, or run a one-time `--reset`-triggered prune to clear the leftover datasets before the real demo recording.
- **No blockers** for Phase 2.

---
*Phase: 01-foundation*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: seed/seed_cli.py
- FOUND: scripts/snapshot_memory.py
- FOUND: .planning/phases/01-foundation/01-04-SUMMARY.md
- FOUND: commit 445ca74
- FOUND: commit bae93dc
- FOUND: commit 1b7855d
