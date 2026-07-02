# Phase 2: Core Recall - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 2-Core Recall
**Areas discussed:** Ingest & upload UX, Diagnosis card layout, Feedback interaction, Release upload & dataset list, Page structure & navigation, Search UX & states, Batch upload progress, Error handling, Sample dataset scope & search input assistance

---

## Ingest & Upload UX

| Question | Option | Description | Selected |
|---|---|---|---|
| File type declaration | Explicit selector | User picks a type dropdown/tabs before upload | ✓ |
| | Freeform + auto-detect | Backend/LLM guesses type from content | |
| Batch upload | Single file per upload | Simpler UI/backend, matches seed corpus structure | |
| | Multi-file batch upload | Drag multiple files, each cognified independently | ✓ |
| Seed corpus loading | "Load Sample Data" button | Explicit UI action, ingests via upload pipeline | ✓ |
| | Auto-preload on first launch | Backend seeds automatically if datasets empty | |
| Post-upload ack UX | Toast + processing badge | Immediate toast + status badge flipping to Ready | ✓ |
| | Toast only | Acknowledgment toast, no persistent status | |

**User's choice:** Explicit selector; multi-file batch; "Load Sample Data" button; toast + processing badge.
**Notes:** None — recommended options selected throughout.

---

## Diagnosis Card Layout

| Question | Option | Description | Selected |
|---|---|---|---|
| Card fusion layout | Root cause on top, evidence below | Recommendation first, evidence as support underneath | ✓ |
| | Side-by-side split | Root cause left, evidence right column | |
| Evidence count/length | 2-3 snippets, short excerpt | Truncated with expand-on-click | ✓ |
| | All matching evidence, full text | Everything CHUNKS returns, full text | |
| Source drill-down | Yes, click-to-expand | Click snippet to see full ingested document | ✓ |
| | No, snippet is the whole experience | No drill-down | |
| Dataset/version tag | Yes, small dataset/version tag | e.g. "v1.8" pill next to the fix | ✓ |
| | No, keep card dataset-agnostic | No dataset/version metadata shown | |

**User's choice:** Root cause on top; 2-3 short snippets; click-to-expand; dataset/version tag shown.
**Notes:** Dataset/version tag explicitly framed as pre-work for Phase 3's drift badges.

---

## Feedback Interaction

| Question | Option | Description | Selected |
|---|---|---|---|
| Reject behavior | Silent dismiss, no reinforcement call | Reject clears/dims card, no negative-feedback API call | ✓ |
| | Reject triggers a negative signal | Reject actively demotes via feedback mechanism | |
| Accept confirmation | Inline state change on the card | Button becomes checkmark/"Reinforced" label | ✓ |
| | Toast notification | Toast confirms, card unchanged | |
| Reinforcement proof | Re-run search, show reordering/priority | Re-search shows accepted fix ranked first | ✓ |
| | Show a raw score/weight number | Display underlying confidence/weight before/after | |
| Feedback granularity | Whole-card only | One Accept/Reject per recommendation | ✓ |
| | Per-evidence-ticket feedback | Accept/reject individual evidence pieces | |

**User's choice:** Silent dismiss on reject; inline state change; re-search reordering as proof; whole-card granularity.
**Notes:** Silent-reject decision explicitly chosen to reduce exposure to the unresolved FEEDBACK API question (improve() vs SearchType.FEEDBACK).

---

## Release Upload & Dataset List

| Question | Option | Description | Selected |
|---|---|---|---|
| Version determination | Manual input field | User types version alongside release-note upload | ✓ |
| | Auto-detect from filename/content | Backend parses version from filename/text | |
| Dataset list content | Name + document count | e.g. "workarounds_v1_9 · 2 docs" | ✓ |
| | Name only | Bare list of dataset names | |
| Upload flow | Same upload flow, "Release Note" as a type | Reuses explicit-type-selector, routes to workarounds_v{N} | ✓ |
| | Separate "Upload Release" flow | Distinct UI section/button for releases | |

