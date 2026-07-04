---
phase: 02-core-recall
plan: 02
subsystem: ui
tags: [nextjs, react, react-query, shadcn, tailwind, typescript, diagnosis-card, search]

# Dependency graph
requires:
  - phase: 02-01
    provides: "POST /search fused GRAPH_COMPLETION + CHUNKS contract {status, root_cause, evidence[{excerpt,full_text,source}], source_dataset, session_id, qa_id} / {status:no_results} / {status:error, message}; CORS for localhost:3000; measured ~7.1s search latency for skeleton timing"
provides:
  - "Next.js 16 App Router frontend scaffold (Tailwind 4, Turbopack, TypeScript) — the project's first UI"
  - "shadcn/ui wired (radix-nova preset, neutral base) with card/button/input/badge/collapsible/skeleton blocks"
  - "Three locked fonts (Space Grotesk / Inter / IBM Plex Mono) via next/font/google, weights 400/600, mapped to font-display/font-sans/font-mono"
  - "UI-SPEC color anchors applied to shadcn CSS-variable tokens (light + dark); Phase-3 drift-badge palette reserved"
  - "frontend/lib/api.ts — typed SearchResponse discriminated union + searchIncident() mirroring the backend /search contract"
  - "frontend/lib/providers.tsx — React Query QueryClientProvider mounted in root layout"
  - "SearchBar (persistent top bar + example-query chip) and DiagnosisCard (root cause + expandable evidence + version tag + skeleton + zero-result/error states)"
affects: [02-03 upload panel + dataset list, 02-04 feedback/reinforcement Accept-Dismiss controls, Phase 3 drift badges reuse the D-09 version-tag slot]

# Tech tracking
tech-stack:
  added: [next@16.2.10, react@19.2.4, "@tanstack/react-query@5.x", shadcn (radix-nova), tailwindcss@4, lucide-react, class-variance-authority, tailwind-merge]
  patterns:
    - "next/font/google CSS-variable font wiring, weights constrained to 400/600 per UI-SPEC"
    - "shadcn brand accent mapped to the `primary` token; shadcn `accent` kept as a neutral hover color (distinct from UI-SPEC brand 'accent')"
    - "Page-level state ownership: SearchBar lifts pending/response to page.tsx; presentation components are pure"
    - "Client-normalized fetch wrapper: searchIncident() collapses network/parse failures into the {status:error} variant so no caller needs try/catch (D-24)"
    - "Forward-compat component slot: version-tag Badge carries an unused data-health-state attribute so Phase 3 can color it without layout change"

