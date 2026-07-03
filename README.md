# PatchPilot

*Every bug remembers its history.*

PatchPilot is a living incident-memory system for small SaaS and engineering teams. It ingests tickets, chats, changelogs, and past fixes into [Cognee](https://github.com/topoteretes/cognee), recalls prior incidents with root-cause recommendations backed by evidence, reinforces fixes engineers confirm, and — when a release ships — detects which old workarounds have gone stale (**Memory Drift**) and forgets them.

**Target users:** small SaaS / engineering teams whose incident knowledge is scattered across GitHub, Slack, tickets, and people's heads.

> Built for **The Hangover Part AI: Where's My Context?** hackathon (WeMakeDevs × Cognee, Jun 29 – Jul 5, 2026). Not a monetized product.

## Core Value

The visible loop that makes PatchPilot obviously impossible without Cognee's full memory lifecycle:

1. **Search** a bug (`"customers double-charged"`) → recall returns the incident **and** the old workaround, with evidence.
2. **Upload** a release note that supersedes the workaround → Memory Drift flags it 🔴 (drifting), with a live, Cognee-generated reason string.
3. **Forget** the drifting workaround → it's surgically removed via `forget(dataset=...)`; the durable incident record is untouched.
4. **Re-search** the same query → recall now returns only the new, correct fix.

The whole loop runs visibly in **under 120 seconds** (measured locally at ~23.6s — see [Demo-loop timing](#features-built-and-working) below), driven end-to-end by Cognee's `add` → `cognify` → `search` → `improve` → `forget` lifecycle — not a search index with a UI bolted on.

## Project Status

**100% complete — all 4 phases shipped (milestone v1.9)**

| Phase | Description | Status |
|---|---|---|
| 1. Foundation | Cognee verified, memory persists across restarts, dataset architecture (`incidents` vs `workarounds_v{N}`) locked, CLI-level before/after forget flip proven | ✅ Done |
| 2. Core Recall | Full-stack ingest, evidence-grounded diagnosis card, feedback reinforcement, release upload | ✅ Done |
| 3. Drift + Forget | Drift detection with health badges, surgical forget, live before/after proof in the browser | ✅ Done |
| 4. Demo Loop + Stretch | Loop timing verified, one-click demo reset, memory graph view, all stretch features (confidence badge, health dashboard, incident timeline) | ✅ Done |

Source: `.planning/STATE.md` progress block (`percent: 100`, `completed_phases: 4`, `completed_plans: 16`).

## Features (Built and Working)

Every feature below is live and maps to a completed requirement in `.planning/REQUIREMENTS.md`:

- **Multi-source ingest** (`INGEST-01`, `INGEST-02`, `INGEST-03`) — upload ticket/chat/changelog files or load bundled sample datasets ("Load Sample"); content is ingested via Cognee `add()` + `cognify()` in a background task. Durable incidents and per-release workarounds live in separate datasets (`incidents` vs `workarounds_v{N}`) so forgetting can be surgical.
- **Evidence-grounded diagnosis card** (`RECALL-01`, `RECALL-02`, `RECALL-03`) — search a bug and get a root-cause recommendation via `search(GRAPH_COMPLETION)`, fused with the exact prior-incident evidence via `search(CHUNKS)`, rendered as one card.
- **Confidence badge** (`STRETCH-01`) — a real `[0, 1]` confidence score derived from the CHUNKS retriever's own similarity score (best result across all queried datasets), shown directly on the diagnosis card. Best-effort: a malformed score degrades to `confidence: null`, never fails `/search`.
- **Release ingestion** (`RELEASE-01`) — upload a release note and it's stored as a versioned `workarounds_v{N}` dataset, visible in the dataset list.
- **Memory Drift detection** (`DRIFT-01`, `DRIFT-02`, `DRIFT-03`) — every memory carries a health badge (🟢 Stable / 🟡 Aging / 🔴 Drifting); a 🔴 badge ships with a live, human-readable, Cognee-generated reason string (e.g. "Release v1.9 patches the component this workaround targets").
- **Surgical Forget with proof** (`FORGET-01`, `FORGET-02`) — a guarded `POST /forget` removes a dataset via `forget(dataset="workarounds_v{N}")`; the durable `incidents` dataset and the current highest-version release can never be forgotten this way. The frontend's two-step inline confirm triggers an automatic re-search, making the before/after flip visible end-to-end.
- **Memory Graph view** (`GRAPH-01` / `STRETCH-04`) — a 3D force-directed graph (`react-force-graph-3d`) rendering the real, aggregated Cognee knowledge graph, with click-to-explore node detail. `GET /graph` strips all chunk text server-side before anything crosses to the browser — only `{id, label, group}` nodes and `{source, target, label}` links are exposed.
- **Memory Health dashboard** (`STRETCH-02`) — a live tally of 🟢/🟡/🔴 dataset health, sharing the same `/datasets` query cache as the dataset list.
- **Incident Timeline** (`STRETCH-03`) — a chronological view of incidents and releases.
- **One-click Demo Reset** (`DEMO-01`) — a confirm modal drives a tar snapshot restore (`scripts/snapshot_memory.py`) that instantly restores the pre-demo dataset state — zero additional LLM cost, no `prune()` + reseed needed.
- **Demo-loop timing** (`DEMO-03`) — `scripts/time_demo_loop.py` is an HTTP-only harness (no `cognee` import) that drives `/reset → search → ingest release → drift check → forget → re-search → /graph` over real HTTP and asserts the timed portion stays under the 120s budget. Latest live measurement: **23.6s total**, well under budget.
- **Persistence** (`PLAT-01`, `PLAT-02`) — `GET /health/cognee` proves a full add → cognify → search round-trip in under 30s; memory survives a server restart (file-based Kuzu/LanceDB/SQLite storage, not an ephemeral filesystem).

## Known Caveats / Honest Limitations

- **FEEDBACK-02 re-rank is not demonstrable with the current seed corpus.** Accept/Dismiss controls and `improve(feedback_alpha=…)` reinforcement are wired and run against real Cognee memory, but the result-picking logic (`_pick_primary_result`) always prefers the highest-version dataset regardless of `feedback_influence` — so accepting a fix doesn't visibly change which result comes back. `FEEDBACK-01`/`FEEDBACK-02` remain flagged as a deferred verification gap in `.planning/STATE.md`.
- **The CHUNKS evidence panel is not interleaved across datasets.** `backend/search.py::_flatten_and_truncate` fills its evidence slots in per-dataset order, not by relevance, so for the canonical `"customers double-charged"` query the `incidents` chunks dominate all evidence slots both before and after forgetting. The visible forget proof for this query is the **dataset-list row disappearing and the drift badge flipping**, not an evidence-chunk diff.
- **No deployed instance.** The 120-second loop was measured locally against a `uvicorn` process on `127.0.0.1`, not against a deployed (e.g. Render) instance. This was a documented, human-approved plan-time decision to avoid Render free-tier cold-start + Mistral latency risk against the timing budget.

## Tech Stack

**Backend**
- Python 3.10–3.14 (developed on 3.12)
- FastAPI `0.138.2`, `uvicorn[standard]>=0.49`
- Cognee `1.2.2`, self-hosted — Kuzu (graph), LanceDB (vector), SQLite (relational), all file-based, no extra infra
- `python-dotenv==1.0.1`, `python-multipart>=0.0.32`
- `mistralai==1.12.4`, `mistral-common==1.11.5` — pinned, not latest: newer `mistralai` (2.x) breaks cognee 1.2.2's unconditional `from mistralai import Mistral` import, and `mistral-common`'s PyPI floor fails to build on Python 3.14
- `pytest>=9.1`, `pytest-asyncio>=1.4` (test infrastructure)

**LLM / embedding provider** — `backend/cognee_config.py` sets `LLM_MODEL=openai/gpt-4o-mini` / `LLM_PROVIDER=openai` as a `setdefault()` fallback (only takes effect if `.env` doesn't override it). The project's actual active configuration, per `.planning/STATE.md`'s recorded decision, overrides this via `.env` to run on **Mistral's free tier**: `LLM_PROVIDER=mistral`, `LLM_MODEL=mistral/mistral-small-latest`, `EMBEDDING_PROVIDER=mistral`, `EMBEDDING_MODEL=mistral/mistral-embed`, `EMBEDDING_DIMENSIONS=1024`. (`.env` / `.env.example` were not readable in this pass due to local permission restrictions — this section reconciles the code-level default with the STATE.md-recorded active override rather than guessing.)

**Frontend**
- Next.js `16.2.10` (App Router)
- React `19.2.4` / React DOM `19.2.4`
- `@tanstack/react-query ^5.101.2`
- Tailwind CSS `^4`, `@tailwindcss/postcss ^4`
- `shadcn ^4.12.0` / `radix-ui ^1.6.1` component primitives
- `sonner ^2.0.7` (toasts), `next-themes ^0.4.6`, `lucide-react ^1.23.0`
- `react-force-graph ^1.48.2` and `react-force-graph-3d ^1.29.1` — **both installed and in active use** for the Memory Graph view (`GRAPH-01`/`STRETCH-04`)

## Architecture

```
Next.js (App Router)  --HTTP-->  FastAPI  -->  Cognee (self-hosted: graph + vector + sqlite)
```

Memory persists to `.patchpilot_memory/` at the repo root (gitignored) so it survives process restarts. CORS is locked to a single allowed origin: `http://localhost:3000`.

**Endpoint reference** (`backend/*.py`):

| Concern | Method | Path | Module |
|---|---|---|---|
| Health | `GET` | `/health/cognee` | `main.py` |
| Search | `POST` | `/search` | `search.py` |
| Ingest | `POST` | `/ingest` | `ingest.py` |
| Ingest status | `GET` | `/ingest/status` | `ingest.py` |
| Sample load | `POST` | `/sample/load` | `ingest.py` |
| Feedback | `POST` | `/feedback/accept` | `feedback.py` |
| Datasets | `GET` | `/datasets` | `datasets_router.py` |
| Forget | `POST` | `/forget` | `forget.py` |
| Reset | `POST` | `/reset` | `reset.py` |
| Graph | `GET` | `/graph` | `graph.py` |

## How to Run

### Backend

```bash
# from the repo root
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# copy the env template and fill in your provider key
cp .env.example .env
```

Set these variables in `.env` (variable names only — never commit a real key value):

```bash
LLM_PROVIDER=mistral
LLM_MODEL=mistral/mistral-small-latest
EMBEDDING_PROVIDER=mistral
EMBEDDING_MODEL=mistral/mistral-embed
EMBEDDING_DIMENSIONS=1024
LLM_API_KEY=<your provider API key>
```

(`backend/cognee_config.py` falls back to OpenAI `gpt-4o-mini` if these are unset — either provider works if the matching key is supplied.)

Start the server (single worker only — Kuzu is file-locked; bind to localhost):

```bash
cd backend && ../.venv/bin/uvicorn main:app --workers 1 --host 127.0.0.1
```

Verify it's alive: `GET http://127.0.0.1:8000/health/cognee` should return `{"status": "ok", ...}` within ~30s.

Load the demo corpus (isolated incident/workaround entities used for the drift-forget demo):

```bash
python seed/seed_cli.py --seed
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:3000` — the only origin the backend's CORS policy allows (`backend/main.py`).

## Seed Corpus

`seed/` is the human-authored source of truth for the demo memory (8 Markdown documents, see `seed/README.md`). Three datasets: `incidents` (durable, survives every forget), `workarounds_v1_8` (the old fix, gets forgotten), `workarounds_v1_9` (the new fix, survives forget). Canonical demo query: **`"customers double-charged"`**.

## License & Disclosure

No `LICENSE` file exists in this repository — all rights reserved by default (no open-source license has been declared).

This is a hackathon submission (WeMakeDevs × Cognee, "The Hangover Part AI: Where's My Context?"). AI-assistant usage was used throughout development and is disclosed per the hackathon's house rules.
