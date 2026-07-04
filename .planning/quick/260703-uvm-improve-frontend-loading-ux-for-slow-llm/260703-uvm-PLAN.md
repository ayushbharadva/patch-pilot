---
phase: 260703-uvm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/components/SearchProgress.tsx
  - frontend/components/DiagnosisCard.tsx
  - frontend/app/page.tsx
  - frontend/components/FileStatusRow.tsx
autonomous: true
# Quick task — no ROADMAP requirement IDs. These are the existing decisions the
# UX changes preserve/enhance (kept for traceability, not roadmap coverage):
requirements: [D-20, D-11, D-12, D-22, D-05, D-24]
must_haves:
  truths:
    - "During an in-flight search, the skeleton shows text that CHANGES over time (not a frozen 'Searching memory…')."
    - "After ~12s of searching, a persistent reassurance line appears."
    - "Screen readers get ONE stable announcement, not repeated cycling spam."
    - "During an Accept/Forget re-search, the accepted card stays mounted (Reinforced ✓ still visible) AND the inline indicator shows the same progressive language + a spinner."
    - "A file in 'processing' shows a pulsing badge + a reassurance caption."
    - "npm run lint, npx tsc --noEmit, and npm run build all pass clean."
  artifacts:
    - "frontend/components/SearchProgress.tsx (shared progressive-message component)"
    - "frontend/components/DiagnosisCard.tsx (DiagnosisCardSkeleton uses SearchProgress)"
    - "frontend/app/page.tsx (re-search indicator uses SearchProgress; card still mounted)"
    - "frontend/components/FileStatusRow.tsx (processing badge pulses + caption)"
  key_links:
    - "SearchProgress mounts only while pending and clears its interval + timeout on unmount (no leaked timers)."
    - "page.tsx re-search branch must NOT render DiagnosisCardSkeleton — the accepted card must stay mounted (D-11/D-12)."
    - "Cycling visual text is aria-hidden; a stable sr-only label carries the announcement so the aria-live region does not spam SR."
---

<objective>
Make the slow (5–20s) LLM-bound search and upload waits feel alive instead of frozen — frontend presentation only. Three improvements, all pure "use client" React (useState/useEffect/setInterval) + Tailwind, reusing existing ui primitives. No backend edits, no latency change, no new npm deps, and zero change to the search→drift→forget→re-search business logic.

Purpose: A single static "Searching memory…" line and a static "Processing" badge read as hung during the real first-search cold-start (Mistral free tier) and the 8–20s cognify. Animated, staged messaging communicates progress and keeps judges/users confident during the demo.

Output: A new shared `SearchProgress` component reused by both the initial-search skeleton and the inline re-search indicator, plus a pulsing/reassuring "Processing" state on upload rows.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@frontend/AGENTS.md
@frontend/app/page.tsx
@frontend/components/DiagnosisCard.tsx
@frontend/components/FileStatusRow.tsx
@frontend/components/UploadPanel.tsx
@frontend/lib/utils.ts
@frontend/components/ui/skeleton.tsx
@frontend/components/ui/badge.tsx

Convention note (frontend/AGENTS.md): this is a MODIFIED Next.js — read node_modules/next/dist/docs/ before writing any Next.js-specific code. This plan intentionally uses NO Next.js-specific APIs (only client-component React hooks + Tailwind + lucide-react + shadcn primitives), so that gate does not apply. If the executor finds itself reaching for anything Next-specific, STOP and read the relevant doc first.

