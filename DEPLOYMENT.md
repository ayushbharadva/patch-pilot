# PatchPilot — Deployment Plan

One clear recommendation per side, free-tier-first, with every known breakage
called out so nothing surprises us during the live demo.

## TL;DR

| Side | Recommendation | Cost | Why |
|---|---|---|---|
| Frontend (Next.js 16 + Clerk) | **Vercel Hobby** | $0 | Zero-config Next.js host; Clerk officially supports it; global CDN, no cold-start pain for the marketing page |
| Backend (FastAPI + self-hosted Cognee) | **Render free web service, snapshot-on-boot** | $0 | Only mainstream free tier that runs a long-lived Python process; ephemeral disk is neutralized by restoring the demo snapshot at boot |
| Recording day | **Record against localhost** | $0 | The video is the submission artifact; localhost has no cold starts, no rate limits, no surprises |

> Self-hosted Cognee on a VPS/PaaS still qualifies for the **Best Use of Open
> Source** track — the requirement is self-hosted Cognee (Kuzu/LanceDB/SQLite
> on our own disk), not "runs on a laptop."

## Frontend — Vercel Hobby (recommended)

Steps:
1. Import the repo in Vercel, set root directory to `frontend/`.
2. Env vars: `NEXT_PUBLIC_API_BASE_URL=https://<backend>.onrender.com`,
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
3. In Clerk dashboard: add the Vercel domain to allowed origins/redirects
   (sign-in, sign-up, `/sso-callback`).

Free-tier limits that matter:
- **Hobby is non-commercial** — fine for a hackathon.
- 100GB bandwidth/mo, serverless function limits — irrelevant at demo scale.
- No always-on server needed: the app pages are static/client-side; the only
  network dependency is the FastAPI backend.

What breaks if ignored:
- Forgetting Clerk's production-domain allowlist ⇒ OAuth sign-in silently
  loops back to sign-in. Test login **before** sharing the URL.
- Forgetting `NEXT_PUBLIC_API_BASE_URL` ⇒ the app calls `localhost:8000` in
  visitors' browsers — looks deployed, works only on our machine.

## Backend — Render free web service (recommended)

The backend is FastAPI + Cognee with **file-based** stores (Kuzu graph,
LanceDB vectors, SQLite relational + cache) under `.patchpilot_memory/`, and
must run with `--workers 1` (Kuzu file locking).

Steps:
1. New Web Service → repo root; build `pip install -r requirements.txt`;
   start `uvicorn backend.main:app --workers 1 --host 0.0.0.0 --port $PORT`.
2. Env vars: `LLM_API_KEY` (+ `LLM_PROVIDER`/`LLM_MODEL` — we run Mistral
   free tier), optional `GITHUB_TOKEN` (5000 req/h vs 60 unauthenticated).
3. Ship the demo snapshot: `patchpilot_memory.snapshot.tar` is gitignored —
   either un-ignore it for the deploy branch or add a build step that
   downloads it (release asset). Add a startup hook that calls
   `scripts/snapshot_memory.restore()` when `.patchpilot_memory/` is missing,
   so **every cold boot = canonical demo state**.
4. Add the Vercel origin to `backend/main.py`'s CORS `allow_origins` list
   (it is an explicit allowlist by design — no wildcard).

Free-tier breakages, called out:
- **Ephemeral filesystem**: *all* runtime memory (uploads, GitHub syncs,
  reinforcements, `github_sync.json`) is lost on every deploy/restart. With
  snapshot-on-boot this degrades gracefully to "auto-reset to demo state" —
  acceptable for judges, unacceptable for real users. Say so in the README.
- **15-min idle spin-down, ~50–60s cold start**: the first judge click hangs
  for a minute. Mitigation: free uptime pinger (UptimeRobot/cron-job.org)
  hitting `GET /datasets` every 10 min. Do **not** ping `/health/cognee` —
  it runs a full add→cognify→search→forget round-trip and bills LLM calls.
- **512MB RAM / 0.1 CPU**: Cognee + LanceDB fit at our corpus size because
  embeddings + LLM are remote API calls (Mistral), not local models. Don't
  ingest a large repo's issues on the free instance.
- **Request timeouts**: cognify runs as a background task (`/ingest` returns
  immediately, status is polled) so no request outlives ~10s except
  `/health/cognee` (~20s) — inside Render's limits, but avoid wiring the
  frontend to the health endpoint.
- **Single instance only**: never scale to 2+ instances — Kuzu's file lock
  and the in-process ops feed/drift caches assume one worker (documented
  constraint).

### If $0 must become $5–7 (only if a persistent live URL matters)

Railway Hobby or Render Starter + 1GB persistent disk mounted at
`.patchpilot_memory/` gives real persistence (uploads and reinforcements
survive restarts). This is the only thing money buys here; the demo video
does not need it.

## Recording-day posture (what we actually do today)

1. Record the video against **localhost** (backend + `npm run dev`) — zero
   cold-start/ratelimit risk, and the timed loop is proven there (19.7s).
2. Deploy Vercel + Render **after** the video is safely recorded, if time
   remains; add the live URL to the README as a bonus, with the cold-start
   caveat noted next to the link.
3. If the deploy misbehaves, ship without it — a flawless video plus honest
   "local-first by design, here's why" beats a flaky URL.
