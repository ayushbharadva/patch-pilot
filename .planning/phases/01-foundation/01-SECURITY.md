---
phase: 01
slug: foundation
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-07-02
---

# Phase 01 — Foundation — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Threat register spans all four plans in this phase (01-01 spike, 01-02 backend keystone, 01-03 seed corpus, 01-04 seed CLI). Register was authored at plan time (`register_authored_at_plan_time: true`) — this audit verifies mitigations exist in the implemented code; it does not scan blindly for new vulnerabilities.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| local files → git (VCS) | Secrets at rest (`.env`) must never cross into version control | `LLM_API_KEY` and provider config |
| local process → LLM provider API (OpenAI / Gemini / Mistral) | `LLM_API_KEY` crosses to a third party; spend/rate exposure varies by which provider is actually active | API key + document text sent for embedding/completion |
| PyPI → local venv | Installed packages execute code at install/import time; supply-chain tampering risk | Package wheels (`cognee`, `fastapi`, `mistralai`, `mistral-common`, etc.) |
| network → FastAPI (`backend/main.py`) | Dev server listens on a socket; binding beyond localhost would expose it | HTTP requests to `/health/cognee` |
| process → disk (`.patchpilot_memory/`) | Ingested content (incl. seed corpus) is persisted to disk and could be committed by accident | Cognee graph/vector/relational store files |
| config → LLM provider (`backend/cognee_config.py`) | Governs which provider/model runs and therefore what bills/rate-limits apply | `LLM_PROVIDER`, `LLM_MODEL`, `EMBEDDING_*` env vars |
| authored `.md` → Cognee ingest | Seed docs become graph content; fully author-controlled/trusted in Phase 1 | `seed/**/*.md` text |
| CLI process → LLM provider (`seed/seed_cli.py`) | Seeding runs `cognify()`, which bills/rate-limits against the active provider | Seed doc text → graph extraction calls |
| snapshot tar → git/disk (`scripts/snapshot_memory.py`) | The snapshot contains cognified memory and may hold ingested content | `.patchpilot_memory/` tarball |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Information Disclosure | `.env` / `LLM_API_KEY` (OpenAI/Gemini/Mistral key) | high | mitigate | `.gitignore:2` lists `.env`; only `.env.example` (empty `LLM_API_KEY=`) is tracked; `backend/cognee_config.py:23-28` loads the key via `load_dotenv()`, no hardcoded literal anywhere in tracked files | closed |
| T-01-02 | Information Disclosure | `.patchpilot_memory/` + `*.snapshot.tar` on disk | medium/low | mitigate | `.gitignore:5` (`.patchpilot_memory/`) and `.gitignore:15` (`*.snapshot.tar`); `git ls-files` confirms neither is tracked; only `seed/*.md` source docs are committed | closed |
| T-01-03 | Denial of Service (self, cost) | cognify/embedding spend (active provider: Mistral, not OpenAI) | medium | mitigate | Corpus stays small (8 docs, 172-220 words each) and the tar snapshot avoids re-billing `cognify()` on reruns. Mistral's free "Experiment" tier (500K tokens/min, 1B tokens/month) has no payment method attached to this project's account (human-confirmed 2026-07-02) — with no card on file, exceeding the rate limit can only produce HTTP 429 retryable errors, never a charge; billing requires an explicit separate upgrade to Mistral's paid Scale plan. This is a genuine $0 structural ceiling, not a dashboard-configured cap like the original OpenAI mitigation | closed |
| T-01-04 | Information Disclosure / Elevation | uvicorn bind address | low | mitigate | `backend/main.py:3-5` docstring and run command pin `--host 127.0.0.1 --workers 1`; grep confirms no `0.0.0.0` bind and no `allow_origins=["*"]`/`CORSMiddleware` anywhere in `backend/`, `seed/`, `scripts/`; verified the 7 post-plan review-fix commits did not touch bind/CORS surface | closed |
| T-01-05 | Tampering (prompt/data injection via ingested docs) | seed `.md` content | low | accept | Seed docs are author-controlled and trusted (Phase 1); no user-facing upload endpoint exists — `backend/main.py` exposes only `GET /health/cognee`, no `UploadFile`/`File(...)`/POST routes anywhere in the codebase; entry recorded below in Accepted Risks Log | closed |
| T-01-SC | Tampering (supply chain) | pip installs (7 pkgs: original 5 + `mistralai`, `mistral-common`) | high | mitigate | `requirements.txt` pins all 7 packages with exact `==` versions. `mistralai`/`mistral-common` are cognee's own declared `mistral` extra (confirmed via installed `cognee-1.2.2.dist-info/METADATA`: `mistral-common<2,>=1.5.2`, `mistralai<2,>=1.9.10` — not arbitrary additions). Both packages' installed dist-info metadata independently verified as Mistral AI's official packages: `mistral_common` author email `bam4d@mistral.ai`; `mistralai` `Project-URL: Repository, https://github.com/mistralai/client-python.git` — no typosquat indicators | closed |

*Status: open · closed*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-05 | Phase 1's 8-doc seed corpus is entirely author-controlled and hand-written (no untrusted upload path exists in this phase — `backend/main.py` has no ingest endpoint). Prompt/data-injection risk via ingested `.md` content is deferred to Phase 2, when a real upload path is introduced and untrusted-input validation becomes necessary (per 01-CONTEXT.md, RESEARCH.md Security Domain V5). | 01-03-PLAN.md threat model (plan-time disposition, confirmed still valid at this audit — no upload endpoint was introduced anywhere in Phase 1) | 2026-07-02 |

*Accepted risks do not resurface in future audit runs.*

---

## Non-Blocking Open Items (tracked, does not block ship)

None remaining. T-01-03 (below) was the sole non-blocking open item; it closed on 2026-07-02 after human confirmation of the Mistral account's billing state.

---

## Unregistered Flags

None mapped to new trust-boundary-crossing surface. `01-04-SUMMARY.md`'s `## Threat Flags` section explicitly states "None" and this audit found no new network endpoints, auth paths, or upload surfaces introduced across any of the four plans. `01-01-SUMMARY.md`/`01-02-SUMMARY.md`/`01-03-SUMMARY.md` predate the `## Threat Flags` template convention and have no such section — no unregistered attack surface was found by direct inspection of their artifacts either.

**Noted for future awareness (not a new threat ID, informational only):** `backend/cognee_patches.py` sets `litellm.drop_params = True` globally (module-level side effect on import) to work around a Mistral-embeddings parameter-rejection bug. This silently drops *any* unsupported parameter sent to *any* litellm call in the process, not just the Mistral `dimensions` kwarg it was written for. Scoped acceptably today (single-provider deployment, no runtime provider-swapping), but if Phase 2+ adds multi-provider support or a new litellm call with a genuinely-required parameter, this global flag could silently mask a real misconfiguration. Flagged for Phase 2 planning, not an open threat against this phase's declared register.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-02 | 6 | 5 | 1 (non-blocking) | gsd-security-auditor |
| 2026-07-02 (follow-up) | 6 | 6 | 0 | orchestrator + human — closed T-01-03 after confirming no payment method is attached to the project's Mistral account (WebSearch-corroborated: free "Experiment" tier returns HTTP 429 on limit, never bills, without a card on file) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed — 6/6 threats closed, no open items remain
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-02 (all threats closed on follow-up same day)