key-files:
  created:
    - frontend/ (create-next-app scaffold: package.json, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs)
    - frontend/components.json
    - frontend/app/layout.tsx
    - frontend/app/globals.css
    - frontend/app/page.tsx
    - frontend/lib/api.ts
    - frontend/lib/providers.tsx
    - frontend/components/SearchBar.tsx
    - frontend/components/DiagnosisCard.tsx
    - frontend/components/ui/{card,button,input,badge,collapsible,skeleton}.tsx
    - frontend/lib/utils.ts
  modified:
    - frontend/tsconfig.json (path alias @/* -> ./* after moving src/app -> app)

key-decisions:
  - "Moved create-next-app's src/app -> app and repointed the @/* alias to ./*, so paths match the plan's declared frontend/app + frontend/lib + frontend/components layout exactly"
  - "Mapped the UI-SPEC indigo brand accent to shadcn's `primary` token (CTA fills, focus rings, active chip); left shadcn's own `accent` token as a neutral hover color"
  - "Skeleton shows a 'Searching memory…' label beneath a shape-matched card (not a bare spinner) because Plan 01's measured ~7.1s latency exceeds the ~5s bare-skeleton threshold (D-20/B-02)"
  - "versionTagFromDataset() maps workarounds_v1_9 -> 'v1.9', incidents -> 'Incident record', null -> 'Unknown source' — never leaks a raw internal dataset name"

patterns-established:
  - "next/font/google multi-font CSS-variable wiring with strict 400/600 weights"
  - "SearchBar owns only input + chip + mutation; results lifted to page and rendered by DiagnosisCard — presentation/state separation"
  - "shadcn Collapsible per evidence snippet with a 44px chevron hit-target revealing full_text (D-07/D-08)"

requirements-completed: [RECALL-01, RECALL-02, RECALL-03]

coverage:
  - id: D1
    description: "Next.js App Router frontend scaffolds, builds, and boots with the three locked fonts + React Query wired (fonts as CSS variables, QueryClientProvider mounted)"
    requirement: "RECALL-03"
    verification:
      - kind: automated_ui
        ref: "cd frontend && npm run build (Compiled successfully, TypeScript clean) + npx tsc --noEmit (no errors) + npm run lint (clean)"
        status: pass
      - kind: manual_procedural
        ref: "grep Space_Grotesk/IBM_Plex_Mono in app/layout.tsx; grep QueryClientProvider in lib/providers.tsx — both present"
        status: pass
    human_judgment: false
  - id: D2
    description: "Typed searchIncident() + SearchResponse union mirror backend/search.py's exact three-variant contract (ok / no_results / error)"
    requirement: "RECALL-01"
    verification:
      - kind: integration
        ref: "live POST /search {query:'customers double-charged'} -> status ok, root_cause names idempotency_guard v1.9, 3 evidence, source_dataset=workarounds_v1_9; frontend consumes the same shape via lib/api.ts"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit type-checks the union field-for-field against usage in DiagnosisCard/SearchBar/page"
        status: pass
    human_judgment: false
  - id: D3
    description: "DiagnosisCard renders fused root cause on top (D-06) with 2-3 click-to-expand evidence snippets (D-07/D-08) and a neutral mono version tag in the Phase-3-ready D-09 slot"
    requirement: "RECALL-02"
    verification:
      - kind: manual_procedural
        ref: "grep versionTagFromDataset + Collapsible in DiagnosisCard.tsx; Badge carries unused data-health-state prop"
        status: pass
      - kind: automated_ui
        ref: "human-verify checkpoint (Task 3): browser confirmed root cause on top, 3 evidence snippets, chevron expands full source text, v1.9 tag renders"
        status: pass
    human_judgment: false
  - id: D4
    description: "Empty (D-19), skeleton with ~7s 'Searching memory…' timing (D-20), zero-result (D-21), and error (D-24, short human message) states all render without layout shift"
    requirement: "RECALL-03"
    verification:
      - kind: automated_ui
        ref: "human-verify checkpoint (Task 3): browser confirmed empty state, skeleton->card no layout shift, 'No prior incidents found for this query' on gibberish query"
        status: pass
    human_judgment: true
    rationale: "Visual no-layout-shift and font-rendering fidelity (Space Grotesk headline / Inter body / mono tag) are human-judgment concerns; confirmed via the approved browser checkpoint"

# Metrics
duration: ~70min
completed: 2026-07-02
status: complete
---

# Phase 2 Plan 2: Search Slice Frontend — Dashboard, SearchBar & DiagnosisCard Summary

**The project's first UI: a Next.js 16 App Router dashboard where a user searches incident memory and sees the fused root-cause + expandable-evidence diagnosis card from Plan 01's /search, with locked fonts, a shape-matched ~7s skeleton, empty, zero-result, and error states.**

## Performance

- **Duration:** ~70 min active (spanning the human-verify checkpoint pause)
- **Completed:** 2026-07-02
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint — all complete)
- **Files created:** ~30 (scaffold + 6 shadcn blocks + 5 hand-authored app/lib/component files) · **Files modified:** 1 (tsconfig alias)

## Accomplishments
- Scaffolded the entire greenfield frontend via `create-next-app` (App Router, Tailwind 4, Turbopack, TypeScript), then `shadcn init` (radix-nova preset, neutral base color) plus the card/button/input/badge/collapsible/skeleton blocks and `@tanstack/react-query`. Moved `src/app` → `app` and repointed the `@/*` alias so the tree matches the plan's declared layout exactly.
- Wired the three locked typefaces (Space Grotesk display, Inter body, IBM Plex Mono technical) via `next/font/google` as CSS variables with strict 400/600 weights, mapped to `font-display`/`font-sans`/`font-mono`. Applied the UI-SPEC light/dark color anchors (page `#f8fafc`/`#0d1117`, card `#ffffff`/`#161b22`, indigo-600/500 accent) onto shadcn's CSS-variable tokens, and reserved the Phase-3 drift-badge palette as unused custom properties.
- Built `lib/api.ts` — the typed `SearchResponse` discriminated union (`ok` / `no_results` / `error`) plus `searchIncident()`, mirroring `backend/search.py` field-for-field and normalizing network/parse failures into the `error` variant (D-24). `lib/providers.tsx` mounts the React Query `QueryClientProvider` in the root layout.
- `SearchBar` is the persistent top bar (D-18) with a React Query mutation and the clickable `customers double-charged` mono chip (D-19); it lifts pending/response state to `page.tsx` and renders no results itself. `page.tsx` is the single-page dashboard (D-17) that switches between empty state, skeleton, and diagnosis card.
- `DiagnosisCard` renders the fused diagnosis: root cause as the Space Grotesk 28/600 headline (D-06), 2-3 evidence snippets each in a shadcn `Collapsible` with a 44px chevron revealing `full_text` (D-07/D-08), and a neutral mono version tag via `versionTagFromDataset()` in the D-09 slot (a `Badge` carrying an unused `data-health-state` attribute so Phase 3 can color it without layout change). `DiagnosisCardSkeleton` matches the real card's shape and, per Plan 01's measured ~7.1s latency, shows a "Searching memory…" label instead of a bare spinner (D-20). Zero-result (D-21) and error (D-24) states render inline. No Accept/Dismiss controls — deferred to Plan 04.
- Verified end-to-end against the live backend: `/search` for `customers double-charged` returns the v1.9 `idempotency_guard` fix with 3 evidence snippets and `source_dataset=workarounds_v1_9`; the human-verify checkpoint (empty → skeleton → card, chevron expansion, v1.9 tag, gibberish → zero-result, font fidelity, no layout shift) was approved in the browser.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js + shadcn + fonts + React Query + typed API client + dashboard shell with the search bar** — `ad940f9` (feat)
2. **Task 2: Diagnosis card — root cause, expandable evidence, version tag, skeleton, and zero-result state** — `43d6129` (feat)
3. **Task 3: Human-verify the search slice end-to-end in the browser** — approved (checkpoint, no code commit; all implementation landed in Tasks 1-2)

## Files Created/Modified
- `frontend/app/layout.tsx` — root layout: three locked fonts as CSS variables (400/600), React Query `Providers` wrapper
- `frontend/app/globals.css` — UI-SPEC light/dark color anchors on shadcn tokens, font-family mapping, reserved drift-badge palette
- `frontend/app/page.tsx` — single-page dashboard shell (D-17): empty state (D-19) / skeleton / diagnosis card switch, page-level state
- `frontend/lib/api.ts` — `API_BASE`, `EvidenceSnippet`, `SearchResponse` union, `searchIncident()` (mirrors backend contract, D-24 normalization)
- `frontend/lib/providers.tsx` — `"use client"` React Query `QueryClientProvider`
- `frontend/components/SearchBar.tsx` — persistent top bar + example-query chip, React Query mutation lifting state to page
- `frontend/components/DiagnosisCard.tsx` — `DiagnosisCard` + `DiagnosisCardSkeleton` + `versionTagFromDataset()` helper
- `frontend/components/ui/{card,button,input,badge,collapsible,skeleton}.tsx` — shadcn blocks
- `frontend/components.json`, `frontend/lib/utils.ts` — shadcn config + `cn()` helper
- `frontend/tsconfig.json` — `@/*` alias repointed from `./src/*` to `./*` after the `src/app` → `app` move

## Decisions Made
- **`src/app` → `app` + alias repoint:** create-next-app scaffolds into `src/app` by default; the plan declares `frontend/app`, `frontend/lib`, `frontend/components`. Moved the directory and repointed `@/*` to `./*` so both the plan's paths and shadcn's `@/components` / `@/lib` aliases resolve.
- **Brand accent → shadcn `primary` token:** the UI-SPEC "accent" (indigo, reserved for CTA fills / focus rings / active chip) maps cleanly to shadcn's `primary`; shadcn's own `accent` token was left as the neutral hover color to avoid terminology collision.
- **Skeleton label over bare spinner:** Plan 01 measured fused-search latency at ~7.1s (above RESEARCH's ~5s assumption), so `DiagnosisCardSkeleton` shows a shape-matched card plus a "Searching memory…" label so the wait reads as intentional (D-20/B-02).
- **Version tag as a forward-compat slot:** the D-09 tag is a neutral `Badge` today but already accepts an (unused) `healthState` prop and emits `data-health-state`, so Phase 3's 🟢/🟡/🔴 drift colors drop in without touching layout.

## Deviations from Plan

None — plan executed exactly as written. The `src/app` → `app` move and the `@/*` alias repoint are scaffolding mechanics required to satisfy the plan's own declared file paths (create-next-app defaults to `src/app`), not a change of approach; both are documented under Decisions.

## Issues Encountered
- **shadcn CLI flags changed:** the plan/UI-SPEC cited `npx shadcn init --base-color neutral`, but the installed shadcn (v4) replaced `--base-color` with a required `--base <radix|base>` plus a `-p <preset>` selection. Resolved by running `shadcn init --template next --base radix --css-variables -p nova -y` (neutral base color is carried by the nova preset / `components.json` `baseColor: neutral`). No functional difference — the same six blocks and CSS-variable theming landed.
- **create-next-app `--base-color` / interactive prompts:** ran non-interactively with explicit flags (`--typescript --tailwind --app --turbopack --eslint --import-alias "@/*" --use-npm --yes`); no manual intervention needed.

## User Setup Required
None — no external service configuration required. `frontend/.env.local` sets `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` (gitignored, `lib/api.ts` defaults to `http://localhost:8000` if absent).

## Next Phase Readiness
- The dashboard shell, typed API client, and both signature components are live and verified against the backend. Plan 02-03 can add the UploadPanel + DatasetList as new sections on the existing single-page dashboard, and Plan 02-04 can add Accept/Dismiss controls to `DiagnosisCard` (the `session_id`/`qa_id`/`source_dataset` already flow through `SearchResponse`).
- Both dev servers are left running for later waves: backend `uvicorn` on `127.0.0.1:8000` (`--workers 1`), frontend `next dev` on `:3000`.
- The D-09 version-tag slot is Phase-3-ready (accepts a health state without layout change).

## Self-Check: PASSED

All 7 hand-authored files exist on disk (layout, globals.css, page, lib/api, lib/providers, SearchBar, DiagnosisCard); both task commits (`ad940f9`, `43d6129`) exist in git history.

---
*Phase: 02-core-recall*
*Completed: 2026-07-02*
