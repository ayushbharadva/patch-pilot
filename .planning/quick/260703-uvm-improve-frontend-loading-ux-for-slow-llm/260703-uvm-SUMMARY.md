---
phase: 260703-uvm
plan: 01
subsystem: frontend
status: complete
tags: [frontend, ux, loading, accessibility, react, tailwind]
requires: [D-20, D-11, D-12, D-22, D-05, D-24]
provides: [SearchProgress]
affects:
  - frontend/components/SearchProgress.tsx
  - frontend/components/DiagnosisCard.tsx
  - frontend/app/page.tsx
  - frontend/components/FileStatusRow.tsx
tech-stack:
  added: []
  patterns:
    - "Shared progressive-message client component (useState/useEffect/setInterval) reused by two call sites"
    - "aria-hidden cycling text + single stable sr-only label inside an aria-live region (no SR spam)"
    - "cn() conditional class (animate-pulse) gated on status"
key-files:
  created:
    - frontend/components/SearchProgress.tsx
  modified:
    - frontend/components/DiagnosisCard.tsx
    - frontend/app/page.tsx
    - frontend/components/FileStatusRow.tsx
decisions:
  - "SearchProgress cycling/reassurance copy is aria-hidden; a fixed sr-only label carries the one announcement because both call sites render inside page.tsx's aria-live=polite section"
  - "Re-search branch keeps the accepted card mounted (Reinforced ✓) — SearchProgress is rendered inline below, no DiagnosisCardSkeleton swap-in (D-11/D-12 preserved)"
  - "messages defaults to a module-level constant for stable identity so the interval effect does not restart every render"
  - "No live elapsed-seconds counter on processing rows (would need per-row start plumbing from UploadPanel) — pulse + caption only"
metrics:
  duration: ~3m
  completed: 2026-07-03
  tasks: 3
  files: 4
---

# Phase 260703-uvm Plan 01: Improve Frontend Loading UX for Slow LLM Summary

Made the 5–20s LLM-bound search and upload waits feel alive with a shared `SearchProgress` component (staged messages + reassurance line, screen-reader-safe) reused by the initial-search skeleton and the re-search indicator, plus a pulsing "Processing" badge and reassurance caption on upload rows — all pure client-component React + Tailwind, no backend/latency/dependency changes.

## What Was Built

### Task 1 — `frontend/components/SearchProgress.tsx` (new, commit `4a2fc9c`)
A `"use client"` component that:
- Renders staged messages (`Searching incident memory…` → `Analyzing root cause…` → `Gathering supporting evidence…`), advancing every ~4s via `setInterval` with a functional updater that clamps at the last index (`Math.min(prev + 1, messages.length - 1)`) — it does not loop back.
- Reveals a persistent reassurance line (`Still working — the first search warms up the memory graph.`) after ~12s via `setTimeout`.
- Clears both the interval and the timeout in effect cleanup on unmount (T-uvm-02: no leaked timers, no state-set-after-unmount; the component mounts only while pending).
- Exposes the cycling + reassurance copy as `aria-hidden` and carries a single stable `sr-only` label (default `Searching incident memory. This can take up to 20 seconds.`) so the surrounding `aria-live="polite"` region announces once instead of every 4s.
- Accepts prop overrides (`messages`, `intervalMs`, `reassuranceDelayMs`, `reassuranceMessage`, `srLabel`, `showSpinner`, `className`), all defaulting to module-level constants for stable identities. `messages` defaults to a module constant and the docblock warns callers not to pass an inline array literal (would restart Effect A each render).
- Effect deps satisfy `react-hooks/exhaustive-deps`: Effect A `[intervalMs, messages]`, Effect B `[reassuranceDelayMs]`.

### Task 2 — wire into skeleton + re-search (commit `3e8287e`)
- `DiagnosisCard.tsx`: imported `SearchProgress`; replaced the static `Searching memory…` paragraph in `DiagnosisCardSkeleton` with `<SearchProgress className="px-(--card-spacing)" />`. Skeleton bars (header + 3 evidence rows) left untouched so there is no layout shift. Docblock updated to note the label is now progressive.
- `app/page.tsx`: imported `SearchProgress`; replaced ONLY the `isReSearching` branch's bare paragraph with `<SearchProgress showSpinner srLabel="Updating diagnosis with reinforced memory." />`. The `{isReSearching ? … : null}` structure and the comment block on `isReSearching` are intact. `isReSearching` remains distinct from `isPending`; no `DiagnosisCardSkeleton` is swapped in for re-search and the accepted card stays mounted (D-11/D-12).

