# Implementation Plan: Cognee Hackathon Frontend

## Overview

This plan converts the mock-data-driven frontend design into incremental coding steps. It covers the typed mock data layer, the swappable API client abstraction, the landing page, and the core dashboard pages, wiring everything together so the full `search → drift → forget → re-search` demo loop runs end-to-end against mocks with zero backend dependency.

Implementation language: **TypeScript** (Next.js App Router, Tailwind CSS, shadcn/ui, Motion), per the design document.

Scope note: Requirements 1–6 (Hackathon Research Report, Competitor Teardown, Design Direction Document, Steering File Set, Stack Research Report, Clarifying Questions Log) and Requirement 10 (manual Polish Audit) are research/documentation and manual-audit process deliverables. They are not code and are intentionally excluded from this coding task list. This plan implements Requirements 7, 8, and 9.

## Tasks

- [x] 1. Project scaffold and shared type contracts
  - [x] 1.1 Initialize the Next.js App Router project and dependencies
    - Scaffold `src/` App Router project with TypeScript, Tailwind, ESLint, import alias `@/*`
    - Add `motion`, `lucide-react`, `next-themes`, `clsx`, `tailwind-merge`; init shadcn/ui
    - Add Vitest, `@testing-library/react`, `jsdom`, `fast-check`, `@fast-check/vitest`; create the directory structure from the design and the `cn()` helper in `src/lib/utils.ts`
    - _Requirements: 7.2, 7.3_

  - [x] 1.2 Define domain and lifecycle types
    - Create `src/types/domain.ts` (`DriftState`, `Incident`, `EvidenceChunk`, `DiagnosisResult`, `DriftResult`, `GraphNode`/`GraphLink`/`GraphData`)
    - Create `src/types/lifecycle.ts` (all request/result types, `LifecycleError`) and `src/types/index.ts` re-exports
    - _Requirements: 7.1, 7.2, 7.3, 9.5_

- [x] 2. Mock data layer
  - [x] 2.1 Create typed fixtures
    - Implement `src/lib/mock/fixtures.ts` with realistic, non-placeholder payloads for all seven lifecycle actions, including a pre-forget and post-forget recall result keyed per bug identifier
    - _Requirements: 7.1, 7.6_

  - [x] 2.2 Implement the session store
    - Implement `src/lib/mock/store.ts`: track forgotten bug identifiers, resolve pre/post-forget recall per bug id, and reset all flags on demo reset
    - _Requirements: 7.6, 7.7, 7.8, 7.9_

  - [x]\* 2.3 Write property test for the forget/reset state machine
    - **Property 1: Forget and reset state machine keyed by bug identifier**
    - **Validates: Requirements 7.6, 7.7, 7.8, 7.9, 9.8**

  - [x] 2.4 Implement delay and error simulation
    - Implement `src/lib/mock/simulate.ts`: bound delayed responses to [500ms, 5000ms] and reject with a typed `LifecycleError` on the error scenario
    - _Requirements: 7.5_

  - [x]\* 2.5 Write property test for delay bounds
    - **Property 3: Delayed responses are bounded**
    - **Validates: Requirements 7.5**

  - [x] 2.6 Implement file selection validation
    - Implement `src/lib/mock/validation.ts` (`validateIngestFile`): accept `.txt/.md/.json/.csv/.log` up to 10 MB inclusive; reject with `too-large` or `unsupported-format`
    - _Requirements: 9.1, 9.2_

  - [x]\* 2.7 Write property test for file validation
    - **Property 4: Ingest file validation is total with a fixed boundary**
    - **Validates: Requirements 9.1, 9.2**

- [x] 3. API client layer (swap boundary)
  - [x] 3.1 Implement scenario control
    - Implement `src/lib/api/scenarios.ts`: per-action `setScenario`/`getScenario` state independent across actions
    - _Requirements: 7.4_

  - [x]\* 3.2 Write property test for scenario independence
    - **Property 2: Scenario selection is independent per action**
    - **Validates: Requirements 7.4**

  - [x] 3.3 Define the client interface
    - Implement `src/lib/api/client.ts`: `PatchPilotClient` interface (one function per lifecycle action) and `getClient()`
    - _Requirements: 7.2, 7.3_

  - [x] 3.4 Implement the mock-backed client
    - Implement `src/lib/api/mock-client.ts`: satisfy `PatchPilotClient`, reading scenario state and delegating to store/simulate/validation
    - _Requirements: 7.1, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [x] 3.5 Create the public API surface
    - Implement `src/lib/api/index.ts`: export one lifecycle function per action plus re-export scenario control; this is the only module components import
    - _Requirements: 7.2, 7.3, 7.10_

  - [x]\* 3.6 Write unit tests for the client surface
    - Assert all seven lifecycle functions are exposed and every action has a non-placeholder fixture (scan for banned markers)
    - _Requirements: 7.1, 7.2_

  - [x] 3.7 Enforce the swap boundary with ESLint
    - Add a `no-restricted-imports` rule forbidding imports of `@/lib/mock` outside `@/lib/api`
    - _Requirements: 7.2, 7.10_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Theme system, shared components, and interaction hook
  - [x] 5.1 Configure the theme and fonts
    - Define light/dark theme tokens in `globals.css`, extend `tailwind.config.ts`, load Space Grotesk/Inter/IBM Plex Mono via `next/font/google`, add `ThemeProvider` and `ThemeToggle` (next-themes, system default)
    - _Requirements: 9.11_

  - [x] 5.2 Implement shared state components and the lifecycle hook
    - Implement `LoadingState`, `ErrorState` (retry re-invokes the same function), `EmptyState`, and reduced-motion-aware `Reveal`; implement `src/hooks/use-lifecycle-action.ts`
    - _Requirements: 8.4, 8.7, 9.6, 9.9, 9.10_

  - [x]\* 5.3 Write unit tests for shared components and hook
    - Test `Reveal` reduced-motion path renders content without animated transition and `use-lifecycle-action` retry re-invokes the identical function
    - _Requirements: 8.7, 9.10_

