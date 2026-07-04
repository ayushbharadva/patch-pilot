---
phase: 260704-lgf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/lib/search-session.tsx
  - frontend/components/AppShell.tsx
  - frontend/components/LifecycleStrip.tsx
  - frontend/components/SessionStats.tsx
  - frontend/app/(mvp)/app/layout.tsx
  - frontend/app/(mvp)/app/page.tsx
  - frontend/app/(mvp)/app/memory/page.tsx
  - frontend/app/(mvp)/app/graph/page.tsx
  - frontend/app/(mvp)/app/activity/page.tsx
  - frontend/components/SearchBar.tsx
  - frontend/components/DiagnosisCard.tsx
  - frontend/components/UploadPanel.tsx
  - frontend/components/ResetButton.tsx
autonomous: true
# Quick task — no ROADMAP requirement IDs. These are the existing decisions the
# split preserves/enhances (kept for traceability, not roadmap coverage). The
# canonical spec is /Users/ayushbharadva/.claude/plans/can-we-divide-the-mighty-thunder.md
# and its architectural decisions are LOCKED.
requirements: [D-08, D-11, D-12, D-17, D-18, D-19, D-20, D-21, D-24, DRIFT-01, FORGET-01, GRAPH-01, STRETCH-01, STRETCH-02, STRETCH-03]
must_haves:
  truths:
    - "The MVP app has 4 distinct routes — /app (Diagnose), /app/memory, /app/graph, /app/activity — each reachable from a persistent top-nav in a shared app shell."
    - "Current search state (diagnosis response, last query, pending/re-searching flags, hasSearched) survives navigation between the 4 routes without losing or remounting the diagnosis card."
    - "The core demo beat works across routes: search on /app → navigate to /app/memory → forget a drifting dataset → the last search auto re-runs → an action-toast returns to /app showing the flipped diagnosis."
    - "The accept-triggered re-search keeps the just-accepted 'Reinforced ✓' card mounted (isPending vs isReSearching stay separate); after Accept the new card shows an 'X% → Y% after reinforcement' delta badge; after a forget re-search there is NO delta badge."
    - "The lifecycle strip lights each node (remember → recall → improve → forget) once its op has fired at least once; session-stat tiles show live counts (Recalls, Reinforcements, Drift events, Forgotten)."
    - "npm run lint, npm run typecheck, and npm run build all pass clean; the build emits all 4 /app routes; the marketing vitest suite stays green."
  artifacts:
    - "frontend/lib/search-session.tsx (SearchSessionProvider + useSearchSession hook)"
    - "frontend/components/AppShell.tsx (sticky glass topbar + Link nav + LifecycleStrip + ResetButton)"
    - "frontend/components/LifecycleStrip.tsx (4-node remember→recall→improve→forget strip)"
    - "frontend/components/SessionStats.tsx (4 glass stat tiles on the Diagnose page)"
    - "frontend/app/(mvp)/app/layout.tsx (nested SERVER layout hosting the provider + shell)"
    - "frontend/app/(mvp)/app/memory/page.tsx, /graph/page.tsx, /activity/page.tsx (3 new routes)"
  key_links:
    - "SearchSessionProvider MUST live in the nested layout app/(mvp)/app/layout.tsx, never inside a page — a page remount on navigation would wipe session state (this is the backbone of the whole plan)."
    - "The nested layout renders inside the existing (mvp) root layout's Providers (react-query) automatically, so useQuery/useMutation keep working."
    - "isReSearching MUST stay separate from isPending so an accept-triggered re-search does NOT swap the accepted card for the skeleton in the same render batch (preserves 'Reinforced ✓', D-11/D-12)."
    - "AppShell topbar height (h-14, z-20) and SearchBar sticky offset (top-14, z-10) must match so the search bar pins directly below the topbar."
    - "reSearch('forget') and setLastQuery(new query) both clear reinforcement, so a forget re-search or a fresh search never shows a stale delta badge."
    - "No exported component names, public props, import paths, react-query keys, or API-call wiring change beyond the two additive props introduced here: DiagnosisCard reinforcedFrom and ResetButton onReset."
---

<objective>
Split the single-page MVP dashboard (frontend/app/(mvp)/app/page.tsx) into 4 routes under a shared app shell, moving search state into a navigation-surviving client provider, then add a depth kit (lifecycle strip, session-stat tiles, confidence-delta badge, cross-route forget→re-search toast). Translate the USER-APPROVED spec verbatim — its architectural decisions are LOCKED, do NOT re-plan or deviate.

