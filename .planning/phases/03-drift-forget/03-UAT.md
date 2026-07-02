---
status: testing
phase: 03-drift-forget
source: [03-VERIFICATION.md]
started: 2026-07-02T16:39:41Z
updated: 2026-07-02T16:39:41Z
---

## Current Test

number: 1
name: Live surgical forget of a drifting dataset
expected: |
  With backend (`uvicorn --workers 1`) and frontend (`next dev`) running against the restored
  corpus, click Forget on the workarounds_v1_8 🔴 row, then Confirm forget?. workarounds_v1_8
  is gone from a fresh GET /datasets; incidents is untouched and still has a non-zero doc count
  (FORGET-01).
awaiting: user response

## Tests

### 1. Live surgical forget of a drifting dataset
expected: |
  With backend (`uvicorn --workers 1`) and frontend (`next dev`) running against the restored
  corpus, click Forget on the workarounds_v1_8 🔴 row, then Confirm forget?. workarounds_v1_8
  is gone from a fresh GET /datasets; incidents is untouched and still has a non-zero doc count
  (FORGET-01).
result: [pending]

### 2. Row removal + auto re-search after forget
expected: |
  With a search already on screen, forget the drifting dataset and watch the Datasets card and
  diagnosis card. The row disappears, a "Forgotten — updating results…" toast appears, and the
  last query auto-re-runs without a manual refresh (FORGET-02).
result: [pending]

### 3. Before/after search proof (the phase's core value loop)
expected: |
  Search "double-charged" before forgetting workarounds_v1_8 (note the evidence panel includes
  a workarounds_v1_8 chunk), then Forget → Confirm forget?, then compare the auto-re-searched
  diagnosis card and evidence panel. The re-searched evidence panel no longer contains any
  workarounds_v1_8 chunk, the root cause names the workarounds_v1_9 idempotency fix, and
  incidents evidence is still present — visually unambiguous before/after flip, completing in
  well under 120 seconds (FORGET-02, ROADMAP SC4, PatchPilot's core value loop).
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
