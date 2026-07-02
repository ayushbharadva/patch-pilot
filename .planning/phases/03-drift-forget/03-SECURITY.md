---
phase: 03
slug: drift-forget
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-02
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → FastAPI `GET /datasets` | Untrusted poll frequency; each 🔴 row can trigger a live LLM reason call server-side | dataset names, drift state, LLM-generated reason text |
| FastAPI → Cognee/Mistral (`GRAPH_COMPLETION`) | Backend-owned; LLM latency/failure must never surface to the client as raw error text | query prompt, generated reason text |
| browser → FastAPI `POST /forget` | Client supplies `dataset` (a string) that reaches the destructive `cognee.forget()` lifecycle verb | dataset name string |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Tampering / Elevation of Privilege | `backend/forget.py` — forged/current-best dataset name reaching `cognee.forget(dataset=...)` | high | mitigate | `_is_forgettable_workaround`: `workarounds_v{N}` regex allowlist + live-existence check via `list_datasets()` + explicit durable-dataset denylist (`incidents`) + (added in code review, CR-02) requires `compute_drift_states(...).get(name) == "drifting"`. `cognee.forget()` is never reached for `incidents`, a forged name, or the current non-drifting best version. Verified: `backend/forget.py:41-61`, unit-tested in `backend/tests/test_drift_forget.py`. | closed |
| T-03-02a | Information Disclosure | `backend/drift.py` reason call; `backend/datasets_router.py` | medium | mitigate | Broad `except Exception` + server-side `logger.exception` + fixed `_FALLBACK_REASON`, never raw exception/timeout text. Per-dataset `try/except` in `datasets_router.py` (doc-count and reason resolution each independently isolated) keeps one bad row from breaking the whole list. Verified: `backend/drift.py:132-135`, `backend/datasets_router.py:60-71`. | closed |
| T-03-02b | Information Disclosure | `backend/forget.py` error path (forged-name `AttributeError` risk) | medium | mitigate | Regex pre-validation prevents any malformed/forged name from ever reaching `cognee.forget()`; outer `except Exception` + `logger.exception` + fixed `_MSG_ERROR` string is defense-in-depth so no raw exception text reaches the client. Verified: `backend/forget.py:88-90`. | closed |
| T-03-03 | Denial of Service | `GET /datasets` live reason generation (repeated polling cost) | medium | mitigate | `asyncio.wait_for(..., timeout=10)` bounds every reason call; module-level `_reason_cache` keyed `(drifting_name, current_highest_name)` skips the LLM entirely for an unchanged drift fact across repeated polls; purged on successful forget (code review WR-01) so a re-ingested dataset never serves a stale cached reason. Verified: `backend/drift.py:43,56,116-146`. | closed |
| T-03-SC | Tampering (Supply Chain) | npm/pip/cargo installs | low | accept | No new packages introduced this phase (confirmed via code review — no `requirements.txt`/`package.json` dependency changes in the phase diff; `Trash2` icon used by the ForgetButton is an already-installed `lucide-react` export). | closed (accepted) |

*Status: open · closed · open — below `high` threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` (`high`) count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-SC | No new third-party packages were added in this phase's implementation; nothing to vet. | Automated (plan-time disposition, orchestrator-confirmed via code diff) | 2026-07-02 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-02 | 5 | 5 | 0 | Claude (orchestrator, grep-verified per ASVS L1 short-circuit — register was authored at plan time in both 03-01-PLAN.md and 03-02-PLAN.md `<threat_model>` blocks; T-03-01's mitigation was independently strengthened during the phase's code-review pass, CR-02) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-02