Style contract (match exactly): font-sans / font-mono / font-display tokens, text-muted-foreground, the cn() util from @/lib/utils, shadcn/ui patterns, dense explanatory comments with D-xx references. `sr-only` and `animate-pulse` are Tailwind core utilities (no custom CSS needed); `animate-spin` likewise. Reuse existing primitives (Skeleton, Badge) — do NOT add dependencies.
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create shared SearchProgress component (Improvement 1 + 2 core)</name>
  <files>frontend/components/SearchProgress.tsx</files>
  <behavior>
    - On mount, shows the first message and a stable sr-only label; the visible message advances through the staged list every ~4s and clamps on the last message (does not loop back).
    - After ~12s, a persistent reassurance line appears below the primary message and stays.
    - On unmount, both the interval and the timeout are cleared (no leaked timers, no state-set-after-unmount).
    - The cycling/reassurance visual text is aria-hidden; only the fixed sr-only label is in the accessibility tree.
  </behavior>
  <action>
Create a new client component file with the "use client" directive at the top. Import useEffect and useState from react, Loader2 from lucide-react, and cn from "@/lib/utils".

Define module-level constants so identities are stable (this matters for the interval effect — see the deps note below):
- SEARCH_PROGRESS_MESSAGES: an ordered array of three staged strings mapped to the real pipeline — "Searching incident memory…", "Analyzing root cause…", "Gathering supporting evidence…".
- SEARCH_PROGRESS_INTERVAL_MS = 4000.
- SEARCH_PROGRESS_REASSURANCE_DELAY_MS = 12000.
- SEARCH_PROGRESS_REASSURANCE: the persistent line "Still working — the first search warms up the memory graph." (first-search cold-start on the Mistral free tier is real).
- DEFAULT_SR_LABEL: a single stable screen-reader sentence, e.g. "Searching incident memory. This can take up to 20 seconds."

Export a function component `SearchProgress` taking optional props with those constants as defaults: messages (default SEARCH_PROGRESS_MESSAGES), intervalMs (default SEARCH_PROGRESS_INTERVAL_MS), reassuranceDelayMs (default SEARCH_PROGRESS_REASSURANCE_DELAY_MS), reassuranceMessage (default SEARCH_PROGRESS_REASSURANCE), srLabel (default DEFAULT_SR_LABEL), showSpinner (boolean, default false), and className (string, optional).

State: an `index` number (start 0) and a `showReassurance` boolean (start false).

Effect A (message cycling): a setInterval that advances index using a functional updater that clamps at the last index (Math.min(prev + 1, messages.length - 1)); return a cleanup that clears the interval. Effect B (reassurance): a setTimeout that sets showReassurance true after reassuranceDelayMs; return a cleanup that clears the timeout. List every value each effect reads in its dependency array to satisfy react-hooks/exhaustive-deps (Effect A: intervalMs and messages; Effect B: reassuranceDelayMs). Because messages defaults to a module-level constant, its identity is stable and the interval effect will not re-run every render — document this and warn callers not to pass an inline array literal as `messages`.

Render an outer div using cn to merge a base of "flex items-start gap-2 font-sans text-sm text-muted-foreground" with the incoming className. When showSpinner is true, render a Loader2 with classes "size-4 shrink-0 animate-spin mt-0.5" and aria-hidden. Inside, render a column (flex flex-col gap-0.5) containing: a span with the "sr-only" class holding srLabel; an aria-hidden span holding messages[index]; and, only when showReassurance is true, an aria-hidden span with class "text-xs" holding reassuranceMessage.

