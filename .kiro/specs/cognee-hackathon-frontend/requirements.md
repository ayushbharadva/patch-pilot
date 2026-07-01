# Requirements Document

## Introduction

This feature covers the pre-implementation research, clarification, and design-direction work required before writing any PatchPilot frontend code, followed by the scope of the mock-data-driven frontend build itself. PatchPilot is a living incident-memory system built on Cognee for the hackathon "The Hangover Part AI: Where's My Context?" (WeMakeDevs × Cognee, Jun 29 – Jul 5, 2026). The frontend must be judge-impressing, built independently of the backend against mock payloads, and structured so real backend integration later requires no rework.

This spec produces five documentation deliverables (hackathon research report, competitor teardown report, design direction document, steering files, tech stack research report) and defines the acceptance scope for the mock-data-driven frontend implementation itself (landing page + core dashboard pages + mock/API-ready architecture). No backend integration, no real Cognee calls, and no production deployment are in scope here.

## Glossary

- **Research_Agent**: The research process (performed by the model, using web search tools) responsible for producing the Hackathon_Research_Report, Competitor_Teardown_Report, and Stack_Research_Report.
- **Hackathon_Research_Report**: The documentation artifact capturing the official hackathon theme, judging criteria, prize categories, submission deadlines, eligible tech stacks, and mandatory project requirements, sourced from the hackathon page and provided hackathon context file.
- **Competitor_Teardown_Report**: The documentation artifact analyzing the prior winning project (manthan.quest) exclusively from a UI/UX and frontend-architecture perspective.
- **Clarifying_Questions_Log**: The list of ambiguous hackathon requirements, judging priorities, or constraints identified during research, along with their resolution status.
- **Design_Direction_Document**: The documentation artifact recording the confirmed project theme, visual mood, color strategy, typography pairing, layout density, animation intensity, and wow-factor elements for the PatchPilot frontend.
- **Steering_File_Set**: The collection of hackathon-specific workspace steering files (frontend roadmap, UI/UX guidelines, feature prioritization, submission checkpoint timeline) adapted from the existing base steering files in `~/.kiro/steering/`.
- **Stack_Research_Report**: The documentation artifact capturing 2026 UI/UX trend research, hackathon-judging-aligned frontend best practices, and a shortlist of skills.sh skills.
- **Mock_Data_Layer**: The set of TypeScript types and static/generated mock payloads representing every PatchPilot lifecycle action (ingest, recall, feedback, release upload, drift, forget, reset) used in place of live backend responses.
- **API_Client_Layer**: The abstraction (functions/interfaces) through which frontend components request lifecycle data, implemented initially against the Mock_Data_Layer and swappable for a real backend without changing consuming components.
- **Landing_Page**: The public marketing page presenting PatchPilot's value proposition, built first and treated as the highest-priority frontend deliverable.
- **Dashboard**: The collective set of core application pages/features (ingest, recall/diagnosis, memory graph, release/drift, forget/demo-reset) built against the Mock_Data_Layer.
- **Diagnosis_Card**: The signature UI component displaying a root-cause recommendation beside the prior incidents it was reconstructed from.
- **Drift_Indicator**: The UI element showing a memory's health state (🟢 Stable / 🟡 Aging / 🔴 Drifting).
- **Polish_Audit**: The internal UI/UX review process validating wow-factor, hackathon requirement compliance, accessibility, and performance before considering the frontend complete.
- **Submitter**: The person(s) completing this spec's deliverables (the hackathon team member(s) driving frontend development).

## Requirements

### Requirement 1: Hackathon Research & Audit

**User Story:** As the Submitter, I want a thorough audit of the official hackathon page and rules, so that the frontend I build is eligible for the prize tracks we are targeting and aligned with what judges actually score.

#### Acceptance Criteria