### Task 3 — processing pulse + caption (commit `0b876b9`)
- `FileStatusRow.tsx`: imported `cn`; added `PROCESSING_MESSAGE` module constant (`Building the knowledge graph — this can take a few seconds.`) with a D-05/D-22 comment mirroring the D-24 failed-row caption. The Badge className became a `cn()` call appending `animate-pulse` only when `status === "processing"`. Added a `{status === "processing" ? <p…> : null}` caption block right after the failed caption. Uploading/ready/failed states, the destructive failed variant, the 44px (`h-11 min-h-11`) Retry button and its D-23 conditional render, and the D-24 copy are all unchanged. No elapsed-seconds counter (explicitly out of scope).

## Verification

All three gates run from `frontend/` and pass clean:

| Gate | Command | Result |
|------|---------|--------|
| Lint | `npm run lint` (eslint) | PASS — no errors, no `react-hooks/exhaustive-deps` warnings |
| Typecheck | `npx tsc --noEmit` | PASS — clean |
| Build | `npm run build` (next build) | PASS — "Compiled successfully in 1368ms", TypeScript checked, 4/4 static pages generated |

No real backend searches/uploads were triggered (would bill cognify on the Mistral free tier). A headless browser visual check was not available in this environment; reasoned behavior walkthrough below.

### Behavior walkthrough

**Improvement 1 — DiagnosisCardSkeleton (initial search)**
- `0s`: skeleton bars render; `SearchProgress` shows `Searching incident memory…`; a screen reader announces once: "Searching incident memory. This can take up to 20 seconds."
- `~4s`: visible line changes to `Analyzing root cause…` (SR silent — cycling text is aria-hidden).
- `~8s`: visible line changes to `Gathering supporting evidence…` and clamps there (does not loop back).
- `~12s+`: a second smaller (`text-xs`) reassurance line `Still working — the first search warms up the memory graph.` appears below and stays. When the real diagnosis arrives, the skeleton unmounts and both timers clear.

**Improvement 2 — re-search indicator (Accept and Forget)**
- On Accept, `AcceptDismissControls` flips to `Reinforced ✓` and calls `onReSearch` → `handleReSearch` sets `isReSearching`. Because `isReSearching` is separate from `isPending`, the just-accepted `DiagnosisCard` stays mounted (Reinforced ✓ still painted) and `SearchProgress` renders inline below it with a spinner (`Loader2` `animate-spin`) plus the same progressive staged text. No `DiagnosisCardSkeleton` swap-in.
- Forget flows through `DatasetList onForgotten` → the same `handleReSearch`, so it gets the identical indicator with no per-trigger branching.
- When the re-search resolves, `setResponse` swaps the card directly to the new diagnosis and `SearchProgress` unmounts (timers cleared). SR announces once: "Updating diagnosis with reinforced memory."

**Improvement 3 — upload Processing rows**
- A row in `processing` shows the outline Badge with `animate-pulse` (visibly breathing) plus the caption `Building the knowledge graph — this can take a few seconds.`
- `uploading`, `ready`, and `failed` rows are visually unchanged; `failed` keeps its destructive badge, D-24 caption, and 44px Retry button (D-23). No pulse or caption on non-processing rows.

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes required; lint, typecheck, and build were clean on first run of each task.

## Threat Flags

None. Presentation-only change: no new trust boundary, no new network call, no new dependency, no user-data interpolation (all displayed strings are hardcoded module constants). T-uvm-02 (timer DoS) is mitigated by interval/timeout cleanup on unmount, as implemented.

## Known Stubs

None.

## Self-Check: PASSED
- Files exist: SearchProgress.tsx, DiagnosisCard.tsx, page.tsx, FileStatusRow.tsx — all FOUND.
- Commits exist: 4a2fc9c, 3e8287e, 0b876b9 — all FOUND.
