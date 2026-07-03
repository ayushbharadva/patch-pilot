---
phase: 04
slug: demo-loop-stretch
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-03
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| seed author → Cognee ingest (cognify) | Human-authored markdown becomes graph entities; cross-dataset entity names would reopen #1023 | seed doc text |
| memory tree → snapshot tar (filesystem) | Snapshot may contain cognified seed content | cognified graph/vector/relational DB files |
| browser → POST /reset | Untrusted trigger crosses to a destructive server action (localhost, CORS-locked to http://localhost:3000) | reset trigger, no payload |
| backend → filesystem (rmtree + untar) | Open DB handles vs a live filesystem swap | DB file handles |
| browser → GET /graph | Untrusted request crosses to a server-side graph export (localhost, CORS-locked) | reshaped graph JSON |
| backend → Cognee graph engine | Raw (nodes, edges) incl. full chunk text must be trimmed before crossing to the browser | node/edge properties |
| npm registry → frontend build | Supply-chain: react-force-graph + transitive three | third-party package code |
| timing harness → backend endpoints | Local script drives real endpoints (localhost); no new server surface introduced | HTTP requests |
| browser → POST /search | Existing endpoint; verbose=True changes the internal per-dataset result shape server-side only | query text |
| backend → client (confidence) | Only a scalar confidence crosses; raw verbose objects_result must not be forwarded | confidence float |
| browser client aggregation → GET /datasets | Reuses an existing endpoint already displayed by DatasetList; no new server surface | dataset metadata |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-04-01 | Tampering | new seed docs | medium | mitigate | Isolation grep gate (seed/README.md's isolation rule, seed_cli.py isolation checks) blocks any new cross-dataset entity name, preserving Cognee #1023 isolation | closed |
| T-04-02 | Information Disclosure | patchpilot_memory.snapshot.tar | low | accept | `*.snapshot.tar` is gitignored; never committed — no code change needed | closed |
| T-04-03 | Denial of Service | POST /reset spam | low | mitigate | ResetButton.tsx disables both dialog buttons + shows "Resetting…" state while a request is in flight | closed |
| T-04-04 | Tampering / DoS | shutil.rmtree on live memory tree | high | mitigate | backend/reset.py releases every open Cognee engine handle (relational dispose → relational cache_clear → vector cache_clear → graph cache_clear) before filesystem swap — Windows-safe order | closed |
| T-04-05 | Information Disclosure | /reset error path | low | mitigate | backend/reset.py: try/except Exception, logger.exception server-side, fixed `_MSG_ERROR` to client, never raw exception text | closed |
| T-04-SC | Tampering | npm install react-force-graph (transitive three [SUS]) | high | mitigate | Blocking-human legitimacy checkpoint verified npmjs.com repos (vasturiano/react-force-graph, mrdoob/three.js ~11.5M wk downloads) before install; documented in 04-03-SUMMARY.md Task 1 | closed |
| T-04-06 | Information Disclosure | GET /graph payload | medium | mitigate | backend/graph.py trims DocumentChunk text/body fields — only id/label/group/relationship survive the reshape | closed |
| T-04-07 | Access Control (V4/V5) | /graph endpoint | low | accept | Unauthenticated + no user input, consistent with every existing endpoint (localhost-only, CORS-locked) | closed |
| T-04-08 | DoS / client crash | ForceGraph3D SSR boundary + CSS comment | medium | mitigate | frontend/components/MemoryGraphView.tsx: dynamic(ssr:false) inside "use client" file; no stray `*/` inside CSS comments (verified globals.css) | closed |
| T-04-09 | Denial of Service / data corruption | harness mutates live memory (forget) | low | mitigate | scripts/time_demo_loop.py POSTs /reset at start AND end to guarantee a clean workarounds_v1_8-present state before and after | closed |
| T-04-10 | Tampering | harness is a verification script only | low | accept | No new endpoint or input surface; only exercises endpoints already threat-modeled in Plans 02/03 and Phases 2-3 | closed |
| T-04-11 | Information Disclosure | verbose objects_result | low | mitigate | backend/search.py `_confidence_from_results` extracts only a scalar confidence; final response never includes raw `objects_result`/`ScoredResult` payloads | closed |
| T-04-12 | Error Handling | confidence parse failure | low | mitigate | `_confidence_from_results` wraps extraction in try/except, returns None on any parse issue, never fails /search | closed |
| T-04-13 | Information Disclosure | HealthDashboard / IncidentTimeline data | low | accept | Both re-aggregate GET /datasets data already rendered by DatasetList; no new data exposure, no new backend endpoint | closed |
| T-04-14 | DoS / client crash | new component styling (CSS) | medium | mitigate | HealthDashboard.tsx / IncidentTimeline.tsx use Tailwind utility classes only; no stray `*/` inside CSS comments | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-04-01 | T-04-02 | Snapshot tar already gitignored; never committed | plan-time (04-01-PLAN.md) | 2026-07-03 |
| R-04-02 | T-04-07 | /graph unauthenticated, no user input, consistent with existing endpoint pattern (localhost-only, CORS-locked) | plan-time (04-03-PLAN.md) | 2026-07-03 |
| R-04-03 | T-04-10 | Harness is a verification script only, no new endpoint/input surface | plan-time (04-04-PLAN.md) | 2026-07-03 |
| R-04-04 | T-04-13 | Dashboard/timeline re-aggregate already-exposed /datasets data, no new backend endpoint | plan-time (04-06-PLAN.md) | 2026-07-03 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-03 | 15 | 15 | 0 | /gsd-secure-phase (L1 grep-depth, register authored at plan time, short-circuit per asvs_level=1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-03