1. THE Research_Agent SHALL NOT consider the Hackathon_Research_Report complete until it contains, for each of the following six elements, either a confirmed value or an entry explicitly marked unconfirmed per Criterion 3: the official theme, all six judging criteria with their descriptions, all prize tracks with eligibility conditions, all submission deadlines (including any distinct project, video, or demo submission deadlines, if separately published), the eligible and/or required tech stack, and the mandatory project requirements.
2. WHEN the Research_Agent extracts a hackathon detail into the Hackathon_Research_Report, THE Research_Agent SHALL record the source (hackathon page URL or the provided hackathon context file) for that detail.
3. IF a hackathon detail cannot be confirmed from the hackathon page or the provided hackathon context file, THEN THE Research_Agent SHALL mark that detail as unconfirmed in the Hackathon_Research_Report rather than stating it as fact.
4. WHEN the Hackathon_Research_Report is produced, THE Research_Agent SHALL cross-reference its judging criteria against the six criteria already documented in the provided hackathon context file.
5. IF the cross-reference required by Criterion 4 finds a discrepancy between the Hackathon_Research_Report's judging criteria and the hackathon context file's judging criteria, THEN THE Research_Agent SHALL note that discrepancy beside the affected judging criterion in the Hackathon_Research_Report and SHALL append it to the Clarifying_Questions_Log.
6. WHEN the Hackathon_Research_Report is complete, THE Research_Agent SHALL append to the Clarifying_Questions_Log every hackathon requirement, judging priority, or constraint that meets at least one of the following conditions: it is marked unconfirmed per Criterion 3, the hackathon page and the provided hackathon context file state differing values for it, or it admits more than one reasonable interpretation that would affect judging priority or prize-track eligibility.

### Requirement 2: Competitor (manthan.quest) UI/UX Teardown

**User Story:** As the Submitter, I want a frontend-only teardown of the prior winning project's live demo, so that I can apply proven, judge-tested UI/UX patterns to PatchPilot without copying its backend or product concept.

#### Acceptance Criteria

1. WHEN the competitor teardown begins, THE Research_Agent SHALL produce a Competitor_Teardown_Report documenting at least two observations each for manthan.quest's visual style choices, frontend architecture, responsive design behavior (across mobile ≤480px, tablet 481-1024px, and desktop ≥1025px breakpoints), interactive/animated elements, and presentation strategy, covering inspection of the landing/demo page plus at least one interactive flow.
2. THE Competitor_Teardown_Report SHALL restrict its analysis to UI/UX and frontend-observable aspects, and SHALL exclude backend, business-model, or non-frontend commentary.
3. WHEN the Competitor_Teardown_Report documents an observation, THE Research_Agent SHALL pair that observation with an actionable takeaway that identifies a specific PatchPilot page, component, or interaction pattern to adopt, adapt, or avoid.
4. IF no actionable takeaway can be determined for an observation, THEN THE Research_Agent SHALL omit that observation from the Competitor_Teardown_Report.
5. THE Competitor_Teardown_Report SHALL include a dedicated section listing the actionable takeaways separately from the raw observations.
6. IF manthan.quest fails to load or a specific page/interaction cannot be inspected after 3 attempts within 30 seconds, THEN THE Research_Agent SHALL record that limitation in the Competitor_Teardown_Report instead of fabricating an observation.

### Requirement 3: Clarifying Questions & Confirmation Gate

**User Story:** As the Submitter, I want ambiguous hackathon requirements and theme decisions surfaced and confirmed before development starts, so that we do not build against a wrong assumption and lose eligibility or judge favor.

#### Acceptance Criteria

1. WHEN the Hackathon_Research_Report and Competitor_Teardown_Report are complete, THE Research_Agent SHALL present the Clarifying_Questions_Log to the Submitter for confirmation and SHALL establish a review checkpoint by which the Submitter must respond to each logged question.
2. WHILE the Clarifying_Questions_Log contains a question whose resolution status is neither "confirmed" nor "assumed", THE Research_Agent SHALL NOT mark the Design_Direction_Document as confirmed.
3. WHEN the Submitter responds to a clarifying question before the review checkpoint established in Criterion 1, THE Research_Agent SHALL record the response in the Clarifying_Questions_Log with a resolution status of "confirmed" before proceeding to theme definition.
4. IF the Submitter does not respond to a clarifying question by the review checkpoint established in Criterion 1, THEN THE Research_Agent SHALL be permitted to proceed to theme definition using its own best-judgment assumption, recorded in the Clarifying_Questions_Log with a resolution status of "assumed" and an accompanying rationale that references the specific finding in the Hackathon_Research_Report or Competitor_Teardown_Report supporting that assumption.
5. IF the Clarifying_Questions_Log contains no questions at the review checkpoint established in Criterion 1, THEN THE Research_Agent SHALL treat the Design_Direction_Document confirmation gate as satisfied and SHALL proceed to theme definition without recording any resolution status.

### Requirement 4: Theme & Design Direction Documentation

**User Story:** As the Submitter, I want a unique, documented design direction derived from the confirmed hackathon theme and research findings, so that the frontend has a consistent, judge-optimized visual identity instead of a generic template look.

#### Acceptance Criteria

