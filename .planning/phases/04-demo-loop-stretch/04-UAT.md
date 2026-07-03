---
status: testing
phase: 04-demo-loop-stretch
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md, 04-06-SUMMARY.md]
started: 2026-07-03T11:02:44Z
updated: 2026-07-03T11:02:44Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 4
name: On-screen demo loop under 120s
expected: |
  Browser loop: search → upload release → drift badge flips 🟢→🔴 → Forget (row
  vanishes) → re-search returns new correct fix — visibly, under 120s.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill running backend (:8000) + frontend (:3000). Restart both from scratch. Backend boots clean, Cognee memory loads, and searching "customers double-charged" at http://localhost:3000 returns a grounded diagnosis (status ok). Catches startup/seed/lock bugs that only surface on fresh boot (this phase already hit a backend crash of that class).
result: pass

### 2. One-Click Reset Demo button (DEMO-01)
expected: On the main page, click "Reset Demo". A confirmation modal opens. Cancel dismisses it. Reopen → Confirm → button shows an in-flight "Resetting…" state (disabled), a reset animation plays, a success toast appears, and the dataset list refreshes to the restored snapshot state (workarounds_v1_8 present again).
result: pass

### 3. 3D Memory Graph tab + click-to-explore (GRAPH-01, STRETCH-04)
expected: Toggle from Search to the Graph tab. A 3D force-directed graph paints (WebGL) showing incidents/fixes/components as nodes with readable labels. Clicking a node surfaces its detail. (Backend was restarted so /graph serves ~141–174 nodes.)
result: pass
note: "Initially failed (blank graph). Fixed in commit c87c8a1 — callback-ref width measurement + switch to react-force-graph-3d (AFRAME). Re-tested: graph renders, node click works."

### 4. On-screen demo loop under 120s (DEMO-03)
expected: Perform the full loop in the browser — search → upload a release → drift badge flips (🟢→🔴) → Forget the stale workaround (its dataset row vanishes) → re-search returns the new correct fix — visibly, end to end under 120 seconds. (Automated HTTP harness already measured 57.2s; this is the on-camera human confirmation for the submission video.)
result: [pending]

### 5. Confidence badge on diagnosis card (STRETCH-01)
expected: Searching "customers double-charged" shows an "N% confidence" badge beside the version tag on the diagnosis card. An off-corpus query (e.g. a nonsense/cake query) shows no badge and no crash.
result: [pending]

### 6. Memory Health dashboard + Incident Timeline (STRETCH-02, STRETCH-03)
expected: Below the search view, a "Memory Health" card shows live 🟢/🟡/🔴 drift counts that update after upload/forget/reset. An "Incident Timeline" lists incidents/releases in chronological order. No visible PostCSS/render error on the page.
result: [pending]

### 7. Seed enrichment: 3 isolated docs, isolation invariant intact (04-01 D1)
expected: 3 new isolated seed docs added without breaking #1023 isolation or touching arc-critical docs.
result: pass
source: automated
coverage_id: 04-01-D1

### 8. Enriched 11-doc corpus, flip survives (04-01 D2)
expected: Re-seeded 11-doc corpus; before/after forget flip still produces FLIP OK + INCIDENTS SURVIVED.
result: pass
source: automated
coverage_id: 04-01-D2

### 9. Fresh reset snapshot captured + restores (04-01 D3)
expected: patchpilot_memory.snapshot.tar captured post-enrichment, contains workarounds_v1_8, restores cleanly.
result: pass
source: automated
coverage_id: 04-01-D3

### 10. POST /reset endpoint round-trip (04-02 D1, DEMO-01)
expected: /reset releases engine handles Windows-safe, restores snapshot, {status:reset}; live forget→reset→search round-trip passes with no PermissionError.
result: pass
source: automated
coverage_id: 04-02-D1

### 11. GET /graph exports real aggregated Cognee graph (04-03 G1, GRAPH-01)
expected: /graph returns real aggregated text-trimmed graph (174 nodes/362 links), no forbidden text fields, real extracted entities.
result: pass
source: automated
coverage_id: 04-03-G1

### 12. Demo-loop timing harness measures <120s (04-04 D1, DEMO-03)
expected: scripts/time_demo_loop.py drives the loop over real HTTP (never imports cognee), exit 0, TOTAL 57.2s, re-search ok post-forget (B-01).
result: pass
source: automated
coverage_id: 04-04-D1

### 13. Confidence score backend from CHUNKS verbose (04-05 D1, STRETCH-01)
expected: search.py verbose=True path, real [0,1] confidence in /search ok response; 17 unit tests pass; live curl confidence 0.77, off-corpus no_results no crash.
result: pass
source: automated
coverage_id: 04-05-D1

### 14. Confidence badge UI wiring type-safe (04-05 D2, STRETCH-01)
expected: SearchResponseOk.confidence added; DiagnosisCard renders badge when non-null, nothing when null; tsc clean.
result: pass
source: automated
coverage_id: 04-05-D2

### 15. Health dashboard component wired (04-06 D1, STRETCH-02)
expected: HealthDashboard.tsx uses shared DATASETS_QUERY_KEY, tallies drift counts to 🟢/🟡/🔴, mounted in page.tsx; tsc clean; SSR shell renders.
result: pass
source: automated
coverage_id: 04-06-D1

### 16. Incident timeline component wired (04-06 D2, STRETCH-03)
expected: IncidentTimeline.tsx renders chronological entries from shared cache, mounted in page.tsx; tsc clean; SSR shell renders.
result: pass
source: automated
coverage_id: 04-06-D2

## Summary

total: 16
passed: 13
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

- truth: "Graph tab renders a 3D force-directed graph (WebGL) of the real Cognee graph; clicking a node surfaces detail"
  status: resolved
  reason: "User reported: NO graph visible"
  severity: major
  test: 3
  resolution: "Fixed inline during UAT (commit c87c8a1): (1) width measured via callback ref + ResizeObserver instead of mount-time effect; (2) import react-force-graph-3d instead of umbrella react-force-graph to avoid 'AFRAME is not defined'."
  artifacts: [frontend/components/MemoryGraphView.tsx, frontend/package.json]
  missing: []