Purpose: the dashboard currently reads as congested and "simple," hiding the product's depth from hackathon judges (submission closes Jul 5). A real nav makes it read as a SaaS product and gives each surface room to breathe. The hard constraint: the core demo beat (forget a drifting dataset → auto re-run last search → diagnosis flips) currently rides page-level useState; route-splitting kills it UNLESS search state moves into a client provider mounted in a nested layout that persists across navigation. That provider is the backbone.

Output: 4 client route pages, a nested server layout hosting `SearchSessionProvider` + `AppShell`, the provider itself, the depth-kit components, and 5 additive component edits — all inside app/(mvp)/. The marketing tree, the (mvp) root layout (AuroraBackground / Providers / Toaster), and the backend are untouched.

Canonical spec (read if any detail here is ambiguous — it wins):
/Users/ayushbharadva/.claude/plans/can-we-divide-the-mighty-thunder.md
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@frontend/app/(mvp)/app/page.tsx
@frontend/app/(mvp)/layout.tsx
@frontend/components/SearchBar.tsx
@frontend/components/DiagnosisCard.tsx
@frontend/components/DatasetList.tsx
@frontend/components/UploadPanel.tsx
@frontend/components/ResetButton.tsx
@frontend/components/HealthDashboard.tsx
@frontend/lib/api.ts

Route map (from approved spec):
| Route | Content | Container |
|---|---|---|
| /app — Diagnose | SearchBar + DiagnosisCard/EmptyState + SearchProgress + SessionStats tiles | max-w-4xl |
| /app/memory | UploadPanel + DatasetList + HealthDashboard | max-w-5xl |
| /app/graph | MemoryGraphView full-page | max-w-6xl |
| /app/activity | IncidentTimeline | max-w-4xl |

Verified facts: lucide-react ^1.23.0 exports `Search`, `Database`, `Share2`, `History` (all compile). MVP root layout is frontend/app/(mvp)/layout.tsx (holds `<html>`, fonts, AuroraBackground, Providers, Toaster). No frontend tests cover the MVP tree; marketing tests live under app/(marketing)/ and src/. searchIncident(query) returns the SearchResponse union; the "ok" variant exposes `confidence: number | null`, `drift_state`, `qa_id`, `source_dataset`, `session_id`. DatasetList already exports `DATASETS_QUERY_KEY` and takes `onForgotten?`. ForgetButton fires onForgotten only after a successful forget and already shows its own "Forgotten — updating results…" toast.
</context>

<tasks>

<task type="auto">
  <name>Task 1: App shell + 4 routes + search-state extraction into a navigation-surviving provider</name>
  <files>frontend/lib/search-session.tsx, frontend/components/AppShell.tsx, frontend/app/(mvp)/app/layout.tsx, frontend/app/(mvp)/app/page.tsx, frontend/app/(mvp)/app/memory/page.tsx, frontend/app/(mvp)/app/graph/page.tsx, frontend/app/(mvp)/app/activity/page.tsx, frontend/components/SearchBar.tsx</files>
  <action>
Build the shell, the 4 routes, and the state backbone. All architectural choices are LOCKED by the approved spec — implement, do not re-litigate. Everything stays inside app/(mvp)/; do NOT touch the (mvp) root layout, the marketing tree, or the backend.

1) NEW frontend/lib/search-session.tsx — `"use client"`. Create `SearchSessionProvider` + a `useSearchSession()` hook that throws when called outside the provider. Define `type LifecycleOp = "remember" | "recall" | "improve" | "forget"`. The context value shape (include ALL fields NOW even though the stats/reinforcement ones are not yet rendered — they are wired in Task 2):
  - State: `response: SearchResponse | null`; `lastQuery: string | null`; `isPending: boolean` (SearchBar-driven initial search, drives the skeleton swap); `hasSearched: boolean`; `isReSearching: boolean` (Accept/Forget-driven — MUST stay a separate flag from isPending so the accepted card is not swapped for the skeleton, preserving "Reinforced ✓", per the page.tsx:31-39 comment); `reinforcement: { fromConfidence: number | null; query: string } | null`; `stats: Record<LifecycleOp, number>` (initialized all-zero).
  - Methods: `setSearchPending(p: boolean): void` — sets isPending; when true also sets hasSearched true. `setLastQuery(q: string): void` — sets lastQuery for a NEW user search and clears `reinforcement` to null. `finishSearch(r: SearchResponse): void` — sets response and records a "recall" lifecycle event. `reSearch(reason: "reinforce" | "forget"): Promise<void>` — the transplant of the current page.tsx handleReSearch (page.tsx:46-52): guard on `lastQuery`, set isReSearching true, `await searchIncident(lastQuery)`, set isReSearching false, set response; records a "recall" event; when `reason === "forget"` it also clears `reinforcement`. `markReinforced(fromConfidence: number | null): void` — stores `reinforcement = { fromConfidence, query: lastQuery ?? "" }` and records an "improve" event. `recordLifecycleEvent(op: LifecycleOp): void` — increments `stats[op]`. `resetSession(): void` — resets response/lastQuery/reinforcement to null, isPending/hasSearched/isReSearching to false, and stats back to all-zero. Import `searchIncident` and `type SearchResponse` from `@/lib/api`.

