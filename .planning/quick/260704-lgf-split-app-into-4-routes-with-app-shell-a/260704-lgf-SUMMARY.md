---
phase: 260704-lgf
plan: 01
subsystem: frontend
tags: [routing, app-shell, react-context, mvp-ui]
status: complete
dependency-graph:
  requires: []
  provides:
    - "frontend/lib/search-session.tsx (SearchSessionProvider + useSearchSession)"
    - "frontend/components/AppShell.tsx (topbar nav + LifecycleStrip + ResetButton)"
    - "4 routes: /app, /app/memory, /app/graph, /app/activity"
  affects:
    - "frontend/components/DiagnosisCard.tsx (reinforcedFrom prop)"
    - "frontend/components/ResetButton.tsx (onReset prop)"
    - "frontend/components/UploadPanel.tsx (remember lifecycle event)"
    - "frontend/components/SearchBar.tsx (sticky offset)"
tech-stack:
  added: []
  patterns:
    - "React context provider mounted in a nested Next.js server layout to survive client-side route navigation"
key-files:
  created:
    - frontend/lib/search-session.tsx
    - frontend/components/AppShell.tsx
    - frontend/components/LifecycleStrip.tsx
    - frontend/components/SessionStats.tsx
    - "frontend/app/(mvp)/app/layout.tsx"
    - "frontend/app/(mvp)/app/memory/page.tsx"
    - "frontend/app/(mvp)/app/graph/page.tsx"
    - "frontend/app/(mvp)/app/activity/page.tsx"
  modified:
    - "frontend/app/(mvp)/app/page.tsx"
    - frontend/components/SearchBar.tsx
    - frontend/components/DiagnosisCard.tsx
    - frontend/components/UploadPanel.tsx
    - frontend/components/ResetButton.tsx
decisions:
  - "SearchSessionProvider lives in the nested server layout app/(mvp)/app/layout.tsx, never in a page, so diagnosis/lifecycle state survives client-side navigation between the 4 routes."
  - "isReSearching stayed a separate flag from isPending (transplanted verbatim from the old page.tsx) so an accept-triggered re-search never swaps the just-accepted 'Reinforced ✓' card for the skeleton."
  - "reinforcedFrom uses a !== undefined presence check (not truthiness) so a null prior confidence still renders the 'Reinforced · X% confidence' fallback badge, distinct from the prop being absent entirely."
metrics:
  duration: ~45min
  completed: 2026-07-04
---

# Phase 260704-lgf Plan 01: Split /app into 4 routes with shell + depth kit Summary

One-liner: Split the single-page MVP dashboard into 4 routes (Diagnose/Memory/Graph/Activity) under a shared sticky-topbar shell, moving all search/diagnosis state into a `SearchSessionProvider` mounted in a nested server layout so it survives client-side navigation, then layered in a lifecycle strip, session-stat tiles, and a confidence-delta badge.

## What was built

- **`frontend/lib/search-session.tsx`** — `SearchSessionProvider` + `useSearchSession()` hook. Holds `response`, `lastQuery`, `isPending`, `hasSearched`, `isReSearching` (kept separate from `isPending` per the transplanted page.tsx comment), `reinforcement`, and `stats: Record<LifecycleOp, number>`. Exposes `setSearchPending`, `setLastQuery`, `finishSearch`, `reSearch(reason)`, `markReinforced`, `recordLifecycleEvent`, `resetSession`.
- **`frontend/components/AppShell.tsx`** — sticky glass topbar (`h-14`, `z-20`) with the PatchPilot wordmark, a `Link`-based glass-pill nav (Diagnose/Memory/Graph/Activity, active state via `aria-current="page"` + `pathname` matching), the `LifecycleStrip` (`hidden lg:flex`), and `ResetButton` wired to `resetSession`.
- **`frontend/app/(mvp)/app/layout.tsx`** — new nested SERVER layout: `<SearchSessionProvider><AppShell>{children}</AppShell></SearchSessionProvider>`. This is the backbone that keeps state alive across route changes (a page-level provider would remount and wipe state on every nav).
- **4 routes**: `/app` (Diagnose — SearchBar + DiagnosisCard/EmptyState + SessionStats, rewritten to read all state from `useSearchSession()`), `/app/memory` (Upload + DatasetList + HealthDashboard), `/app/graph` (MemoryGraphView full-page), `/app/activity` (IncidentTimeline).
- **Depth kit**: `LifecycleStrip` (4 mono nodes remember→recall→improve→forget, lit once `stats[op] > 0`), `SessionStats` (4 glass tiles: Recalls, Reinforcements, Drift events [live-derived from the shared datasets query], Forgotten), a `reinforcedFrom` prop on `DiagnosisCard` rendering an "X% → Y% after reinforcement" delta badge, `UploadPanel` recording "remember" on upload-accept and sample-load, `ResetButton` gaining `onReset`, and the Memory page's forget handler firing a "View diagnosis" action-toast after the cross-route re-search resolves.
- `SearchBar`'s sticky offset moved from `top-0` to `top-14` so it pins directly below the new topbar.

## Deviations from Plan

None — plan executed exactly as written. All architectural choices (provider location, isReSearching/isPending separation, reinforcedFrom presence semantics, toast-with-action over auto-navigate) were locked by the user-approved spec and implemented verbatim.

## Verification

- `npm run lint` — clean, no warnings or errors.
- `npm run typecheck` (`tsc --noEmit`) — clean after every task.
- `npm run build` — succeeds; route manifest confirms `/app`, `/app/activity`, `/app/graph`, `/app/memory` all emitted as static routes.
- `npm test` (marketing vitest suite) — 6 test files / 16 tests, all passed (untouched marketing tree stays green).
- No gate failures — Task 3's fix-and-recommit branch was not needed.

## Known Stubs

None.

## Threat Flags

None — this is a client-side route/state refactor plus additive UI; no new endpoint, trust boundary, or untrusted-input sink introduced (matches the plan's threat model, all three registered threats disposed as `accept`).

## Manual demo checklist (human step, not run in this environment)

No browser-automation tooling is installed in this environment, matching prior-phase notes. Before the demo, a human should run the 11-step manual checklist from the plan's Task 3 `<human-check>` block once in a browser (topbar/nav states, state survival across routes, the forget→re-search→toast→flipped-diagnosis beat, and the reinforcement delta badge appearing/disappearing correctly).

## Self-Check: PASSED

Verified files exist and commits are present — see below.
