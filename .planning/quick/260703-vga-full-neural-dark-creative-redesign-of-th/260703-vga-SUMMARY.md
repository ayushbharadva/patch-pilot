---
phase: 260703-vga
plan: 01
subsystem: frontend
tags: [ui, redesign, theme, tailwind, neural-dark, multi-agent]
requires: []
provides:
  - "Elevated neural-dark theme (dark-by-default) with aurora atmosphere, glassmorphism, glow, gradient type, and motion across every page surface"
  - "Shared design system: frontend/DESIGN-SYSTEM.md + globals.css utilities (.glass/.glow-*/.text-gradient/.animate-*) + AuroraBackground + elevated ui/* primitives"
affects: [theme, all-frontend-components]
tech-stack:
  added: []
  patterns:
    - "Foundation-first then parallel-fan-out multi-agent orchestration: one agent sets tokens/primitives/atmosphere (barrier), four agents restyle disjoint component sets in parallel; orchestrator commits between stages to avoid git-index races (agents edit-only)"
    - "Dark-by-default via hardcoded <html class=dark> + neural-dark palette on :root (zero JS/hydration dependency; next-themes left unused)"
    - "Redefining existing CSS design-token VALUES (names unchanged) re-skins every component that uses bg-card/text-foreground/drift-* with no per-component edit"
key-files:
  created:
    - frontend/components/AuroraBackground.tsx
    - frontend/DESIGN-SYSTEM.md
  modified:
    - frontend/app/globals.css
    - frontend/app/layout.tsx
    - frontend/components/ui/card.tsx
    - frontend/components/ui/button.tsx
    - frontend/components/ui/input.tsx
    - frontend/components/ui/skeleton.tsx
    - frontend/app/page.tsx
    - frontend/components/SearchBar.tsx
    - frontend/components/ResetButton.tsx
    - frontend/components/DiagnosisCard.tsx
    - frontend/components/SearchProgress.tsx
    - frontend/components/DatasetList.tsx
    - frontend/components/UploadPanel.tsx
    - frontend/components/FileStatusRow.tsx
    - frontend/components/MemoryGraphView.tsx
    - frontend/components/HealthDashboard.tsx
    - frontend/components/IncidentTimeline.tsx
key-decisions:
  - "Creative direction 'Neural Dark — living incident brain' chosen by the user from 4 options (vs Mission Control, Editorial Light, Bento Spatial)."
  - "The generic 'claude' subagent type returned empty/garbage runs twice (0 tool uses); the foundation was built directly by the orchestrator, and the parallel fan-out used the proven gsd-executor type."
  - "Dark forced via hardcoded <html class=dark> rather than next-themes wiring — zero hydration/flash risk for a demo the day before submission; next-themes stays installed but unused."
  - "Agents edited files only (no git); the orchestrator committed between stages so 4 parallel agents never raced the git index."
  - "Restyle-only guarantee: no exported names, props, react-query keys, API calls, D-xx behaviors, or a11y affordances changed — the search->drift->forget->re-search core loop and all flows are untouched."
requirements-completed: [QUICK-260703-vga-redesign]
coverage:
  - id: D1
    description: "App renders elevated neural-dark by default with aurora atmosphere, glass cards, glow, gradient type"
    verification:
      - kind: build
        ref: "npm run build — compiled + prerendered / as static without render errors"
        status: pass
    human_judgment: true
  - id: D2
    description: "Every page surface redesigned coherently via shared foundation tokens/primitives"
    verification:
      - kind: other
        ref: "4 parallel agents restyled disjoint component sets against frontend/DESIGN-SYSTEM.md; all reused shared utilities, no new hex/deps"
        status: pass
    human_judgment: true
  - id: D3
    description: "Zero behavioral/API/a11y regressions; core loop + D-xx contracts intact"
    verification:
      - kind: other
        ref: "restyle-only constraint enforced per agent; each report confirms wiring/props/behaviors preserved"
        status: pass
        human_judgment: true
  - id: D4
    description: "lint + typecheck + build all green"
    verification:
      - kind: build
        ref: "npx tsc --noEmit clean; npm run lint clean; npm run build success"
        status: pass
    human_judgment: false