2) NEW frontend/components/AppShell.tsx — `"use client"` (needs `usePathname` from `next/navigation`). Sticky glass topbar: `sticky top-0 z-20 glass-strong border-b border-border/60 h-14`. Inside: the "PatchPilot" wordmark (left), a glass-pill nav (center/right), and `<ResetButton />` (right — NO onReset prop yet; that arrives in Task 2). Do NOT reference LifecycleStrip yet (that component does not exist until Task 2). Below the topbar render `<div className="flex-1">{children}</div>` — pages own their own `mx-auto max-w-* px-6 py-10` wrapper; the shell does NOT add horizontal padding to children. Nav is the evolution of the old tablist glass-pill style: a glass pill container, active item = `bg-primary text-primary-foreground` rounded pill with `aria-current="page"`, but real Next `<Link>`s. Nav items in order: `{ href: "/app", label: "Diagnose", icon: Search }`, `{ href: "/app/memory", label: "Memory", icon: Database }`, `{ href: "/app/graph", label: "Graph", icon: Share2 }`, `{ href: "/app/activity", label: "Activity", icon: History }` (icons from lucide-react). Active-detection rule: `const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href)`. Mobile (below `sm`): icon-only pills, but keep an `aria-label` on each. Import `useSearchSession` so `resetSession` is available for Task 2, but only render `<ResetButton />` for now.

3) NEW frontend/app/(mvp)/app/layout.tsx — a nested SERVER layout (NO "use client"). It renders `<SearchSessionProvider><AppShell>{children}</AppShell></SearchSessionProvider>`. The provider MUST live here, in the nested layout — Next nested layouts persist across child-page navigation; moving the provider into a page would remount and wipe state on every nav. This layout sits inside the existing (mvp) root layout's Providers (react-query) automatically.

4) REWRITE frontend/app/(mvp)/app/page.tsx as Diagnose-only, `"use client"`. Delete the page-level `useState` (response/isPending/hasSearched/lastQuery/isReSearching/view), the old handleReSearch, the `<header>` wordmark block, the `<ResetButton />`, and the search/graph tablist + `view` state (nav now lives in AppShell — this retires the D-08 in-page tab toggle in favor of real routes). Keep the `EmptyState` function in this file. Read all state via `useSearchSession()`. Wrapper: `<main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">`. Wire SearchBar: `onPendingChange={(p) => session.setSearchPending(p)}`, `onResponse={(r) => session.finishSearch(r)}`, `onQuery={(q) => session.setLastQuery(q)}`. Results section (`aria-live="polite"`), preserving the exact current branching: show `<DiagnosisCardSkeleton />` when `session.isPending`; else when `session.hasSearched && session.response` show `<DiagnosisCard>` (keep the existing `key` derivation from qa_id/session_id/status+lastQuery to remount on new searches) with `onReSearch={() => void session.reSearch("reinforce")}`; else `<EmptyState />`. Keep the `session.isReSearching` branch rendering `<SearchProgress showSpinner srLabel="Updating diagnosis with reinforced memory." />`. Do NOT add SessionStats or the reinforcement-delta wiring here yet (Task 2).

5) NEW frontend/app/(mvp)/app/memory/page.tsx — `"use client"`. Wrapper `<main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-10">`. Render `<UploadPanel />`, then `<DatasetList onForgotten={() => void session.reSearch("forget")} />`, then `<HealthDashboard />` (each in its existing labelled section wrapper). Use `useSearchSession()` for the onForgotten wiring. The richer forget toast-with-action + forget lifecycle recording is added in Task 2 — for now onForgotten just re-runs the last search so the core loop is demoable end-to-end.

