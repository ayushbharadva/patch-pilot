# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 1-Foundation
**Areas discussed:** Seed corpus story

---

## Gray Area Selection

| Area offered | Description | Selected |
|--------------|-------------|----------|
| Seed corpus story | Concrete before/after narrative (DEMO-02) | ✓ |
| CLI flip output | How the seed CLI prints the before/after forget flip | |
| Persistence proof | Canary + restart mechanics, `.patchpilot_memory/` gitignore | |
| Health check scope | What `/health/cognee` ingests for its <30s roundtrip | |

**User's choice:** Seed corpus story only.

---

## Seed corpus story — Scenario

| Option | Description | Selected |
|--------|-------------|----------|
| Redis pool exhaustion | Workers hang; v1.8 cron-restart workaround; v1.9 fixes pool leak | |
| Auth token expiry | Random logouts; v1.8 bump-TTL workaround; v1.9 fixes token refresh | |
| Stripe dup charges | Webhook double-charges; v1.8 nightly dedup script; v1.9 adds idempotency keys | ✓ |

**User's choice:** Stripe dup charges.
**Notes:** Money-visible, high-stakes arc so the forget→flip moment lands hard. Datasets: `incidents` (bug), `workarounds_v1_8` (dedup script, forgotten), `workarounds_v1_9` (idempotency keys from release, survives forget).

---

## Seed corpus story — Corpus size

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal 3-doc | One incident + one v1.8 workaround + one v1.9 release | |
| Medium ~8-doc | 2-3 incidents + chat snippet + tickets + workaround + release | ✓ |
| You decide | Smallest reliable flip, bias minimal | |

**User's choice:** Medium ~8-doc.
**Notes:** Richer graph for recall to reason over; still under $10 cognify cap. Raises #1023 leak risk → captured as builder concern B-01.

---

## Seed corpus story — Incident mix

| Option | Description | Selected |
|--------|-------------|----------|
| All on double-charge | 2-3 incidents are the same Stripe arc over time | |
| Mixed bag | Include 1-2 unrelated incidents for texture; only Stripe flips | ✓ |
| You decide | Cluster tightly, defer texture to Phase 2/4 | |

**User's choice:** Mixed bag.
**Notes:** Unrelated incidents (e.g. login bug, latency spike) are decoration. Only the Stripe arc flips → captured builder concern B-02 (distinct query terms keep recall focused post-forget).

---

## Seed corpus story — File format

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown .md | One .md per ticket/chat/release; human-readable | ✓ |
| Plain .txt | Bare text, no structure | |
| JSON records | Structured id/source/timestamp/body | |

**User's choice:** Markdown .md.
**Notes:** Easy to author the narrative; uploads naturally in Phase 2's file-upload UX.

---

## Claude's Discretion

- CLI flip output format (side-by-side vs diff vs color).
- Persistence-proof mechanics (canary content, manual vs scripted restart, `.patchpilot_memory/` gitignore).
- `/health/cognee` fixture scope and cleanup.
- Exact search query string, unrelated-incident topics, per-doc wording.

## Deferred Ideas

- Richer / larger corpus beyond ~8 docs — Phase 2+ enrichment.
- More unrelated incidents for graph texture — Phase 2/4 (graph view), not the Phase 1 isolation test.