duration: ~40min
completed: 2026-07-03
status: complete
---

# Quick Task 260703-vga: Full Neural-Dark Creative Redesign

**Redesigned the entire PatchPilot frontend to a "Neural Dark — living incident brain" aesthetic — elevated dark theme, aurora/particle atmosphere, glassmorphism, glow, gradient typography, and motion across every surface — via a foundation-first then parallel-fan-out multi-agent orchestration, restyle-only, with the demo loop and all API wiring fully intact.**

## Orchestration

- **Direction** locked with the user: Neural Dark (chosen over Mission Control / Editorial Light / Bento Spatial).
- **Stage 0 — Foundation (orchestrator, committed `a1eb6c4`):** rewrote `globals.css` to an elevated neural-dark palette (deep space-black + violet undertone, indigo→violet→cyan accent ramp, luminous drift palette) by redefining existing token *values* so every component inherits the look; added `.glass`/`.glass-strong`/`.glow-*`/`.text-gradient`/`.border-gradient` utilities + `aurora`/`float`/`drift-pulse`/`shimmer`/`rise-in` keyframes (all `prefers-reduced-motion` safe); forced dark by default via hardcoded `<html class="dark">`; created `AuroraBackground` (drifting aurora blobs + constellation field, CSS/SVG, GPU-light) mounted once in `layout.tsx`; elevated the base `ui/*` primitives (Card=glass, Button=gradient+glow, Input=glass+focus glow, Skeleton=shimmer); wrote `DESIGN-SYSTEM.md` as the contract.
- **Stage 1 — Four agents in parallel (committed `9006267`)**, each owning disjoint files:
  - A1 hero/search/layout: gradient wordmark header, segmented glass view toggle, hero empty-state, glowing glass command bar with search icon, glass-danger reset dialog, section entrance motion.
  - A2 diagnosis + progress: glass card with brand glow + rise-in, gradient "ROOT CAUSE" eyebrow, larger headline, pulsing drift badge, glass evidence rows, success-glow "Reinforced ✓", dramatic gradient/spinner loader.
  - A3 datasets/upload/status: glass rows, glowing drift dots (drifting pulses), restyled Forget confirm, glass upload panel, harmonized status badges.
  - A4 graph/health/timeline: 3D graph themed to the accent ramp with a translucent background so the aurora shows through + directional link particles + glass frame; health as glowing drift tiles; a real glass timeline.
- **Stage 2 — Integration (orchestrator):** fixed one type seam (graph `nodeColor` accessor typing); ran the full gate.

## Reliability note

The generic `claude` subagent type failed twice (0 tool uses, garbage output), so the coherence-critical foundation was built directly by the orchestrator and the fan-out used the proven `gsd-executor` type. Agents edited files only; the orchestrator committed between stages so the four parallel agents never raced the git index.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npm run build` — success; `/` prerendered as static without render errors.
- Restyle-only: no exported names, props, react-query keys, API calls, D-xx behaviors, or a11y affordances changed. The search→drift→forget→re-search loop, Accept/Dismiss/Forget, upload polling, and drift states are untouched.

## How to see it

`cd frontend && npm run dev` → http://localhost:3000 (run the backend too for live data:
`cd backend && ../.venv/bin/uvicorn main:app --workers 1 --host 127.0.0.1`).

## Follow-ups (optional)

- A real in-browser visual pass (and screenshots) to fine-tune spacing/contrast — the build gate confirms it compiles and renders, but taste-level polish benefits from eyes on the running app.
- Actual API latency (LLM-bound, Mistral free tier) is unchanged — see 260703-u2d / 260703-uvm.
