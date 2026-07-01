# Phase 1: Foundation - Research

**Researched:** 2026-07-01
**Domain:** Cognee 1.2.2 self-hosted memory backend (FastAPI + Python) — install/run without hangs, disk persistence across restart, per-dataset surgical `forget()` with a verifiable before/after CLI flip
**Confidence:** MEDIUM (stack versions VERIFIED against PyPI; Cognee API signatures CITED from docs.cognee.ai; the #1023 cross-dataset mechanism and exact 1.2.2 `forget()` behavior require an empirical Wave-0 spike — flagged in Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase scope:** CLI + FastAPI backend only — **NO browser UI, NO cloud deploy**. Next.js is Phase 2; Render deployment is Phase 4. Do not plan frontend or deployment work.

**Seed corpus — before/after story (DEMO-02):**
- **D-01:** The demo arc is the **Stripe duplicate-charge** incident:
  - `SEARCH "customers double-charged"` → old fix: **nightly manual dedup script** (v1.8 workaround)
  - `UPLOAD release-v1.9.md` → 🔴 "v1.9 adds idempotency keys; dedup script redundant"
  - `FORGET workarounds_v1_8`
  - `RE-SEARCH "customers double-charged"` → new fix: **upgrade v1.9, idempotency-key on webhook**
- **D-02:** Dataset mapping:
  - `incidents` — durable double-charge bug record (survives forget)
  - `workarounds_v1_8` — old nightly-dedup-script workaround (**the dataset that gets forgotten**)
  - `workarounds_v1_9` — new idempotency-key fix, ingested via the v1.9 release upload (**survives forget → supplies the flipped answer**)
- **D-03:** Corpus size is **medium, ~8 markdown documents** — enough graph texture, still well under the $10 cognify cap.
- **D-04:** Corpus is a **mixed bag** — the Stripe arc (incident report + escalation + v1.8 workaround thread + v1.9 release note) **plus 1-2 unrelated incidents** (e.g. a login bug, a latency spike). **Only the Stripe arc flips**; unrelated incidents are decoration.
- **D-05:** Seed/sample files are authored as **Markdown (`.md`)** — one file per ticket / chat / release.

**Builder concerns to resolve (researcher/planner, NOT user decisions):**
- **B-01 (#1023 cross-dataset leak):** Give the old workaround **isolated entity names** — the dedup-script node (script name + its component) must appear **only** in `workarounds_v1_8`, so `forget()` cleanly removes the old answer from recall.
- **B-02 (mixed-corpus recall focus):** The double-charge arc needs **distinct query terms** so recall stays focused on the Stripe arc before AND after forget — not polluted by login/latency decoys.

### Claude's Discretion
- CLI flip output format (side-by-side answers, diff, coloring) — goal is an **unambiguous, obvious** before/after read in the terminal.
- Persistence-proof mechanics (canary content, manual vs scripted restart, `.patchpilot_memory/` gitignore vs committed seed).
- `/health/cognee` fixture scope (throwaway vs part of seed, cleanup) — within the <30s add+cognify+search constraint.
- Exact search query string, unrelated-incident topics, per-doc wording — within the arc above.

### Deferred Ideas (OUT OF SCOPE)
- **Richer / larger corpus** — grow beyond ~8 docs once the flip is proven (Phase 2+).
- **More unrelated incidents for graph texture** — additional decoys belong to Phase 2/4 (graph view), not the Phase 1 isolation test.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAT-01 | `/health/cognee` smoke test confirms add + cognify + search works in <30s on a small fixture (Phase 1 exit gate) | Async FastAPI endpoint pattern + tiny fixture round-trip (§ Architecture Patterns, § Common Pitfalls "cognify hang"); real OpenAI key mandatory to avoid the local-LLM connectivity hang |
| PLAT-02 | Memory persists across server restart / redeploy (persistent storage) | `SYSTEM_ROOT_DIRECTORY` + `DATA_ROOT_DIRECTORY` pinned to absolute paths under `.patchpilot_memory/`; both default *inside the venv* if unset (§ Standard Stack config, § Common Pitfalls "persistence") |
| INGEST-02 | Content ingested via `add()` + `cognify()` into the knowledge graph | Verified signatures for `add(data, dataset_name=...)` and `cognify(datasets=...)` (§ Code Examples) |
| INGEST-03 | Durable incidents vs per-release workarounds in separate datasets (`incidents` / `workarounds_v{N}`) so `forget()` is surgical | Per-dataset `add`+`cognify`+`forget`; `ENABLE_BACKEND_ACCESS_CONTROL` isolation (§ Architecture Patterns, § Common Pitfalls "#1023") |
| DEMO-02 | Bundled seed datasets tell a clear before/after story — isolated entity names so forget visibly flips recall (mitigates #1023) | Isolated-entity authoring rule + per-dataset cognify + distinct query terms (§ Architecture Patterns "Seed authoring", § Common Pitfalls) |
</phase_requirements>

## Summary

Phase 1 stands up a Cognee 1.2.2 memory backend behind FastAPI and proves — in a CLI, before any UI — that the search → forget → re-search flip works and survives a restart. The two headline risks (Cognee hanging on first `cognify()`, and memory evaporating because it wrote to an ephemeral/venv-internal path) are both **configuration risks, not code risks**: they are retired by (1) using a real OpenAI key rather than a local LLM endpoint, running `uvicorn --workers 1`, and smoke-testing on a tiny fixture; and (2) pinning `SYSTEM_ROOT_DIRECTORY` and `DATA_ROOT_DIRECTORY` to absolute paths under `.patchpilot_memory/` in `.env` before Cognee is first imported.

The stack in `.claude/CLAUDE.md` is **verified against PyPI as of today**: `cognee==1.2.2` (2026-06-26), `fastapi==0.138.2` (2026-06-29), `uvicorn` 0.49.0, `python-dotenv` 1.2.2, `python-multipart` 0.0.32. Two corrections to the documented config surfaced: the current Cognee `.env` default for `LLM_MODEL` is `openai/gpt-5-mini`, so PatchPilot **must explicitly set** `LLM_MODEL="openai/gpt-4o-mini"` to honor the budget cap; and both root directories default *inside the installed package's `.venv`* when unset — the single most common cause of "memory didn't persist."

The trickiest area is the #1023 cross-dataset leak. The actual GitHub issue (closed 2025-07-01, fixed in Cognee **0.2.0**) was narrower than the project's framing: results leaked because the repro called `cognify()` with **no dataset scoping**, merging both datasets into one graph. The durable fix, `ENABLE_BACKEND_ACCESS_CONTROL`, is on by default from Cognee 0.5.0 onward and provisions physically separate Kuzu/LanceDB stores per dataset — so 1.2.2 should isolate `forget()` correctly. **But** entity deduplication still merges identically-named entities within a shared graph, so the CONTEXT.md mitigation (isolated entity names for the v1.8 dedup script + per-dataset `cognify()` calls) remains the correct belt-and-suspenders approach and should be treated as mandatory. Because the exact 1.2.2 default and multi-dataset behavior could not be confirmed from docs alone, **the plan must include a Wave-0 spike that empirically verifies the forget flip in isolation before the full seed corpus is authored.**

**Primary recommendation:** Build in this order — (0) Wave-0 spike: 3-doc minimal `add`/`cognify`/`search`/`forget` script proving the flip AND persistence on the real machine; (1) `.env` + persistence config; (2) `/health/cognee`; (3) the 8-doc seed corpus with isolated entity names; (4) the before/after CLI. Keep the seed corpus small and reuse a tarball snapshot of `.patchpilot_memory/` for zero-cost re-runs.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ingest incident/workaround/release docs | Backend (Cognee `add`+`cognify`) | Filesystem (`.md` seed files) | Cognee owns graph extraction; `.md` files are the human-authored source of truth |
| Recall / diagnosis query | Backend (Cognee `search`) | — | Graph traversal + LLM reasoning is a Cognee responsibility, never client-side |
| Surgical forget | Backend (Cognee `forget(dataset=)`) | — | Dataset-scoped deletion is a Cognee lifecycle verb |
| Persistence of memory state | Database/Storage (Kuzu + LanceDB + SQLite on disk) | Config (`.env` root dirs) | File-based stores under `SYSTEM_ROOT_DIRECTORY`; correctness depends entirely on env config |
| Health smoke test | API/Backend (FastAPI `/health/cognee`) | — | Thin endpoint exercising the full add→cognify→search round-trip |
| Before/after demo orchestration | CLI (Python asyncio script) | Backend (Cognee API) | Standalone script; no HTTP server needed for the isolation proof |
| Dataset naming convention | Backend + Filesystem (constants + seed layout) | — | `incidents` / `workarounds_v{N}` locked in code and file structure |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cognee | 1.2.2 | Memory layer — graph + vector + relational, full lifecycle | Latest stable, released 2026-06-26 `[VERIFIED: PyPI]`; only lib shipping graph extraction + surgical `forget()` in one package; targets self-hosted OSS prize track |
| FastAPI | 0.138.2 | Backend API / `/health/cognee` | Latest stable, released 2026-06-29 `[VERIFIED: PyPI]`; async-native so Cognee's `await` calls fit cleanly |
| Python | 3.12 (target) — 3.10–3.14 supported | Runtime | Cognee requires 3.10–3.14 `[CITED: CLAUDE.md]`. **Machine note:** system `python3` is 3.9.6 (too old); no 3.12 installed; `python3.14` (3.14.6) IS available via Homebrew and is in the supported range `[VERIFIED: local probe]` |
| OpenAI gpt-4o-mini | — | LLM for `cognify()` graph extraction | Required by spec; cheapest capable model; keeps within $10 cap `[CITED: CLAUDE.md]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| python-dotenv | 1.2.2 | Load `.env` before Cognee import | Always — Cognee reads env at import time `[VERIFIED: PyPI]` |
| uvicorn[standard] | 0.49.0 | ASGI server | `uvicorn main:app --reload` in dev; **`--workers 1` always** (Kuzu file-locking) `[VERIFIED: PyPI]` |
| python-multipart | 0.0.32 | FastAPI `UploadFile` support | Only if a Phase-1 endpoint accepts uploads; the release "upload" in Phase 1 is CLI-driven, so this may defer to Phase 2 `[VERIFIED: PyPI]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Kuzu (default graph) | Neo4j / FalkorDB | Only needed for concurrent multi-agent writes; adds Docker infra for zero Phase-1 benefit |
| LanceDB (default vector) | Qdrant / pgvector | Cloud/>1M vectors only; file-based default is correct here |
| SQLite (default relational) | Postgres | Multi-user only; not needed for single-user demo |
| pip | uv | uv is faster but **not installed on this machine**; plan must `pip install` inside a venv or install uv first |

**Installation (target Python 3.12; fallback 3.14 available locally):**
```bash
# Create an isolated venv on a supported Python (3.12 preferred; 3.14 present locally)
python3.12 -m venv .venv    # or: /opt/homebrew/bin/python3.14 -m venv .venv
source .venv/bin/activate
pip install "cognee==1.2.2" "fastapi==0.138.2" "uvicorn[standard]" python-dotenv python-multipart
```

**Version verification (run today):** all five packages confirmed on PyPI with the versions above; first-release dates (cognee 2024-03, fastapi 2018-12, uvicorn 2017-06, python-dotenv 2014-09, python-multipart 2013-03) confirm none are slopsquat candidates despite the legitimacy seam's `too-new` flag on the latest point releases.

## Package Legitimacy Audit

Verdicts via `gsd-tools query package-legitimacy check --ecosystem pypi`. All packages flagged `SUS` **solely** because the *latest point release* is recent and PyPI does not expose weekly-download counts to the seam — every package is a long-established, widely-used project (first releases 2013–2024) with a real source repo. None are hallucinated or slopsquat. Dispositions reflect that.

| Package | Registry | Age (project) | Latest release | Source Repo | Verdict | Disposition |
|---------|----------|---------------|----------------|-------------|---------|-------------|
| cognee | PyPI | since 2024-03 (144 versions) | 1.2.2 (2026-06-26) | github.com/topoteretes/cognee | SUS (too-new/unknown-downloads) | Approved — mandated by spec; established project |
| fastapi | PyPI | since 2018-12 (298 versions) | 0.138.2 (2026-06-29) | github.com/fastapi/fastapi | SUS (too-new/unknown-downloads) | Approved — industry standard |
| uvicorn | PyPI | since 2017-06 (193 versions) | 0.49.0 (2026-06-03) | github.com/Kludex/uvicorn | SUS (unknown-downloads) | Approved — industry standard |
| python-dotenv | PyPI | since 2014-09 (50 versions) | 1.2.2 (2026-03-01) | github.com/theskumar/python-dotenv | SUS (unknown-downloads) | Approved — industry standard |
| python-multipart | PyPI | since 2013-03 (32 versions) | 0.0.32 (2026-06-04) | github.com/Kludex/python-multipart | SUS (unknown-downloads) | Approved — industry standard |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** all five, but the `SUS` verdict is a false positive driven only by recent-point-release + missing download telemetry; all are long-lived projects with legitimate repos. No `checkpoint:human-verify` needed. No suspicious `postinstall` scripts (PyPI packages; none reported).

## Architecture Patterns

### System Architecture Diagram

```
                    Phase 1 scope (CLI + backend only — NO UI, NO deploy)

  seed/*.md files                    .env (loaded at import)
  (8 markdown docs)          ┌──────────────────────────────────┐
        │                    │ LLM_API_KEY, LLM_PROVIDER=openai  │
        │                    │ LLM_MODEL=openai/gpt-4o-mini      │
        │                    │ SYSTEM_ROOT_DIRECTORY=<abs>/.patchpilot_memory
        │                    │ DATA_ROOT_DIRECTORY=<abs>/.patchpilot_memory/data
        ▼                    └──────────────┬───────────────────┘
  ┌──────────────┐                          │
  │  seed CLI    │  add(dataset=incidents)  ▼        ┌──────────── OpenAI gpt-4o-mini
  │ (asyncio)    │──add(dataset=workarounds_v1_8)──> COGNEE ──cognify()──> (graph extraction, $)
  │              │  add(dataset=workarounds_v1_9)    core
  │  BEFORE:     │                          │         │
  │  search(     │<─────GRAPH_COMPLETION─────┤         ▼  writes to disk (persistent)
  │   GRAPH_     │                          │   ┌─────────────────────────────┐
  │   COMPLETION)│  forget(dataset=          │   │ .patchpilot_memory/         │
  │  → old fix   │        workarounds_v1_8)──┼──>│  databases/kuzu/   (graph)  │
  │              │                          │   │  databases/lancedb/(vector) │
  │  AFTER:      │<─────GRAPH_COMPLETION─────┤   │  databases/sqlite.db(rel.)  │
  │  search()    │                          │   └─────────────────────────────┘
  │  → new fix   │                          │            ▲
  │  print DIFF  │                          │            │ survives process restart
  └──────────────┘                          │            │ (PLAT-02 proof: canary)
                                            │
  ┌──────────────┐   GET /health/cognee     │
  │ FastAPI app  │──add+cognify+search──────┘   returns 200 in <30s on tiny fixture
  │ uvicorn -w 1 │   (throwaway fixture)        (PLAT-01 exit gate)
  └──────────────┘
```

### Recommended Project Structure
```
patch-pilot/
├── .env                      # secrets + root-dir pins (gitignored)
├── .env.example              # committed template (no key)
├── .patchpilot_memory/       # Cognee persistent state (gitignore the DBs; see below)
│   ├── databases/kuzu/
│   ├── databases/lancedb/
│   ├── databases/sqlite.db
│   └── data/                 # DATA_ROOT_DIRECTORY (raw ingested files)
├── backend/
│   ├── main.py               # FastAPI app + /health/cognee; loads dotenv FIRST
│   ├── cognee_config.py      # one place that sets root dirs + LLM_MODEL before cognee import
│   └── datasets.py           # dataset-name constants: INCIDENTS, workarounds_v(n)
├── seed/
│   ├── incidents/            # durable docs (double-charge bug + 1-2 decoys)
│   ├── workarounds_v1_8/     # nightly-dedup-script workaround (the forgotten one)
│   ├── workarounds_v1_9/     # release-v1.9.md idempotency-key fix
│   └── seed_cli.py           # asyncio: seed → search(before) → forget → search(after) → diff
└── requirements.txt
```

### Pattern 1: Config-before-import (the persistence keystone)
**What:** Cognee reads env vars at **import time** to resolve its root directories. Setting them after `import cognee` is too late.
**When to use:** Always, in every entrypoint (FastAPI `main.py` AND `seed_cli.py`).
**Example:**
```python
# cognee_config.py — import this BEFORE anything imports cognee
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()  # pulls LLM_API_KEY etc. from .env

ROOT = Path(__file__).resolve().parent.parent / ".patchpilot_memory"
os.environ.setdefault("SYSTEM_ROOT_DIRECTORY", str(ROOT))
os.environ.setdefault("DATA_ROOT_DIRECTORY", str(ROOT / "data"))
os.environ.setdefault("LLM_MODEL", "openai/gpt-4o-mini")  # override the gpt-5-mini default
os.environ.setdefault("LLM_PROVIDER", "openai")
# import cognee only AFTER these are set
```
`// Source: docs.cognee.ai/setup-configuration/overview + .env.template (LLM_MODEL default = openai/gpt-5-mini)`

### Pattern 2: Per-dataset add + cognify (dataset isolation for clean forget)
**What:** `add()` each dataset separately with its `dataset_name`, then `cognify(datasets=[name])` scoped to that one dataset — do **not** call a bare `cognify()` that processes everything into one merged graph (that is exactly what caused #1023's repro to leak).
**When to use:** All seeding; required for DEMO-02 / INGEST-03.
**Example:**
```python
import cognee
from cognee.modules.search.types import SearchType  # or: from cognee.api.v1.search import SearchType

await cognee.add(incident_docs,  dataset_name="incidents")
await cognee.add(v18_docs,       dataset_name="workarounds_v1_8")
await cognee.add(v19_docs,       dataset_name="workarounds_v1_9")

# cognify each dataset in its own scoped call (avoids global merge)
await cognee.cognify(datasets=["incidents"])
await cognee.cognify(datasets=["workarounds_v1_8"])
await cognee.cognify(datasets=["workarounds_v1_9"])
```
`// Source: docs.cognee.ai/python-api/add, /cognify; GH #1023`

### Pattern 3: Before/after flip via GRAPH_COMPLETION
**What:** Same query, run before and after a scoped `forget()`, prints two answers.
**Example:**
```python
Q = "What is the fix for customers being double-charged?"

before = await cognee.search(query_text=Q, query_type=SearchType.GRAPH_COMPLETION)
await cognee.forget(dataset="workarounds_v1_8")   # surgical, per-dataset
after  = await cognee.search(query_text=Q, query_type=SearchType.GRAPH_COMPLETION)
# assert the answers differ; print a side-by-side / colored diff
```
`// Source: docs.cognee.ai/python-api/search; forget(dataset=...) per V2 memory API`

### Pattern 4: Seed authoring for a clean flip (isolated entity names — B-01)
**What:** The v1.8 workaround's key entities must be **unique to `workarounds_v1_8`** so that forgetting the dataset removes them from recall entirely. Cognee dedups entities by name within a graph, so a name shared with `incidents` or `workarounds_v1_9` would survive the forget and pollute the "after" answer.
**How, concretely:**
- Give the old workaround a **distinct, named artifact**: e.g. a script called `dedup_sweeper.py` / component `nightly-dedup-cron` — a proper noun that appears in **no other doc**.
- The durable `incidents` doc describes the *bug* ("customers double-charged on Stripe webhook retries") using shared, stable vocabulary — it must survive forget and still be found.
- The `workarounds_v1_9` release note introduces its own distinct artifact (`idempotency key on the webhook handler`) that likewise appears only there.
- Use **distinct query terms** (B-02) so the login/latency decoys never dominate recall: query on "double-charged" / "duplicate charge", terms that appear only in the Stripe arc.

### Anti-Patterns to Avoid
- **Bare `cognify()` with no `datasets=`** — merges all datasets into one graph; the root cause of #1023's repro. Always scope.
- **`prune.prune_system()` for per-dataset forget** — global wipe, no targeting. Use `forget(dataset=...)`. `[CITED: CLAUDE.md What NOT to Use]`
- **Setting root dirs after `import cognee`** — too late; state lands in the venv.
- **Local/Ollama LLM endpoint for cognify** — triggers the documented indefinite hang (GH #2119). Use the real OpenAI key.
- **`uvicorn --workers N` (N>1)** — Kuzu file-locking corruption. `--workers 1`. `[CITED: CLAUDE.md]`
- **Sharing the v1.8 dedup-script entity name with any other doc** — forget won't flip the answer.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-release surgical delete | Custom node/edge deletion queries | `cognee.forget(dataset="workarounds_v{N}")` | Cognee handles graph+vector+relational deletion atomically |
| Dataset isolation | Manual namespacing / prefixing entity IDs | `dataset_name=` + `ENABLE_BACKEND_ACCESS_CONTROL` (separate Kuzu/LanceDB per dataset) | Built-in physical isolation since 0.5.0 |
| Full reset for re-seeding | Deleting DB files by hand | `prune.prune_data()` + `prune.prune_system()` | Handles all three stores + caches consistently |
| Evidence + reasoning retrieval | Custom RAG pipeline | `search(GRAPH_COMPLETION)` + `search(CHUNKS)` | Cognee IS the retrieval layer; fusing two SearchTypes is the intended pattern |
| Zero-cost demo re-runs | Re-cognifying (costs $) each run | Tar-snapshot `.patchpilot_memory/` after first seed; restore to reset | Only `cognify()` costs money; restoring the tarball skips it |

**Key insight:** Cognee already *is* the memory-orchestration layer. Every "I'll just delete the rows myself" instinct here creates drift between the three backing stores. Use the lifecycle verbs.

## Runtime State Inventory

> Phase 1 is greenfield (no existing code), but it *creates* runtime state that later phases and the demo depend on. Documented here so the plan treats persistence as a first-class deliverable, not a side effect.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `.patchpilot_memory/databases/{kuzu,lancedb,sqlite.db}` created on first `cognify()`; dataset names `incidents`, `workarounds_v1_8`, `workarounds_v1_9` become durable keys | Pin root dirs in `.env`; verify canary survives restart (PLAT-02) |
| Live service config | None — no external services registered in Phase 1 (no Render, no cloud Cognee) | None — verified by scope (CLI + local backend only) |
| OS-registered state | None — no scheduled tasks, daemons, or launchd entries | None — verified by scope |
| Secrets/env vars | `LLM_API_KEY` (OpenAI) — **not currently set on this machine**; `LLM_MODEL` must be explicitly `openai/gpt-4o-mini` (default is now `openai/gpt-5-mini`) | Create `.env` (gitignored) + `.env.example`; set `$10` OpenAI dashboard cap |
| Build artifacts | `.venv/` (Cognee will misfile state here if root dirs unset); tar snapshot of `.patchpilot_memory/` for zero-cost re-seed | Gitignore `.venv/`; decide gitignore-vs-commit policy for `.patchpilot_memory/` (discretion) |

**Gitignore guidance:** Gitignore the live `.patchpilot_memory/databases/` (binary, machine-specific, rebuildable). Commit the `seed/*.md` source docs (the real source of truth). Optionally commit a tarball snapshot for fast reset — planner's call per CONTEXT discretion.

## Common Pitfalls

### Pitfall 1: `cognify()` hangs indefinitely on first run
**What goes wrong:** `add()`/`cognify()` never returns — no error, no log — often on macOS.
**Why it happens:** Two documented causes: (a) a **local/OpenAI-compatible LLM endpoint** — Cognee's `test_llm_connection()` validation stalls (GH #2119); (b) a macOS Kqueue-selector event-loop hang in older versions (GH #1743, seen on 0.3.9). Both are amplified if the first cognify runs on a large corpus.
**How to avoid:** Use the **real OpenAI API key** (spec-mandated anyway); run the Wave-0 smoke test on a **1–3 doc fixture** first; ensure `LLM_API_KEY` is a valid `sk-...` key before importing cognee.
**Warning signs:** Process pinned but no OpenAI dashboard activity within ~20s; last log line mentions selector or LLM connection.
`[VERIFIED: GH #2119, #1743 — cross-checked with docs]` (Note: these reports are against 0.3.9 / local-LLM setups; not reproduced on 1.2.2 + OpenAI — treat the tiny-fixture smoke test as the guard.)

### Pitfall 2: Memory doesn't persist across restart
**What goes wrong:** Canary incident stored pre-restart is gone after restart — PLAT-02 fails.
**Why it happens:** If `SYSTEM_ROOT_DIRECTORY` / `DATA_ROOT_DIRECTORY` are unset, they resolve **relative to the installed cognee package inside `.venv`**, not the project root. State written there is easy to lose and never where you expect.
**How to avoid:** Pin BOTH to **absolute paths** under `.patchpilot_memory/` in `.env`, set before `import cognee` (Pattern 1). Verify by inspecting that `.patchpilot_memory/databases/` fills after seeding.
**Warning signs:** After seeding, `.patchpilot_memory/` is empty but something appeared under `.venv/`.
`[VERIFIED: docs.cognee.ai/setup-configuration + .env.template]`

### Pitfall 3: forget() doesn't flip the answer (the #1023 family)
**What goes wrong:** After `forget(dataset="workarounds_v1_8")`, re-search still returns the old dedup-script fix.
**Why it happens:** Two mechanisms — (a) the graph was built with a **bare `cognify()`** merging datasets (the original #1023 repro), or (b) the v1.8 workaround's key **entity name is shared** with another surviving doc, so entity dedup keeps it alive.
**How to avoid:** Scope every `cognify()` per dataset (Pattern 2); author isolated entity names for the v1.8 artifact (Pattern 4); confirm `ENABLE_BACKEND_ACCESS_CONTROL` is on (default from 0.5.0). **Prove it in the Wave-0 spike before authoring all 8 docs.**
**Warning signs:** "Before" and "after" GRAPH_COMPLETION answers are identical or both mention `dedup_sweeper`.
`[VERIFIED: GH #1023 (fixed 0.2.0), product blog on access control default]`

### Pitfall 4: Runaway cognify cost / wrong model
**What goes wrong:** Cost creeps toward the $10 cap; or graph extraction silently uses `gpt-5-mini`.
**Why it happens:** Current Cognee `.env` default `LLM_MODEL=openai/gpt-5-mini`; re-running `cognify()` on every dev iteration re-bills.
**How to avoid:** Explicitly set `LLM_MODEL="openai/gpt-4o-mini"`; keep the corpus small (~8 docs, D-03); tar-snapshot `.patchpilot_memory/` and restore instead of re-cognifying; set the $10 dashboard cap.
`[VERIFIED: .env.template default; CLAUDE.md budget constraint]`

### Pitfall 5: Kuzu lock error under concurrency
**What goes wrong:** `Could not set lock on file` during search/cognify.
**Why it happens:** Kuzu uses file-based locking; multiple uvicorn workers (or a stray second process) collide. Reported even with a single active `search()` if another process holds the DB (GH #1100).
**How to avoid:** `uvicorn --workers 1`; don't run the FastAPI server and the seed CLI against the same `.patchpilot_memory/` simultaneously.
`[VERIFIED: GH #1100, Kuzu concurrency docs]`

## Code Examples

### `/health/cognee` — full round-trip smoke test (<30s, tiny fixture)
```python
# main.py — dotenv + root dirs set via cognee_config import BEFORE this line
import cognee_config           # noqa: F401  (sets env, must be first)
import cognee
from cognee.modules.search.types import SearchType
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/health/cognee")
async def health_cognee():
    try:
        await cognee.add("PatchPilot health canary: widget X fails on retry.",
                         dataset_name="healthcheck")
        await cognee.cognify(datasets=["healthcheck"])
        res = await cognee.search(query_text="widget X",
                                  query_type=SearchType.GRAPH_COMPLETION)
        await cognee.forget(dataset="healthcheck")   # cleanup throwaway fixture
        return JSONResponse({"status": "ok", "results": len(res)})
    except Exception as e:
        return JSONResponse({"status": "unhealthy", "error": str(e)}, status_code=503)
```
`// Source: docs.cognee.ai/python-api (add/cognify/search) + FastAPI health-check pattern`

### Seed CLI skeleton (before/after flip)
```python
# seed_cli.py
import cognee_config   # noqa: F401  (env first)
import asyncio, cognee
from cognee.modules.search.types import SearchType

Q = "What is the fix for customers being double-charged?"

async def main():
    # ... add() each dataset from seed/*/*.md, then per-dataset cognify() ...
    before = await cognee.search(query_text=Q, query_type=SearchType.GRAPH_COMPLETION)
    await cognee.forget(dataset="workarounds_v1_8")
    after = await cognee.search(query_text=Q, query_type=SearchType.GRAPH_COMPLETION)
    print("BEFORE:", before)
    print("AFTER :", after)
    assert str(before) != str(after), "FLIP FAILED — forget did not change recall"

asyncio.run(main())
```
`// Source: composed from verified add/cognify/search/forget signatures`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| App-level dataset filtering (leaky, #1023) | `ENABLE_BACKEND_ACCESS_CONTROL` → physically separate Kuzu/LanceDB per dataset, **on by default** | Cognee 0.5.0 (fix landed 0.2.0) | `forget(dataset=)` should now be genuinely surgical in 1.2.2 |
| `LLM_MODEL` default `gpt-4o-mini` (as in CLAUDE.md era) | `.env.template` default now `openai/gpt-5-mini` | recent Cognee release | **Must explicitly pin** `gpt-4o-mini` for budget |
| NetworkX default graph | Kuzu default graph | Cognee ~1.x | Kuzu file-locking → `--workers 1` requirement |

**Deprecated/outdated:**
- Framing #1023 as "an unfixed vector-layer leak requiring isolated entity names as the *only* mitigation" — the issue is **closed/fixed**; isolated entity names remain a correct safety measure but access-control isolation is the primary mechanism now.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `forget(dataset="...")` in **1.2.2** cleanly removes one dataset's contribution to GRAPH_COMPLETION recall without touching `incidents` | Patterns 2–3, Pitfall 3 | Core Phase-1 exit criterion #3 fails; mitigate with Wave-0 spike before full seed |
| A2 | `ENABLE_BACKEND_ACCESS_CONTROL` is ON by default in 1.2.2 (confirmed default only up to 0.5.0 in a blog; not re-confirmed for 1.2.2) | State of the Art, Pitfall 3 | If off, cross-dataset isolation weaker → rely harder on isolated entity names; check `.env.template`/docs at build time |
| A3 | Scoping `cognify(datasets=[one])` per dataset prevents cross-dataset entity merge | Pattern 2 | If entities still merge globally, the flip needs stronger isolation (separate cognify runs already assumed) |
| A4 | Exact `forget()` signature is `forget(dataset=..., session_id=...)` (from a secondary source, not the primary API page) | Pattern 3 | Wrong kwarg name → runtime error; verify against installed 1.2.2 `help(cognee.forget)` in Wave 0 |
| A5 | `SearchType` importable from `cognee.modules.search.types` (issue #1023 repro) AND/OR `cognee.api.v1.search` | Code Examples | Import error only; trivially fixed by `help(cognee)` at build time |
| A6 | The documented cognify hang (GH #2119/#1743) does not affect 1.2.2 + real OpenAI key | Pitfall 1 | If it does, `/health/cognee` times out; Wave-0 smoke test surfaces it early |
| A7 | Python 3.14 (only supported version installed) works with cognee 1.2.2 as well as 3.12 | Standard Stack | Possible dependency-build friction on 3.14; safest is to install 3.12 explicitly |

**These assumptions are why the plan MUST open with a Wave-0 spike** that installs cognee 1.2.2 on the chosen Python, runs `help()` on `add/cognify/search/forget`, and proves both the flip and persistence on a 3-doc minimal corpus **before** the full seed is authored.

## Open Questions

1. **Exact `forget()` signature and semantics in 1.2.2**
   - What we know: it exists, takes `dataset=`, is the V2 verb; CLI has `--dataset`, `--data-id`, `--everything`.
   - What's unclear: precise Python kwargs; whether it deletes vector+graph+relational for that dataset atomically in 1.2.2.
   - Recommendation: Wave-0 spike — `import cognee; help(cognee.forget)` on the installed package; assert the flip.

2. **Does a bare/global `cognify()` still merge datasets in 1.2.2 with access control on?**
   - What we know: it did in the #1023-era repro; access control now isolates storage.
   - Recommendation: always scope `cognify(datasets=[...])` regardless; verify isolation empirically.

3. **Python version for the venv**
   - What we know: 3.9 (system) too old; 3.14 available; 3.12 preferred but not installed.
   - Recommendation: install 3.12 (pyenv/brew) for the documented sweet spot, OR proceed on 3.14 and treat any install friction as a Wave-0 finding.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.10–3.14 | Cognee + FastAPI runtime | ✓ (3.14) / ✗ (3.12) | 3.14.6 via Homebrew; system 3.9.6 too old | Use 3.14, or `brew install python@3.12` |
| pip | Package install | ✓ | 21.2.4 (bound to system 3.9 — use venv's pip) | Use venv-local pip after `python3.x -m venv` |
| uv | Faster installs (optional) | ✗ | — | Use `pip` inside venv |
| git | Version control | ✓ | 2.50.1 | — |
| Node.js | Not needed in Phase 1 (Phase 2 frontend) | ✓ | 24.17.0 | — |
| OpenAI API key | `cognify()` graph extraction | ✗ (not set) | — | **Blocking** — user must set `LLM_API_KEY` in `.env` + $10 cap |
| Docker | Not needed (default file-based stores) | not checked | — | Not required for Phase 1 |

**Missing dependencies with no fallback (blocking):**
- **`OPENAI_API_KEY` / `LLM_API_KEY`** — Cognee cannot `cognify()` without it. The plan must include a `checkpoint:human-verify` step for the user to add the key and set the $10 dashboard cap before any cognify runs.

**Missing dependencies with fallback:**
- **Python 3.12** — not installed, but 3.14 (supported) is; or install 3.12.
- **uv** — not installed; use `pip` in a venv.

## Security Domain

> `security_enforcement: true`, ASVS Level 1. Phase 1 is a local CLI + local FastAPI backend with no auth, no public exposure, no browser UI. Attack surface is minimal but two items apply.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No users/auth in Phase 1 |
| V3 Session Management | no | No sessions |
| V4 Access Control | no (app-level) | Cognee's `ENABLE_BACKEND_ACCESS_CONTROL` is data-isolation, not user auth |
| V5 Input Validation | partial | Seed docs are trusted local `.md`; `/health/cognee` takes no user input in Phase 1 |
| V6 Cryptography | no | No crypto implemented; never hand-roll |
| V7/V8 Secrets & Data Protection | **yes** | `LLM_API_KEY` in `.env`, gitignored; never commit; `.env.example` has no key |
| V14 Config | **yes** | `--workers 1`; CORS deferred to Phase 2 (no browser origin yet); don't expose the FastAPI port publicly |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key leaked via commit | Information Disclosure | `.env` in `.gitignore`; commit only `.env.example`; verify no key in git history |
| Runaway LLM spend (cost DoS on self) | Denial of Service | $10 OpenAI dashboard cap; pin `gpt-4o-mini`; small corpus; tarball reseed |
| Local FastAPI port exposed on network | Elevation/Info Disclosure | Bind to `127.0.0.1` in dev; no `0.0.0.0` until deploy phase |
| Prompt/data injection via ingested docs | Tampering | Seed docs are author-controlled in Phase 1; revisit for Phase 2 uploads |

## Sources

### Primary (HIGH/MEDIUM confidence)
- docs.cognee.ai/python-api/add, /cognify, /search, /prune — exact function signatures `[CITED]`
- github.com/topoteretes/cognee/issues/1023 — cross-dataset leak: closed 2025-07-01, fixed 0.2.0, root cause = unscoped cognify; maintainer confirms access-control fix `[VERIFIED: GitHub API]`
- github.com/topoteretes/cognee/blob/main/.env.template — `LLM_MODEL` default `openai/gpt-5-mini`, root-dir defaults `[CITED]`
- PyPI JSON API — cognee 1.2.2 / fastapi 0.138.2 / uvicorn 0.49.0 / python-dotenv 1.2.2 / python-multipart 0.0.32, release dates + first-release history `[VERIFIED]`
- Local machine probe — Python 3.14.6 available, 3.9.6 system, no 3.12, no uv, no OPENAI key `[VERIFIED]`

### Secondary (MEDIUM confidence)
- docs.cognee.ai/setup-configuration/overview — SYSTEM_ROOT_DIRECTORY / DATA_ROOT_DIRECTORY / ENABLE_BACKEND_ACCESS_CONTROL
- cognee.ai product blog (multi-tenant/access-control) — default-on from 0.5.0
- GH #2119, #1743 — cognify hang (local-LLM / macOS Kqueue); GH #1100 — Kuzu locking
- DeepWiki topoteretes/cognee — V1 vs V2 API, SearchType enum

### Tertiary (LOW confidence)
- Community posts on seed-CLI patterns (no official reference example found)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against PyPI today
- Config/persistence: MEDIUM-HIGH — env vars cited from docs + .env.template; behavior needs one empirical check
- API signatures: MEDIUM — cited from docs.cognee.ai; `forget()` exact kwargs need Wave-0 confirmation
- #1023 / forget flip: MEDIUM — issue history verified; 1.2.2 runtime behavior must be spiked
- Pitfalls: MEDIUM — grounded in real GitHub issues, some against older versions

**Research date:** 2026-07-01
**Valid until:** ~2026-07-15 (fast-moving library; re-verify Cognee behavior at build time via `help()` on the installed 1.2.2)