1. WHEN the Clarifying_Questions_Log is fully resolved, THE Research_Agent SHALL produce a Design_Direction_Document recording the overall mood, color strategy, typography pairing, layout density, and animation intensity for the PatchPilot frontend.
2. THE Design_Direction_Document SHALL state, for each of the mood, color strategy, typography pairing, layout density, animation intensity, wow-factor element, and dark mode strategy decisions, a rationale that references the confirmed hackathon theme, the Hackathon_Research_Report, or the Competitor_Teardown_Report.
3. THE Design_Direction_Document SHALL list a minimum of five distinct wow-factor elements drawn from the hackathon-patterns steering checklist, each mapped to a specific page or component.
4. WHERE the Submitter has not confirmed a typography deviation, THE Design_Direction_Document SHALL adopt the existing project constraint typefaces (Space Grotesk for headings, Inter for body, IBM Plex Mono for mono).
5. IF the Submitter explicitly confirms a typography deviation, THEN THE Design_Direction_Document SHALL specify a concrete fallback heading, body, and mono typeface rather than leaving typography undefined.
6. THE Design_Direction_Document SHALL define layouts for each of the six key demo screens (landing page, ingest, diagnosis/recall, memory graph, release/drift, forget/reset), each specifying its purpose, layout pattern, key interactions, focal point, and one wow element drawn from the Design_Direction_Document's wow-factor element list.
7. THE Design_Direction_Document SHALL document a dark mode strategy consistent with the global theming steering file already present in the workspace (distinct from the Steering_File_Set produced under Requirement 5), specifying at minimum the dark-mode background treatment and the accent-color adjustment approach.
8. WHEN the Design_Direction_Document is complete, THE Research_Agent SHALL present it to the Submitter for confirmation before it is used as input to Requirement 5.
9. IF the Submitter requests changes to the presented Design_Direction_Document, THEN THE Research_Agent SHALL revise the Design_Direction_Document and re-present it to the Submitter for confirmation.

### Requirement 5: Hackathon-Specific Steering Files

**User Story:** As the Submitter, I want the base workspace steering files adapted into hackathon-specific steering files, so that all subsequent frontend work is guided by a roadmap, design guidelines, and timeline consistent with the confirmed theme.

#### Acceptance Criteria

1. WHEN the Design_Direction_Document is confirmed, THE Research_Agent SHALL produce a Steering_File_Set containing a frontend development roadmap, UI/UX design guidelines, a feature prioritization framework that ranks features according to the judging criteria weights recorded in the Hackathon_Research_Report, and a submission checkpoint timeline.
2. THE Steering_File_Set SHALL express each UI/UX design guideline and roadmap item as a reference to a specific named decision in the Design_Direction_Document or a specific detail recorded in the Hackathon_Research_Report, and SHALL NOT duplicate the wording of the base steering files verbatim.
3. THE Steering_File_Set SHALL align its submission checkpoint timeline with the hackathon deadlines recorded in the Hackathon_Research_Report such that no checkpoint is scheduled after its corresponding deadline, and the final checkpoint occurs on or before the earliest submission deadline recorded in the Hackathon_Research_Report.
4. THE Steering_File_Set SHALL be stored as workspace steering files distinct from the existing global base steering files, without modifying or deleting the base steering files.
5. IF a hackathon deadline required to construct the submission checkpoint timeline is marked "unconfirmed" per Requirement 1, THEN THE Research_Agent SHALL produce the Steering_File_Set with that checkpoint marked as pending confirmation instead of assigned a specific date.

### Requirement 6: Modern Frontend Tech Stack Research

**User Story:** As the Submitter, I want current best-practice and trend research for the mandated stack (Next.js, Tailwind CSS, shadcn/ui, Motion), so that the implementation reflects 2026-current patterns judges will recognize as polished rather than dated.

#### Acceptance Criteria

