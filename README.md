# PatchPilot

*Every bug remembers its history.*

PatchPilot is a living incident-memory system for small SaaS and engineering teams. It ingests tickets, chats, changelogs, and past fixes into [Cognee](https://github.com/topoteretes/cognee), recalls prior incidents with root-cause recommendations backed by evidence, reinforces fixes engineers confirm, and — when a release ships — detects which old workarounds have gone stale (**Memory Drift**) and forgets them.

The core value is a visible loop: **search a bug → see the old workaround → upload a release that supersedes it → watch the workaround get flagged 🔴 (drifting) → forget it → re-search and get the new, correct fix** — all in under 120 seconds. PatchPilot is built to be obviously impossible without Cognee's full memory lifecycle (`add` → `cognify` → `search` → `improve` → `forget`), not just a search index with a UI on top.

**Target users:** small SaaS / engineering teams whose incident knowledge is scattered across GitHub, Slack, tickets, and people's heads.

> Built for **The Hangover Part AI: Where's My Context?** hackathon (WeMakeDevs × Cognee, Jun 29 – Jul 5, 2026). Not a monetized product.

## Project Status

**3 of 4 phases complete (75%)**

| Phase | Description | Status |
|---|---|---|
| 1. Foundation | Cognee verified, memory persists across restarts, dataset architecture (`incidents` vs `workarounds_v{N}`) locked, CLI-level before/after forget flip proven | ✅ Done |
| 2. Core Recall | Full-stack ingest, evidence-grounded diagnosis card, feedback reinforcement, release upload | ✅ Done |
| 3. Drift + Forget | Drift detection with health badges, surgical forget, live before/after proof in the browser | ✅ Done |
| 4. Demo Loop + Stretch | Deployed 120s loop verification, one-click demo reset, memory graph view, stretch features | ⬜ Not started |

Source: `.planning/STATE.md` progress block, `.planning/ROADMAP.md` Progress table.

## Current Features (Built & Working)

All features below are live in the browser and map to a completed item in `.planning/REQUIREMENTS.md`:

- **Multi-source ingest** (`INGEST-01`, `INGEST-02`, `INGEST-03`) — upload ticket/chat/changelog files or load bundled sample datasets; content is ingested via Cognee `add()` + `cognify()` in the background. Durable incidents and per-release workarounds live in separate datasets (`incidents` vs `workarounds_v{N}`) so forgetting can be surgical.
- **Evidence-grounded diagnosis card** (`RECALL-01`, `RECALL-02`, `RECALL-03`) — search a bug and get a root-cause recommendation via `search(GRAPH_COMPLETION)`, fused with the exact prior-incident evidence via `search(CHUNKS)`, rendered as one card.
- **Release ingestion** (`RELEASE-01`) — upload a release note and it's stored as a versioned `workarounds_v{N}` dataset, visible in the dataset list.
- **Memory Drift detection** (`DRIFT-01`, `DRIFT-02`, `DRIFT-03`) — every memory carries a health badge (🟢 Stable / 🟡 Aging / 🔴 Drifting); a 🔴 badge ships with a live, human-readable, Cognee-generated reason string (e.g. "Release v1.9 patches the component this workaround targets").
- **Surgical Forget with proof** (`FORGET-01`, `FORGET-02`) — clicking Forget on a 🔴 dataset removes it via `forget(dataset="workarounds_v{N}")`, guarded so only a live, currently-drifting release dataset can be forgotten (the durable `incidents` dataset can never be forgotten this way). Re-searching afterward shows the updated, correct answer — the before/after flip is visible end-to-end.
- **Persistence** (`PLAT-01`, `PLAT-02`) — `GET /health/cognee` proves a full add → cognify → search round-trip in under 30s; memory survives a server restart (file-based Kuzu/LanceDB/SQLite storage, not an ephemeral filesystem).

**Known caveat — feedback reinforcement:** Accept/Dismiss controls and `improve(feedback_alpha=…)` reinforcement are wired and run against real Cognee memory. However, the *visible* effect of accepting a fix (re-ranking it higher on the next search) is **not currently demonstrable**: the result-picking logic (`_pick_primary_result`) always prefers the highest-version dataset regardless of `feedback_influence`, so accepting a fix doesn't change which result comes back with the current seed corpus. `REQUIREMENTS.md` correctly keeps `FEEDBACK-01` and `FEEDBACK-02` as pending for this reason.

## Roadmap / Not Yet Built (Phase 4)

The following are planned but not implemented yet — do not expect them to work today:

- **Memory Graph view** (`GRAPH-01`) — a navigable visual graph of incidents/fixes/components. `react-force-graph` isn't even installed yet.
- **One-click demo reset** (`DEMO-01`) — `prune_data()` + `prune_system()` + reseed to a clean state. Today, resetting the demo corpus means running `seed/seed_cli.py --seed` (a full reseed that re-runs `cognify()`), not a one-click prune-based reset.
- **Deployed 120-second loop verification** (`DEMO-03`) — the loop has been live-UAT-verified locally in the browser, but there is **no deployed (e.g. Render) instance yet** and no timed verification against one. Don't expect a live demo URL.
- **Stretch features** (`STRETCH-01`–`STRETCH-04`) — confidence scores on recall results, a memory health dashboard, an incident timeline, and a richer interactive graph. All pending, cut first if time-boxed.

## Tech Stack

**Backend**
- Python 3.10–3.14 (developed on 3.12)
- FastAPI `0.138.2`, `uvicorn[standard]`
- Cognee `1.2.2`, self-hosted — Kuzu (graph), LanceDB (vector), SQLite (relational), all file-based, no extra infra
- LLM + embeddings: **Mistral free tier** (`mistral/mistral-small-latest` for graph extraction, `mistral/mistral-embed` for embeddings) — this is the *active* provider, not OpenAI. The original spec defaulted to OpenAI `gpt-4o-mini`; Gemini was tried next and hit its free-tier quota; Mistral is what's actually wired and running.
- `mistralai==1.12.4`, `mistral-common==1.11.5` (pinned — newer versions break cognee 1.2.2's import or fail to build)

**Frontend**
- Next.js `16.2.10` (App Router)
- React `19.2.4`
- TanStack React Query `^5.101.2`
- Tailwind CSS `^4`
- shadcn `^4.12.0` / radix-ui `^1.6.1` component primitives
- sonner `^2.0.7` (toasts)

## Architecture

```
Next.js (App Router)  --HTTP-->  FastAPI  -->  Cognee (self-hosted: graph + vector + sqlite)
```

Memory persists to `.patchpilot_memory/` at the repo root (gitignored) so it survives process restarts.

## How to Run

### Backend

```bash
# from the repo root
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# copy the env template and fill in your API key
cp .env.example .env
```

`.env.example` ships pointing at OpenAI (primary) with a commented-out Gemini fallback — those work if you provide the matching key, but this project actually runs on **Mistral's free tier**. To match the working configuration, set these in `.env` instead:

```bash
LLM_PROVIDER=mistral
LLM_MODEL=mistral/mistral-small-latest
EMBEDDING_PROVIDER=mistral
EMBEDDING_MODEL=mistral/mistral-embed
EMBEDDING_DIMENSIONS=1024
LLM_API_KEY=<your Mistral API key>
```

Then start the server (single worker only — Kuzu is file-locked; bind to localhost):

```bash
cd backend && ../.venv/bin/uvicorn main:app --workers 1 --host 127.0.0.1
```

Verify it's alive: `GET http://127.0.0.1:8000/health/cognee` should return `{"status": "ok", ...}` within ~30s.

To seed the demo corpus (isolated incident/workaround entities used for the drift-forget demo):

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

## License & Disclosure

No `LICENSE` file exists in this repository yet — all rights reserved by default (no open-source license has been declared).

This is a hackathon submission (WeMakeDevs × Cognee, "The Hangover Part AI: Where's My Context?"). AI-assistant usage was used throughout development and is disclosed per the hackathon's house rules.