6) NEW frontend/app/(mvp)/app/graph/page.tsx — `"use client"`. Wrapper `<main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">` rendering `<MemoryGraphView />` (its ssr:false dynamic import + ResizeObserver width ref work as-is on a dedicated route; do not pass a height prop).

7) NEW frontend/app/(mvp)/app/activity/page.tsx — `"use client"`. Wrapper `<main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">` rendering `<IncidentTimeline />` in its labelled section.

8) MODIFY frontend/components/SearchBar.tsx — change the sticky offset only: the outer sticky wrapper currently pins to top-0; change that offset to sit below the h-14 shell (use the `top-14` offset instead of `top-0`). Leave `z-10`, the `-mx-6 px-6`, and everything else unchanged so it pins directly under the topbar (z-20).

Commit at the end of this task: `feat(260704-lgf): split /app into 4 routes with shell + search-session provider`.
  </action>
  <verify>
    <automated>cd frontend && test -f lib/search-session.tsx && test -f components/AppShell.tsx && test -f "app/(mvp)/app/layout.tsx" && test -f "app/(mvp)/app/memory/page.tsx" && test -f "app/(mvp)/app/graph/page.tsx" && test -f "app/(mvp)/app/activity/page.tsx" && grep -q "useSearchSession" lib/search-session.tsx && grep -q "SearchSessionProvider" "app/(mvp)/app/layout.tsx" && grep -q "usePathname" components/AppShell.tsx && grep -q "top-14" components/SearchBar.tsx && npm run typecheck</automated>
  </verify>
  <done>All 4 routes exist as client pages; the nested server layout wraps children with SearchSessionProvider + AppShell; the Diagnose page reads state from useSearchSession (no page-level useState, no tablist); AppShell renders a Link-based glass-pill nav with the 4 items and a ResetButton; SearchBar pins to top-14; `npm run typecheck` passes clean.</done>
</task>

<task type="auto">
  <name>Task 2: Depth kit — lifecycle strip, session stats, confidence-delta badge, cross-route forget toast, ResetButton onReset</name>
  <files>frontend/components/LifecycleStrip.tsx, frontend/components/SessionStats.tsx, frontend/components/AppShell.tsx, frontend/components/DiagnosisCard.tsx, frontend/app/(mvp)/app/page.tsx, frontend/components/UploadPanel.tsx, frontend/components/ResetButton.tsx, frontend/app/(mvp)/app/memory/page.tsx</files>
  <action>
Add the depth kit and wire the lifecycle events into their call sites. All shapes are LOCKED by the approved spec.

1) NEW frontend/components/LifecycleStrip.tsx — `"use client"`. Reads `stats` from `useSearchSession()`. Renders 4 nodes in order remember → recall → improve → forget with IBM Plex Mono labels and a connecting line between them. A node is LIT when `stats[op] > 0`. Unlit style: `bg-foreground/10 text-muted-foreground`. Lit style: an accent dot + `glow-soft` + `animate-rise-in` on first light. This is the topbar strip; it will be shown `hidden lg:flex`.

2) NEW frontend/components/SessionStats.tsx — `"use client"`. Mirror HealthDashboard's glass-tile pattern (glass tile, `font-display text-2xl` number over a `font-sans text-sm font-semibold` label). Render 4 tiles: "Recalls" = `stats.recall`; "Reinforcements" = `stats.improve`; "Drift events" = derived live from `useQuery({ queryKey: DATASETS_QUERY_KEY, queryFn: listDatasets })` as the count of datasets whose `drift_state === "drifting"` (import DATASETS_QUERY_KEY from `@/components/DatasetList`, listDatasets from `@/lib/api`); "Forgotten" = `stats.forget`. Read stats from `useSearchSession()`. This component mounts on the Diagnose page below the results.

3) MODIFY frontend/components/AppShell.tsx — add `<LifecycleStrip />` into the topbar with `hidden lg:flex`, and change the reset control to `<ResetButton onReset={resetSession} />` (resetSession from useSearchSession, already imported in Task 1).

4) MODIFY frontend/components/DiagnosisCard.tsx — add an optional prop `reinforcedFrom?: number | null` threaded from `DiagnosisCard` down into `DiagnosisCardOk`. In the `DiagnosisCardOk` header, next to the existing confidence Badge (around DiagnosisCard.tsx:230-237): when the prop is PRESENT (use a `reinforcedFrom !== undefined` check so a `null` prior still counts as present) AND `response.confidence != null`, render an additional drift-stable-styled badge (reuse the `glow-drift-stable` / `border-drift-stable` treatment already used by the "Reinforced ✓" chip). Badge text: if `reinforcedFrom != null`, show the prior-percent, an arrow, the current-percent, then the word "after reinforcement" (e.g. prior 62% and current 78% renders as `62% → 78% after reinforcement`); if `reinforcedFrom == null`, show `Reinforced · {current}% confidence`. Compute percentages with `Math.round(value * 100)` to match the existing confidence badge. Add nothing else; the badge is the only real internal change to this component.