- [x] 6. Landing page
  - [x] 6.1 Root layout, site config, and metadata
    - Implement `src/app/layout.tsx` (fonts, ThemeProvider), `src/config/site.ts`, `(marketing)/layout.tsx`, and page metadata via the Next.js Metadata API (title, description, OpenGraph image)
    - _Requirements: 8.6_

  - [x] 6.2 Build the landing sections
    - Implement `(marketing)/page.tsx` with Hero (value prop ≤ 8 words, supporting sentence ≤ 160 chars, CTA ≥ 44×44px with hover/tap motion), How-It-Works, Diagnosis/Drift previews, and Footer; use domain-specific content and `Reveal` once-per-load scroll entrances with no horizontal scroll
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7_

  - [x]\* 6.3 Write unit tests for landing content constraints
    - Assert hero word/char limits, CTA size, no placeholder text, `Reveal` viewport-once, reduced-motion behavior, and metadata presence
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.7_

- [x] 7. Dashboard shell and core pages
  - [x] 7.1 Build the dashboard shell and route boundaries
    - Implement `(dashboard)/layout.tsx` (sidebar, header, theme toggle, nav to all pages), per-segment `error.tsx`/`loading.tsx`, and custom `not-found.tsx`, sharing the Design Direction visual language
    - _Requirements: 9.11_

  - [x] 7.2 Implement the ingest page
    - Implement `IngestDropzone` (client-side validation before any client call, sample dataset picker) and `(dashboard)/ingest/page.tsx` rendering the ingest result via loading/error/retry states
    - _Requirements: 9.1, 9.2, 9.9, 9.10_

  - [x] 7.3 Implement the recall/diagnosis page
    - Implement `DiagnosisCard` (root-cause recommendation beside reconstructing incidents) and `(dashboard)/recall/page.tsx` sourced from the recall function with loading/error/retry
    - _Requirements: 9.3, 9.9, 9.10_

  - [x]\* 7.4 Write property test for DiagnosisCard
    - **Property 5: DiagnosisCard renders the full recommendation**
    - **Validates: Requirements 9.3**

  - [x] 7.5 Implement the memory graph page
    - Implement `GraphViewer` and `(dashboard)/graph/page.tsx` rendering the mock incidents/fixes/components graph with loading/error/retry
    - _Requirements: 9.4, 9.9, 9.10_

  - [x] 7.6 Implement the release/drift page
    - Implement `DriftIndicator` (🟢/🟡/🔴 with mandatory reason string) and `(dashboard)/drift/page.tsx`, including the empty state when no memories are flagged
    - _Requirements: 9.5, 9.6, 9.9, 9.10_

  - [x]\* 7.7 Write property test for the drift panel
    - **Property 6: DriftIndicator always shows state and reason**
    - **Validates: Requirements 9.5**

  - [x] 7.8 Implement the forget/demo-reset page
    - Implement `(dashboard)/forget/page.tsx` with forget and demo-reset actions through the client, each showing a distinguishable success indicator, with loading/error/retry
    - _Requirements: 9.7, 9.8, 9.9, 9.10_

- [x] 8. Integration and wiring
  - [x] 8.1 Wire navigation and enforce visual consistency
    - Connect all pages through the shell navigation and confirm consistent typography, color tokens, spacing, and animation intensity across every core page
    - _Requirements: 9.11_

  - [x]\* 8.2 Write integration test for the demo loop
    - Drive the full search → drift → forget → re-search sequence and assert the recall phase flips within the same session
    - _Requirements: 9.8_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (unit, property, and integration tests) and can be skipped for a faster MVP.
- Each task references specific requirement sub-clauses for traceability.
- Property tests use `fast-check` with Vitest, a minimum of 100 iterations, one test per property, each tagged `// Feature: cognee-hackathon-frontend, Property {number}: {property_text}`.
- The swap guarantee (Req 7.3) is proven statically by TypeScript strict mode plus the ESLint `no-restricted-imports` boundary (task 3.7), not by a property test.
- Requirements 1–6 (research/documentation deliverables) and Requirement 10 (manual Polish Audit) are non-coding process deliverables tracked outside this coding task list.

## Task Dependency Graph

```json
{
	"waves": [
		{ "id": 0, "tasks": ["1.1"] },
		{ "id": 1, "tasks": ["1.2", "3.7"] },
		{ "id": 2, "tasks": ["2.1", "2.4", "2.6", "3.1", "5.1"] },
		{ "id": 3, "tasks": ["2.2", "2.5", "2.7", "3.2", "3.3", "5.2"] },
		{ "id": 4, "tasks": ["2.3", "3.4", "5.3", "6.1"] },
		{ "id": 5, "tasks": ["3.5", "6.2", "7.1"] },
		{ "id": 6, "tasks": ["3.6", "6.3", "7.2", "7.3", "7.5", "7.6", "7.8"] },
		{ "id": 7, "tasks": ["7.4", "7.7", "8.1"] },
		{ "id": 8, "tasks": ["8.2"] }
	]
}
```