1. WHEN tech stack research begins, THE Research_Agent SHALL produce a Stack_Research_Report covering current UI/UX trends for Next.js, Tailwind CSS, shadcn/ui, and the Motion animation library, where "current" means published or updated within the 12 months preceding the research date, and SHALL document 3 to 8 trends per technology.
2. THE Stack_Research_Report SHALL compile frontend best practices addressing: accessible design conforming to WCAG 2.1 Level AA; performance optimization achieving Largest Contentful Paint (LCP) of 2.5 seconds or less; responsive cross-device compatibility validated against named mobile, tablet, and desktop viewport widths; and purpose-driven microinteractions, where each documented microinteraction identifies the user action that triggers it and the observable visual or state feedback it produces.
3. WHEN the Research_Agent searches for skills.sh skills to shortlist for a mandated technology (Next.js, Tailwind CSS, shadcn/ui, or Motion), THE Research_Agent SHALL retrieve each candidate skill's download count from skills.sh and SHALL include that download count alongside the skill in the Stack_Research_Report.
4. IF no candidate skill for a mandated technology has a retrievable download count of 200,000 or more, THEN THE Research_Agent SHALL record that technology as having no qualifying shortlisted skill rather than shortlisting a skill below the threshold or omitting the technology from the report.
5. IF skills.sh download data cannot be retrieved for a candidate skill, OR the retrieved download count is below 200,000, THEN THE Research_Agent SHALL exclude that skill from the shortlist and SHALL NOT estimate, approximate, or substitute a popularity value in its place.

### Requirement 7: Mock Data Layer & API-Ready Architecture

**User Story:** As a frontend developer, I want a typed mock data layer and a client abstraction covering every PatchPilot lifecycle action, so that I can build the full UI before the backend exists and swap in real API calls later without reworking components.

#### Acceptance Criteria

1. THE Mock_Data_Layer SHALL provide a mock payload containing realistic, non-placeholder sample values for each of the following lifecycle actions: ingest, recall/diagnosis, feedback, release upload, drift status, forget, and demo reset.
2. THE API_Client_Layer SHALL expose one function per lifecycle action, and consuming components SHALL call only the API_Client_Layer, not the Mock_Data_Layer, directly.
3. THE API_Client_Layer's exported function signature for each lifecycle action SHALL remain unchanged regardless of whether its implementation is backed by the Mock_Data_Layer or a real backend endpoint, such that swapping the implementation requires no change to any consuming component.
4. THE Mock_Data_Layer SHALL provide a mechanism to select, per lifecycle action and independent of other lifecycle actions, which of the success, error, or delayed response state is returned.
5. WHEN the Mock_Data_Layer is configured to simulate a delayed response state for a lifecycle action, THE Mock_Data_Layer SHALL delay that action's response by no less than 500ms and no more than 5000ms.
6. THE Mock_Data_Layer SHALL associate each recall/diagnosis mock payload with a bug identifier, such that a recall request can be evaluated against the same bug across multiple requests.
7. WHEN the Mock_Data_Layer serves a recall request for a bug identifier that has not yet been through the forget flow, THE Mock_Data_Layer SHALL return the pre-forget (old workaround) mock result for that bug identifier.
8. WHEN the Mock_Data_Layer serves a recall request for a bug identifier after the mock forget action has been triggered for that bug identifier, THE Mock_Data_Layer SHALL return a different, post-forget (new fix) mock result for that bug identifier.
9. WHEN the demo reset action is invoked through the API_Client_Layer, THE Mock_Data_Layer SHALL restore every bug identifier's forget flow status to not-yet-forgotten, such that subsequent recall requests return each bug identifier's pre-forget mock result.
10. THE API_Client_Layer SHALL remain the only access path for lifecycle data and for the state-selection mechanism described in Criterion 4, and components SHALL NOT import the Mock_Data_Layer directly.

### Requirement 8: Landing Page

**User Story:** As a judge or visitor, I want a landing page that communicates PatchPilot's value proposition within seconds and shows visible polish, so that my first impression is a "wow" rather than a generic hackathon prototype.

#### Acceptance Criteria

1. THE Landing_Page SHALL present a hero section with a value proposition statement of no more than eight words and a supporting explanation of exactly one sentence not exceeding 160 characters.
2. THE Landing_Page SHALL include a primary call-to-action button with a minimum click target size of 44x44 pixels and hover and tap motion feedback per the animation steering standards.
3. THE Landing_Page SHALL render without horizontal scrolling and with a Cumulative Layout Shift (CLS) score below 0.1 on viewport widths from 320px to 1920px.
4. WHEN a visitor scrolls the Landing_Page, THE Landing_Page SHALL reveal each section using a scroll-triggered entrance animation that runs once per page load.
5. THE Landing_Page SHALL use domain-specific PatchPilot demo content (e.g., sample incident and fix descriptions) and SHALL NOT contain generic placeholder text (e.g., "Lorem ipsum", "Sample Text", "Your text here").
6. THE Landing_Page SHALL define page metadata (title, description, OpenGraph image) via the Next.js Metadata API.
7. WHERE the visitor's device has "prefers-reduced-motion" enabled, THE Landing_Page SHALL present all entrance, hover, and tap feedback as immediate state changes without animated transition, while preserving section content and call-to-action functionality.

