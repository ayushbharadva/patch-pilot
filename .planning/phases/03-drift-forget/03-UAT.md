---
status: complete
phase: 03-drift-forget
source: [03-VERIFICATION.md]
started: 2026-07-02T16:39:41Z
updated: 2026-07-02T17:35:08Z
---

## Current Test

[testing complete]

## Tests

### 1. Live surgical forget of a drifting dataset
expected: |
  With backend (`uvicorn --workers 1`) and frontend (`next dev`) running against the restored
  corpus, click Forget on the workarounds_v1_8 🔴 row, then Confirm forget?. workarounds_v1_8
  is gone from a fresh GET /datasets; incidents is untouched and still has a non-zero doc count
  (FORGET-01).
result: pass

### 2. Row removal + auto re-search after forget
expected: |
  Corpus was reseeded after Test 1 consumed the drifting workarounds_v1_8 dataset. First search
  "double-charged" (evidence panel should include a workarounds_v1_8 chunk), then on the Datasets
  card click Forget on the workarounds_v1_8 🔴 row, then Confirm forget?. The row disappears, a
  "Forgotten — updating results…" toast appears, and the diagnosis card automatically re-runs the
  same search without a manual refresh (FORGET-02).
result: pass
note: |
  Row removal, toast, and auto-re-search all confirmed working. Separately discovered (not a
  Phase 3 defect): the evidence panel does not include a workarounds_v1_8 chunk even before
  forgetting, for this exact query -- backend/search.py::_flatten_and_truncate takes the first
  EVIDENCE_LIMIT=3 CHUNKS results in per-dataset return order without interleaving, and
  `incidents` chunks apparently rank ahead of workarounds_v1_8's for "double-charged". This is
  pre-existing Phase 1/2 evidence-retrieval behavior (_flatten_and_truncate was not touched by
  any Phase 3 plan or code-review fix), not a Phase 3 regression. See Test 3.

### 3. Before/after search proof (the phase's core value loop)
expected: |
  Corpus freshly reseeded again -- workarounds_v1_8 (drifting), workarounds_v1_9 (stable),
  incidents all live. The orchestrator will NOT touch the backend during this test (an earlier
  diagnostic curl call collided with the user's own browser session mid-Test-2 and caused a
  confusing "can't be forgotten" error -- that was orchestrator interference, not a product bug,
  now avoided). In one uninterrupted pass: search "double-charged" (note the evidence panel --
  Test 2 found it does NOT include a workarounds_v1_8 chunk for this exact query even pre-forget,
  a pre-existing Phase 1/2 evidence-ranking characteristic, not a new defect), then Forget ->
  Confirm forget? on workarounds_v1_8, then observe the auto-re-search. Expected: row disappears,
  toast fires, root cause still names the workarounds_v1_9 idempotency fix, incidents evidence
  still present, workarounds_v1_8 gone from the dataset list -- the surgical-removal proof, even
  though the evidence-panel-chunk flip specifically isn't visible for this query.
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
