---
phase: 260703-vga
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/app/globals.css
  - frontend/app/layout.tsx
  - frontend/lib/providers.tsx
  - frontend/components/ui/*
  - frontend/components/AuroraBackground.tsx (new)
  - frontend/components/SearchProgress.tsx
  - frontend/app/page.tsx
  - frontend/components/SearchBar.tsx
  - frontend/components/ResetButton.tsx
  - frontend/components/DiagnosisCard.tsx
  - frontend/components/DatasetList.tsx
  - frontend/components/UploadPanel.tsx
  - frontend/components/FileStatusRow.tsx
  - frontend/components/MemoryGraphView.tsx
  - frontend/components/HealthDashboard.tsx
  - frontend/components/IncidentTimeline.tsx
autonomous: true
requirements: [D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-15, D-16, D-17, D-18, D-19, D-20, D-21, D-22, D-23, D-24, DRIFT-01, FORGET-01, GRAPH-01]
must_haves:
  truths:
    - "The app renders in an elevated neural-dark theme by default (deep space-black with color undertone, not the plain light or plain github-dark palette)."
    - "An aurora/particle atmosphere renders behind all content (pointer-events-none, prefers-reduced-motion aware)."
    - "Cards read as luminous glass (backdrop-blur, subtle border + highlight, colored glow) — visibly not flat."
    - "Drift badges glow; the drifting (red) state pulses."
    - "Every existing behavior/API wiring is intact: search -> drift -> forget -> re-search loop still works; Accept (Reinforced ✓, D-11/D-12), Dismiss (client-only, D-10), Forget (two-step guard), upload polling, no_results (D-21), D-24 copy, EVIDENCE_DISPLAY_LIMIT, aria-live/sr-only/44px targets all unchanged."
    - "npm run lint, npx tsc --noEmit, and npm run build all pass clean."
  artifacts:
    - "frontend/app/globals.css (elevated neural-dark tokens + glow/glass utilities + keyframes)"
    - "frontend/components/AuroraBackground.tsx (shared atmosphere)"
    - "frontend/DESIGN-SYSTEM.md (tokens + primitives + usage contract for fan-out agents)"
  key_links:
    - "Foundation runs FIRST and is a barrier: it rewrites the theme + creates shared primitives + writes DESIGN-SYSTEM.md before any component agent runs."
    - "Fan-out agents own DISJOINT file sets (no two agents write the same file) so they run in parallel without clobbering."
    - "No agent runs git ops; the orchestrator commits sequentially after each stage to avoid parallel git-index races."
    - "No component agent changes exported component names, public props, import paths, react-query keys, or API-call wiring — restyle only."
---

<objective>
Full creative redesign of the entire PatchPilot frontend to a "Neural Dark — living incident brain" aesthetic that makes users say wow, while keeping the working demo loop and all API wiring 100% intact. The current UI renders only the plain slate-50 light theme (next-themes is installed but never wired), which reads as "super simple" — this redesign flips to an elevated, luminous dark base and layers aurora atmosphere, glassmorphism, glow, gradient type, and motion across every surface.

Direction (locked with the user): deep space-black canvas with a blue/violet undertone; animated aurora/nebula glow + a faint drifting constellation/particle field echoing the memory graph; glassmorphic cards with luminous borders and colored glow; indigo→violet→cyan gradient accents; drift badges that glow (green/amber/red) and pulse on drifting; the 3D knowledge graph as a centerpiece. Bold and immediately visible — the prior loading-UX pass was too subtle; this must not be.

Output: a re-themed, re-animated frontend delivered via one foundation stage + four parallel component stages, all coherent because every component agent builds on the foundation's tokens/primitives and its DESIGN-SYSTEM.md contract.
</objective>

<execution_context>
Orchestrated directly by the main session (not the stock single-executor path): worktree isolation is disabled for this repo (it forks off the frozen `main`), and parallel agents must not race the git index — so agents EDIT ONLY and the orchestrator commits between stages. See .planning memory: gsd-worktree-isolation-base-mismatch.
</execution_context>

<orchestration>
STAGE 0 — Foundation (single agent, opus, BARRIER — must finish + be verified before Stage 1):
  Owns: frontend/app/globals.css, frontend/app/layout.tsx, frontend/lib/providers.tsx,
        frontend/components/ui/* (shared shadcn primitives: card/button/badge/input/select/etc.),
        frontend/components/AuroraBackground.tsx (new), frontend/DESIGN-SYSTEM.md (new).
  Delivers: elevated neural-dark palette (redefine the CSS design tokens so every existing
  bg-background/text-foreground/bg-card/border-border/etc. instantly adopts the new look);
  dark wired as default via next-themes (attribute="class", defaultTheme="dark",
  suppressHydrationWarning on <html>) or an equivalently robust always-dark wiring; glass +
  glow + gradient-text utility classes and @keyframes (aurora drift, particle float, glow pulse,
  entrance rise) in globals.css; a reusable AuroraBackground atmosphere component (fixed,
  pointer-events-none, behind content, prefers-reduced-motion aware); tasteful restyle of the
  base ui/* primitives (Card = glass, Button = gradient/glow primary, Badge, Input focus glow)
  so downstream agents inherit them. Writes DESIGN-SYSTEM.md documenting EXACTLY the tokens,
  utility classes, primitive APIs, and usage examples the four fan-out agents must use.

STAGE 1 — Four component agents IN PARALLEL (disjoint files; each reads DESIGN-SYSTEM.md first):
  A1 (opus)   Hero / Search / Layout: frontend/app/page.tsx, frontend/components/SearchBar.tsx,
              frontend/components/ResetButton.tsx. Owns page composition, the header/brand/tabs
              chrome, the AuroraBackground mount, the hero empty-state, the search bar drama.
  A2 (opus)   Diagnosis: frontend/components/DiagnosisCard.tsx, frontend/components/SearchProgress.tsx.
              The money shot — root cause headline, evidence collapsibles, version/drift/confidence
              badges, Accept/Dismiss, and the progressive loading indicator.
  A3 (sonnet) Datasets / Upload: frontend/components/DatasetList.tsx, frontend/components/UploadPanel.tsx,
              frontend/components/FileStatusRow.tsx. Drift rows + glowing badges + Forget confirm,
              the upload panel, per-file status rows.
  A4 (sonnet) Graph / Health / Timeline: frontend/components/MemoryGraphView.tsx,
              frontend/components/HealthDashboard.tsx, frontend/components/IncidentTimeline.tsx.
              Make the 3D graph a centerpiece (dark bg, themed node/link colors, glow); restyle
              the health + timeline panels.

STAGE 2 — Integration (orchestrator): run npm run lint + npx tsc --noEmit + npm run build; fix
  seams (spawn a focused fixer if needed); confirm the core loop wiring is intact; commit; write
  SUMMARY; update STATE.md; docs commit.
</orchestration>

<hard_constraints>
- RESTYLE ONLY. Do NOT change any exported component name, public prop/interface, import path,
  react-query key (DATASETS_QUERY_KEY etc.), or API-call wiring (searchIncident, listDatasets,
  uploadFiles, forgetDataset, acceptFeedback, pollIngestStatus, loadSampleData). Do NOT change
  the discriminated-union response handling or the D-xx behavioral contracts.
- PRESERVE the demo loop: search -> drift badge -> forget -> re-search must still work end to end.
- PRESERVE documented behaviors: D-10 Dismiss is client-only (no API), D-11 "Reinforced ✓" state,
  D-12 auto re-search keeps the accepted card mounted (never swap in the skeleton for re-search),
  D-21 no_results copy, D-24 short human error messages (verbatim strings kept), EVIDENCE_DISPLAY_LIMIT=3,
  the Forget two-step confirm + guard, upload polling flow, and drift-state literals.
- PRESERVE accessibility: aria-live regions, sr-only labels, focus-visible rings, 44px (h-11) hit
  targets, aria-labels. Honor prefers-reduced-motion for all new motion.
- NO backend edits. NO new npm dependencies (CSS-first motion via keyframes + tw-animate-css; the
  3D graph lib is already installed). NO Next.js-specific API churn — if an agent must touch
  anything Next-specific, check node_modules/next/dist/docs/ if present, else use standard
  App-Router patterns (frontend/AGENTS.md).
- Keep the locked typefaces (Space Grotesk display / Inter body / IBM Plex Mono technical).
- Agents do NOT run git; the orchestrator commits between stages (avoids parallel index races).
</hard_constraints>

<verification>
- npm run lint (eslint), npx tsc --noEmit, and npm run build (next build) all pass clean from frontend/.
- Reasoned behavior walkthrough in SUMMARY: theme flip, aurora atmosphere, glass/glow cards,
  pulsing drift badges, and confirmation the search->drift->forget->re-search loop + Accept/Dismiss/
  Forget/upload flows are untouched. Do NOT trigger unnecessary real backend searches (bills cognify).
</verification>

<success_criteria>
- Neural-dark theme is the default and visibly elevated (atmosphere + glass + glow + gradient type).
- Every page surface is redesigned and coherent (shared tokens/primitives from the foundation).
- Zero behavioral/API regressions; core loop + all D-xx contracts intact; a11y preserved.
- lint + typecheck + build all green; no new deps; no backend changes.
</success_criteria>

<output>
Create .planning/quick/260703-vga-full-neural-dark-creative-redesign-of-th/260703-vga-SUMMARY.md when done.
</output>