Add a docblock comment explaining this supersedes the old static "Searching memory…" label (extends D-20's skeleton decision) and that the cycling text is aria-hidden with a fixed sr-only label because both call sites render inside page.tsx's aria-live="polite" results section — cycling text in a live region would spam screen readers.
  </action>
  <verify>
    <automated>cd /Users/ayushbharadva/dev/personal/patch-pilot/frontend && grep -q "export function SearchProgress" components/SearchProgress.tsx && npx tsc --noEmit</automated>
  </verify>
  <done>frontend/components/SearchProgress.tsx exists, exports SearchProgress, and the project typechecks clean. The component cycles messages every ~4s (clamped), reveals a reassurance line at ~12s, cleans up its timers on unmount, and exposes cycling text as aria-hidden with a single stable sr-only label.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Wire SearchProgress into the search skeleton and the re-search indicator</name>
  <files>frontend/components/DiagnosisCard.tsx, frontend/app/page.tsx</files>
  <action>
In frontend/components/DiagnosisCard.tsx: add an import of SearchProgress from "@/components/SearchProgress". In DiagnosisCardSkeleton, replace the static paragraph (the one with classes "px-(--card-spacing) font-sans text-sm text-muted-foreground" containing the old searching label) with `<SearchProgress className="px-(--card-spacing)" />`. Leave the Card + CardHeader + CardContent Skeleton bars exactly as they are so there is no layout shift when real content arrives. Update the DiagnosisCardSkeleton docblock to note that the loading label is now progressive (staged messages + a reassurance line for the real first-search cold-start of up to ~20s), still extending D-20 and Plan 01's measured latency.

In frontend/app/page.tsx: add an import of SearchProgress from "@/components/SearchProgress". Replace ONLY the isReSearching branch's bare paragraph (currently the one-line "Updating diagnosis with reinforced memory…" text below the still-mounted card) with `<SearchProgress showSpinner srLabel="Updating diagnosis with reinforced memory." />`. Keep the existing comment block above isReSearching and the `{isReSearching ? … : null}` structure intact.

CRITICAL — preserve the deliberate D-11/D-12 decision documented on isReSearching: the re-search branch is SEPARATE from isPending precisely so the just-accepted DiagnosisCard stays mounted showing "Reinforced ✓" while the re-search runs, then swaps directly to the new diagnosis. Do NOT render DiagnosisCardSkeleton for re-search, do NOT move the indicator into the isPending branch, and do NOT unmount the card. This same inline indicator serves both re-search triggers (Accept in DiagnosisCard and Forget via DatasetList onForgotten), since both flow through handleReSearch — no per-trigger branching needed.
  </action>
  <verify>
    <automated>cd /Users/ayushbharadva/dev/personal/patch-pilot/frontend && grep -q "SearchProgress" components/DiagnosisCard.tsx && grep -q "SearchProgress" app/page.tsx && grep -q "isReSearching" app/page.tsx && npx tsc --noEmit</automated>
  </verify>
  <done>DiagnosisCardSkeleton renders SearchProgress in place of the static label with no structural/layout change. The page.tsx isReSearching branch renders SearchProgress (spinner + progressive text) while the accepted card remains mounted; isReSearching is still distinct from isPending and no skeleton is swapped in for re-search. Project typechecks clean.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Add pulse + reassurance caption to the upload Processing state (Improvement 3)</name>
  <files>frontend/components/FileStatusRow.tsx</files>
  <action>
In frontend/components/FileStatusRow.tsx: add an import of cn from "@/lib/utils". Define a new module-level constant next to COGNIFY_FAILURE_MESSAGE, e.g. PROCESSING_MESSAGE = "Building the knowledge graph — this can take a few seconds." (mirrors the existing D-24 failed-row caption pattern; add a short comment referencing D-05/D-22).

On the Badge, replace the plain className string "font-sans text-xs font-normal" with a cn() call that keeps those base classes and appends "animate-pulse" only when status === "processing" — so the Processing badge visibly breathes while cognify runs (8–20s) and the uploading/ready/failed badges are unchanged.

Add a second caption block that mirrors the existing failed caption: immediately after the `{status === "failed" ? <p>…COGNIFY_FAILURE_MESSAGE…</p> : null}` block, add `{status === "processing" ? <p className="font-sans text-sm text-muted-foreground">{PROCESSING_MESSAGE}</p> : null}`.

Keep ALL other behavior unchanged: the uploading/ready/failed states, the destructive badge variant on failed, the 44px (h-11 min-h-11) Retry button and its D-23 conditional render, and the D-24 failure copy. Do NOT add the optional live elapsed-seconds counter — it would require per-row processing-start plumbing from UploadPanel; ship just the pulse + caption to avoid over-engineering (explicitly out of scope for this task).
  </action>
  <verify>
    <automated>cd /Users/ayushbharadva/dev/personal/patch-pilot/frontend && grep -q "animate-pulse" components/FileStatusRow.tsx && grep -q "PROCESSING_MESSAGE" components/FileStatusRow.tsx && npx tsc --noEmit</automated>
  </verify>
  <done>Processing rows show a pulsing badge and a reassurance caption; uploading/ready/failed rows and the Retry button (44px hit target, D-23) are unchanged; no elapsed counter added. Project typechecks clean.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none new) | Presentation-only change. No new user input parsed, no new network call, no new dependency, no backend surface touched. All rendered strings are hardcoded module constants. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-uvm-01 | Information Disclosure | SearchProgress / FileStatusRow copy | low | accept | All displayed text is hardcoded reassurance/status copy; no user data, tokens, or backend error detail is interpolated. No mitigation needed. |