### Requirement 9: Core Dashboard Pages (Mock-Data-Driven)

**User Story:** As a judge watching the demo, I want the core PatchPilot dashboard pages built and visually consistent with the landing page, so that the full search → drift → forget → re-search story is demonstrable end-to-end without a live backend.

#### Acceptance Criteria

1. WHEN a user selects a file (in .txt, .md, .json, .csv, or .log format, up to 10 MB) or selects a bundled sample dataset on the ingest page/panel, THE Dashboard SHALL display the result returned by the API_Client_Layer's ingest function.
2. IF a user selects a file exceeding 10 MB or in an unsupported format on the ingest page/panel, THEN THE Dashboard SHALL reject the selection, display an error message indicating the file could not be ingested, and SHALL NOT invoke the API_Client_Layer's ingest function.
3. THE Dashboard SHALL render recall results in a Diagnosis_Card showing the root-cause recommendation beside the prior incidents it was reconstructed from, sourced from the API_Client_Layer's recall function.
4. THE Dashboard SHALL provide a memory graph view rendering the mock incidents/fixes/components graph returned by the API_Client_Layer.
5. THE Dashboard SHALL provide a release/drift panel that displays a Drift_Indicator (🟢/🟡/🔴) with a visible, explainable reason string for each affected memory, sourced from the API_Client_Layer's drift function.
6. WHEN the API_Client_Layer's drift function returns no affected memories, THE Dashboard SHALL display a message on the release/drift panel indicating that no memories are currently flagged as Aging or Drifting.
7. THE Dashboard SHALL provide a forget action and a demo reset action, each invoked through the API_Client_Layer, with each action displaying an observable success indicator upon completion that is distinguishable from the other action's indicator.
8. WHEN a user completes the mock search → drift → forget → re-search sequence on the Dashboard, THE Dashboard SHALL visibly reflect the before/after change in the recall result within the same session, consistent with the Mock_Data_Layer's before/after behavior.
9. WHEN a page or action on the Dashboard requests data or triggers an operation through the API_Client_Layer, THE Dashboard SHALL display a loading state for that page or action until the response is received.
10. IF a request through the API_Client_Layer fails for a Dashboard page or action, THEN THE Dashboard SHALL display an error state with a message indicating the failure and SHALL provide a retry action that re-invokes the same API_Client_Layer function.
11. THE Dashboard SHALL maintain the visual language (typography, color tokens, spacing, animation intensity) defined in the Design_Direction_Document across all core pages.

### Requirement 10: Presentation & Polish Audit

**User Story:** As the Submitter, I want an internal UI/UX audit before considering the frontend demo-ready, so that wow-factor, hackathon requirement compliance, and competitive positioning are validated rather than assumed.

#### Acceptance Criteria

1. WHEN the Landing_Page and Dashboard are implemented, THE Submitter SHALL run a Polish_Audit that evaluates every item in the Implementation Readiness Checklist and every item in the Project Delivery Checklist defined in the workspace steering files.
2. THE Polish_Audit SHALL confirm that at least five distinct wow-factor techniques from the combined Tier 1, Tier 2, and Tier 3 hackathon-patterns steering checklist are implemented and observably functioning across the Landing_Page and Dashboard.
3. IF, during Polish_Audit execution, the Landing_Page or any Dashboard page is found with a Lighthouse Performance, Accessibility, or Best Practices score below 90, THEN THE Submitter SHALL log the finding as a defect, identifying the affected page and the specific score, before the frontend is considered demo-ready.
4. IF, during Polish_Audit execution, a browser console error or warning is found on the Landing_Page or any Dashboard page, THEN THE Submitter SHALL log the finding as a defect, identifying the affected page and the error or warning content, before the frontend is considered demo-ready.
5. THE Polish_Audit SHALL verify, for the Landing_Page and every Dashboard page in dark mode, that all text meets a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text, that no light-mode-only styling remnants are visible, and that no layout breaks (overflow, clipped content, or misaligned elements) occur.
6. IF a Polish_Audit evaluation finds an item from the Implementation Readiness Checklist or Project Delivery Checklist unmet, THEN THE Submitter SHALL log the finding as a defect before the frontend is considered demo-ready.
7. WHEN a defect logged during Polish_Audit is remediated, THE Submitter SHALL re-run the corresponding Polish_Audit check to confirm the defect is resolved before the frontend is considered demo-ready.