5) MODIFY frontend/app/(mvp)/app/page.tsx — mount `<SessionStats />` below the results section. Upgrade the DiagnosisCard `onReSearch` closure to capture the pre-accept confidence and record the reinforcement: read the current confidence from the in-scope response (`session.response?.status === "ok" ? session.response.confidence : null`), call `session.markReinforced(thatConfidence)` (stores the delta info + records "improve"), then `void session.reSearch("reinforce")`. Pass `reinforcedFrom` to DiagnosisCard: pass `session.reinforcement.fromConfidence` only when `session.reinforcement` is non-null AND `session.reinforcement.query === session.lastQuery` (so the delta shows on the reinforced card and is absent after a fresh search or a forget re-search, which clear reinforcement); otherwise pass `undefined`. The card remount via `key` is irrelevant — the delta arrives as a prop.

6) MODIFY frontend/components/UploadPanel.tsx — record the "remember" lifecycle event (~3 lines total). Call `useSearchSession()` at the top of the component, then after the upload-accept toast (`toast.success(UPLOAD_ACCEPTED_TOAST)` at ~line 162) call `recordLifecycleEvent("remember")`, and after the sample-load success toast (~line 196) call `recordLifecycleEvent("remember")`. No other changes.

7) MODIFY frontend/components/ResetButton.tsx — add an optional prop `onReset?: () => void`, invoked once immediately after `result.status === "reset"` (after the existing `queryClient.invalidateQueries()` + success toast). This is how the topbar reset also clears the session (EmptyState, dark strip, zero stats).

8) MODIFY frontend/app/(mvp)/app/memory/page.tsx — upgrade the DatasetList onForgotten handler to the full cross-route beat. Add `useRouter` from `next/navigation`. Handler: `session.recordLifecycleEvent("forget")`; if `!session.lastQuery` return; `await session.reSearch("forget")`; then `toast.success("Diagnosis updated with current memory", { action: { label: "View diagnosis", onClick: () => router.push("/app") } })` (import `toast` from `sonner`). ForgetButton's own immediate "Forgotten — updating results…" toast stays as-is; this is the second, action-bearing toast that fires after the re-search resolves. Toast-with-action over auto-navigate: it does not yank the presenter mid-narration.

Commit at the end of this task: `feat(260704-lgf): add depth kit — lifecycle strip, session stats, reinforcement delta`.
  </action>
  <verify>
    <automated>cd frontend && test -f components/LifecycleStrip.tsx && test -f components/SessionStats.tsx && grep -q "reinforcedFrom" components/DiagnosisCard.tsx && grep -q "onReset" components/ResetButton.tsx && grep -q "recordLifecycleEvent" components/UploadPanel.tsx && grep -q "SessionStats" "app/(mvp)/app/page.tsx" && grep -q "LifecycleStrip" components/AppShell.tsx && grep -q "View diagnosis" "app/(mvp)/app/memory/page.tsx" && npm run typecheck</automated>
  </verify>
  <done>LifecycleStrip + SessionStats components exist and are mounted (strip in AppShell hidden lg:flex, stats on the Diagnose page); DiagnosisCard renders the reinforcement-delta badge when reinforcedFrom is present + confidence non-null; UploadPanel records "remember" on both upload-accept and sample-load; ResetButton invokes onReset after a successful reset; the Memory page fires the "View diagnosis" action-toast after a forget re-search; `npm run typecheck` passes clean.</done>
</task>

<task type="auto">
  <name>Task 3: Full verification gate — lint, typecheck, build (4 routes emitted), marketing tests green</name>
  <files>frontend/ (no source changes unless a gate fails)</files>
  <action>
Run the full verification gate from the approved spec's Phase 3. In frontend/: run `npm run lint`, then `npm run typecheck`, then `npm run build`, then `npm test` (the marketing vitest suite). All must pass. Confirm `npm run build`'s route manifest lists all 4 MVP routes: /app, /app/memory, /app/graph, /app/activity. Confirm the marketing vitest suite (app/(marketing)/ + src/) stays green — this change never touches the marketing tree, so it must not regress.

