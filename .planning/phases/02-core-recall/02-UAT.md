---
status: complete
phase: 02-core-recall
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-PLAN.md]
started: 2026-07-02T12:25:20Z
updated: 2026-07-02T12:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Open the app
expected: Navigate to http://localhost:3000. PatchPilot loads showing a search bar and an upload panel. No console errors, no blank page.
result: pass

### 2. Load incident history
expected: If dataset status rows are not already "Ready", click "Load Sample Data". Status rows for incidents/workarounds progress and reach "Ready" (not stuck on "Processing").
result: pass

### 3. Search a bug
expected: Type "customers double-charged" and submit. A diagnosis card appears with a root-cause headline, expandable evidence snippets, and a version tag (e.g. v1.9).
result: pass

### 4. Reinforce the fix
expected: Click "Accept Fix" on the card. The control flips inline to "Reinforced ✓" (no modal, no page navigation).
result: pass
note: "Initially failed (see Gaps) -- root cause found and fixed live in frontend/app/page.tsx (commit c276b4e), retested and confirmed passing."

### 5. Recall the reinforced fix
expected: Search the SAME query again ("customers double-charged"). A new diagnosis card appears, grounded in real evidence — not an error, not "no results".
result: pass

### 6. Dismiss a diagnosis
expected: Click "Dismiss" on a diagnosis card. The card disappears immediately with no error message and no network failure toast.
result: pass

### 7. See a new release version stored
expected: Upload a release note (.md), content type "Release note", version "2.1". After it reaches "Ready", the dataset list shows a new `workarounds_v2_1 · N docs` row.
result: pass

### 8. Full loop, no raw errors
expected: Looking back across steps 1-7, no raw exception text or stack trace was ever shown in the UI — only short, human-readable messages (or none, on success).
result: pass

### 9. Ingest status badge reaches Ready (technical)
expected: Backend correctly reports "ready" once a dataset finishes cognify, not stuck on "processing" forever. Already re-verified via direct API polling this session (workarounds_v2_0 correctly flipped processing -> ready after the STATUS_MAP fix). Confirm this matches what you saw in step 2's status rows.
result: pass

### 10. Upload/search error states are short and human (technical)
expected: Any error you saw anywhere (bad file type, empty query, etc.) reads as a short plain sentence, never a raw Python/JS exception or stack trace.
result: pass

### 11. Upload panel visual fidelity (technical)
expected: Content-type selector, file picker, and the conditional release-version field render cleanly; the Retry button (if you saw a failed upload) is comfortably clickable, not a tiny hit target.
result: pass

### 12. Coverage: Phase 2 requirements observably true
expected: Taken together, steps 1-11 show: INGEST-01 (upload+background cognify), RECALL-01/02/03 (fused diagnosis card), FEEDBACK-01/02 (accept + reinforced re-search), RELEASE-01 (versioned dataset visible) all actually work in the browser — not just in tests.
result: pass

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Click Accept Fix; the control flips inline to Reinforced ✓ (no modal, no navigation)."
  status: resolved
  reason: "User reported: can't see \"Reinforced\""
  severity: major
  test: 4
  root_cause: "handleReSearch() in frontend/app/page.tsx shared the SearchBar's `isPending` flag; React batched setAccepted(true) with setIsPending(true), swapping the card for a skeleton before Reinforced ✓ ever painted."
  artifacts:
    - path: "frontend/app/page.tsx"
      issue: "re-search pending state shared with the manual-search pending state"
  missing: []
  debug_session: ""
  fix_commit: c276b4e
  reconfirmed: true