| T-uvm-02 | Denial of Service (client) | SearchProgress timers | low | mitigate | Both setInterval and setTimeout are cleared in effect cleanup on unmount; the component mounts only while pending, so no unbounded timer accumulation or state-set-after-unmount. |
| T-uvm-03 | Tampering | package.json / dependencies | low | accept | No package installs in this task (explicit constraint: no new npm deps). Package Legitimacy Gate / T-*-SC checkpoint not applicable. |
</threat_model>

<verification>
Run all three from the frontend directory; every one must pass clean before writing the SUMMARY:

1. Lint: `cd /Users/ayushbharadva/dev/personal/patch-pilot/frontend && npm run lint` (project script = `eslint`). Watch for react-hooks/exhaustive-deps warnings on the new effects — fix by listing all read values in the deps arrays as described in Task 1.
2. Typecheck: `cd /Users/ayushbharadva/dev/personal/patch-pilot/frontend && npx tsc --noEmit`.
3. Production build: `cd /Users/ayushbharadva/dev/personal/patch-pilot/frontend && npm run build` (script = `next build`). This is the comprehensive gate; it must complete without errors.

A full headless/browser visual check may not be feasible in this environment (prior phases confirmed no playwright/chromium-cli). Do NOT trigger unnecessary real backend searches or uploads (they bill cognify on the Mistral free tier). Instead, in the SUMMARY provide a reasoned behavior walkthrough of each of the three improvements, keyed to the code paths:
- Improvement 1: what a user sees in DiagnosisCardSkeleton across 0s → 4s → 8s → 12s+ (staged messages + reassurance line), and the a11y handling (single sr-only announcement, cycling text aria-hidden).
- Improvement 2: that the accepted card stays mounted (Reinforced ✓ visible) during re-search while the inline SearchProgress (spinner + progressive text) shows below — for both Accept and Forget triggers — and that no DiagnosisCardSkeleton is swapped in.
- Improvement 3: pulsing Processing badge + caption on processing rows, with uploading/ready/failed and the Retry button unchanged.
</verification>

<success_criteria>
- New shared component frontend/components/SearchProgress.tsx exists and is reused by BOTH DiagnosisCardSkeleton and the page.tsx re-search indicator.
- DiagnosisCardSkeleton shows staged, changing messages during an in-flight search, plus a persistent reassurance line after ~12s, with no layout shift.
- The re-search indicator is visually consistent with the initial-search language (progressive text + spinner) while the accepted card stays mounted (D-11/D-12 preserved); no skeleton swap-in.
- Upload "processing" rows show a pulsing badge + reassurance caption; all other FileStatusRow behavior (including the 44px Retry, D-24 copy) is unchanged.
- No backend files touched, no new npm dependencies, no Next.js-specific APIs introduced.
- `npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass clean.
</success_criteria>

<output>
Create `.planning/quick/260703-uvm-improve-frontend-loading-ux-for-slow-llm/260703-uvm-SUMMARY.md` when done, including the reasoned behavior walkthrough described in the verification section.
</output>