If any gate fails, fix the minimal cause in the relevant Task 1/Task 2 file (do NOT expand scope or alter locked architecture) and re-run the full gate until clean. Only commit if fixes were needed: `fix(260704-lgf): resolve verification gate failures`.

After the automated gate is green, the human demo checklist below should be run once in a browser before the demo (no browser-automation tooling is installed in this environment per prior-phase notes, so this stays a human step and does not block the commit).
  </action>
  <verify>
    <automated>cd frontend && npm run lint && npm run typecheck && npm run build 2>&1 | tee /tmp/pp-build.log && grep -Eq "/app/memory" /tmp/pp-build.log && grep -Eq "/app/graph" /tmp/pp-build.log && grep -Eq "/app/activity" /tmp/pp-build.log && npm test</automated>
    <human-check>
Run the approved-spec manual demo loop once in a browser:
1. /app: topbar renders, Diagnose pill active, EmptyState, stat tiles at zero, lifecycle strip dark.
2. /app/memory → Load Sample: rows go processing→ready, datasets/health populate, "remember" node lights.
3. /app Diagnose → search "customers double-charged": skeleton → card; "recall" lit; Recalls = 1.
4. Accept Fix: "Reinforced ✓" chip stays mounted during re-search (isPending/isReSearching separation visibly holds) → new card shows "X% → Y% after reinforcement"; "improve" lit; Recalls = 2.
5. /app/memory → upload a release note: Drifting tile > 0; Diagnose "Drift events" agrees.
6. Forget the drifting dataset from /app/memory: two-step confirm → immediate toast → "forget" lights → re-search resolves → "Diagnosis updated" toast → "View diagnosis" → /app shows the flipped diagnosis with NO reinforcement delta.
7. /app/graph: renders wide, node-click panel works, revisit uses cached data.
8. /app/activity: timeline ordered.
9. State survival: search → visit all routes → return: card intact; AuroraBackground never flickers; browser back/forward works.
10. Reset from topbar: queries invalidated AND session cleared (EmptyState, dark strip, zero stats).
11. Hard refresh on each URL loads clean (session state gone — accepted risk).
    </human-check>
  </verify>
  <done>npm run lint, npm run typecheck, and npm run build all pass clean; the build emits /app, /app/memory, /app/graph, /app/activity; the marketing vitest suite stays green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → FastAPI backend | Existing search/upload/forget/reset calls; unchanged by this plan (same lib/api.ts wiring, same endpoints, same inputs). |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-lgf-01 | Information Disclosure | client-side SearchSessionProvider state | low | accept | Session state is per-tab in-memory React state (diagnosis text already shown to the user); no new persistence, no new network sink, cleared on hard refresh — no new disclosure surface. |
| T-lgf-02 | Tampering | dependencies / packages | low | accept | No new packages installed; uses only already-present deps (react, next, @tanstack/react-query, sonner, lucide-react). No package-legitimacy gate needed. |
| T-lgf-03 | Denial of Service | cross-route auto re-search (reSearch) | low | accept | reSearch fires only on explicit Accept/Forget user actions and reuses the existing single-flight searchIncident call; no new unbounded loop or polling introduced beyond the existing UploadPanel poll. |

No new trust boundary, endpoint, external dependency, or untrusted-input sink is introduced — this is a client-side route/state refactor plus additive UI.
</threat_model>

<verification>
- `npm run lint` clean.
- `npm run typecheck` (tsc --noEmit) clean.
- `npm run build` succeeds and emits /app, /app/memory, /app/graph, /app/activity.
- `npm test` (marketing vitest) stays green.
- Manual demo loop (Task 3 human-check) passes end-to-end, most critically: the cross-route forget→re-search beat and search-state survival across navigation.
</verification>

<success_criteria>
- The MVP dashboard is split into 4 shell-wrapped routes with a persistent Link nav.
- Search state survives navigation; the diagnosis card is not lost or remounted when moving between routes.
- The core demo beat works across routes (search → forget on /app/memory → auto re-search → action-toast → flipped diagnosis on /app).
- Depth kit is live: lifecycle strip lights per op, session-stat tiles count live, the confidence-delta badge shows after Accept and is absent after a forget re-search.
- lint + typecheck + build + marketing vitest all pass; all 4 routes emitted.
- All work committed on branch dev/patch-pilot-app.
</success_criteria>

<output>
Create `.planning/quick/260704-lgf-split-app-into-4-routes-with-app-shell-a/260704-lgf-SUMMARY.md` when done.
</output>