**User's choice:** Manual version input; name + doc count; unified upload flow.
**Notes:** None.

---

## Page Structure & Navigation

| Question | Option | Description | Selected |
|---|---|---|---|
| Overall structure | Single-page dashboard | All sections visible on one page | ✓ |
| | Tabs/pages (Search / Upload / Datasets) | Separate routes per function | |
| Search bar position | Persistent top bar | Always visible, primary action | ✓ |
| | Hero/centered, moves up after first search | Google-style centered then relocates | |

**User's choice:** Single-page dashboard; persistent top-bar search.
**Notes:** Chosen to minimize navigation clicks during the timed 120s demo.

---

## Search UX & States

| Question | Option | Description | Selected |
|---|---|---|---|
| Empty state (pre-search) | Prompt + example query | Hint text with the canonical demo query | ✓ |
| | Blank / minimal placeholder | Empty search bar, no hints | |
| Loading state | Skeleton diagnosis card | Greyed placeholder shaped like real card | ✓ |
| | Spinner only | Simple centered spinner | |
| Zero-result handling | Explicit empty-state message | "No prior incidents found for this query" | ✓ |
| | Fall back to a generic LLM answer | GRAPH_COMPLETION answers from general knowledge | |

**User's choice:** Prompt + example query; skeleton card; explicit empty-state message.
**Notes:** Zero-result fallback rejected explicitly to protect the evidence-grounded positioning of the product.

---

## Batch Upload Progress

| Question | Option | Description | Selected |
|---|---|---|---|
| Progress display | Per-file status rows | Each file gets its own status row | ✓ |
| | Single aggregate indicator | One "Processing 3 of 5" bar for the whole batch | |

**User's choice:** Per-file status rows.
**Notes:** None.

---

## Error Handling

| Question | Option | Description | Selected |
|---|---|---|---|
| Cognify failure handling | Row flips to "Failed" + retry button | Per-file status row turns Failed with retry | ✓ |
| | Silent failure, log only | Failure logged server-side, UI silent | |
| Error detail shown | Short human message | e.g. "Couldn't process this file — try again." | ✓ |
| | Full error/exception text | Raw backend error shown to user | |

**User's choice:** Row flips to Failed with retry; short human-readable error messages only.
**Notes:** Short-message decision explicitly ties back to Phase 1's WR-03 fix (don't leak raw exception text).

---

## Sample Dataset Scope & Search Input Assistance

| Question | Option | Description | Selected |
|---|---|---|---|
| Sample bundle scope | Single bundle: the Stripe arc | One "Load Sample Data" button loads all 8 seed docs | ✓ |
| | Multiple named bundles | A second unrelated bundle with its own arc | |
| Search input aid | Plain text box only | No autocomplete/chips | |
| | Clickable example-query chip(s) | One or two chips below the search bar | ✓ |

**User's choice:** Single Stripe-arc bundle only; clickable example-query chip(s).
**Notes:** Search-chip choice deviates from the recommended "plain text box only" option — user preferred the smoother live-demo affordance.

---

## Claude's Discretion

- Exact visual styling (colors, spacing, iconography for status badges/tags) — deferred to `/gsd-ui-phase` if run, or planner's discretion otherwise.
- Toast component implementation, skeleton-card exact shape, dataset/version tag visual treatment.
- Whether the "processing badge" and "per-file status row" are the same UI element or two separate indicators.

## Deferred Ideas

- Multiple sample dataset bundles beyond the Stripe arc.
- Per-evidence-ticket feedback (accept/reject individual evidence pieces).
- Negative reinforcement on Reject (pending FEEDBACK API resolution).
- Confidence score display (STRETCH-01, already scoped to Phase 4).
- Visual design system specifics (colors, spacing, iconography) — belongs to `/gsd-ui-phase`.
