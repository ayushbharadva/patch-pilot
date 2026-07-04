# PatchPilot — Demo Video Script (~2.5 min)

Target: one continuous screen recording, voiceover, no cuts inside the core loop
(judges must see the flip happen live). Each beat is tagged with the judging
criterion it scores.

## Pre-recording checklist

- [ ] Backend running: `cd backend && ../.venv/bin/uvicorn main:app --workers 1 --host 127.0.0.1`
- [ ] Frontend running: `cd frontend && npm run dev`
- [ ] Signed in with **GitHub** OAuth (so the repo picker auto-detects your username)
- [ ] **Create 2–3 realistic issues on one of your GitHub repos beforehand** (e.g. on
      `patch-pilot` itself: "Webhook retries create duplicate orders", "Login session
      expires early"). The picker imports *issues*, not PRs — a repo with 0 issues
      shows "No open or closed issues found."
- [ ] Click Reset in the app header once → canonical demo state:
      `incidents` (5 docs 🟢) · `workarounds_v1_8` (3 docs 🔴) · `workarounds_v1_9` (3 docs 🟢)
- [ ] Timing harness passes: `.venv/bin/python scripts/time_demo_loop.py` (last run: **24.9s** < 120s)

## Beat sheet

**0:00–0:20 — The problem** *(Potential Impact)*
> "Every engineering team has a memory problem. The fix for last quarter's incident
> lives in a closed ticket, a Slack thread, or someone's head — and worse, half of
> that tribal knowledge is *stale*: the workaround everyone remembers was replaced
> two releases ago. PatchPilot is engineering memory that never goes stale, built
> end-to-end on Cognee's memory lifecycle: remember, recall, improve, forget."

Show: landing page, scroll briefly, click **Try Now** → `/app`.

**0:20–0:50 — Remember: your repo becomes memory** *(Creativity, UX, Cognee)*
> "First, memory has to come from where work actually happens — not manual uploads.
> I signed in with GitHub, so PatchPilot already knows who I am. I pick one of my
> repos… and its real issues become incident memory. Each document goes through
> Cognee's add and cognify — building a real knowledge graph, not a search index."

Show: `/app/memory` → "Or import from GitHub" → username already filled →
**Load repos** → pick repo → **Import Issues** → rows flip Processing → Ready.
Point at the lifecycle counters in the header ticking up.

**0:50–1:20 — Recall: evidence-grounded diagnosis** *(Technical Excellence, UX)*
> "Now the on-call moment. Customers are being double-charged. I search — and
> PatchPilot recalls the prior incident with a root-cause recommendation, a real
> confidence score, and the exact evidence chunks it's grounded in. This is Cognee's
> graph-completion search fused with chunk-level evidence."

Show: `/app` → search `customers double-charged` → diagnosis card: root cause,
confidence badge, expand one evidence item. Click **Accept fix** → confidence
delta badge ("Improve" counter ticks — reinforcement via `cognee.improve`).

**1:20–1:50 — Drift: memory that knows it's stale** *(Creativity, Cognee)*
> "Here's what no other memory tool does. Release 1.9 shipped an idempotency guard
> that made the old nightly-dedup workaround obsolete. PatchPilot noticed: the old
> workaround dataset is flagged red — *drifting* — with a reason generated live from
> the knowledge graph. And look at the memory graph: the red cluster IS the stale
> knowledge."

Show: `/app/memory` → dataset list: `workarounds_v1_8` 🔴 + drift reason caption.
Then `/app/graph` → 3D graph, point at the red cluster, click one red node
(detail chip shows dataset + drift state), show legend.

**1:50–2:20 — Forget → the flip** *(Best Use of Cognee — the money shot)*
> "Stale memory doesn't get archived — it gets *forgotten*. One click runs Cognee's
> surgical forget on just that dataset. The durable incident history survives. And
> when I search the same bug again… the answer flips to the current fix. The old
> workaround can never mislead an engineer again."

Show: `/app/memory` → **Forget** on the 🔴 row → confirm → toast → auto re-search →
"View diagnosis" → answer now cites `idempotency_guard` / v1.9 only.
Back to `/app/graph` → red cluster is gone.

**2:20–2:40 — Close** *(Presentation)*
> "Remember, recall, improve, forget — the full Cognee lifecycle, every leg
> load-bearing, self-hosted on the open-source stack: Kuzu graph, LanceDB vectors,
> SQLite. The whole loop you just watched runs in under 25 seconds. PatchPilot:
> every bug remembers its history."

Show: header lifecycle counters (all four > 0), then the README lifecycle table.

## Submission checklist (form: https://forms.gle/KXFatNScKAqAvCyM8)

- [ ] **Confirm exact deadline** (registration email / Discord) — submit ≥1h early
- [ ] Repo public, final code merged to `main`, pushed
- [ ] README renders correctly on GitHub (lifecycle table, LICENSE link works)
- [ ] Video recorded (≤3 min), uploaded (YouTube unlisted or Drive with link access)
- [ ] Track: **Best Use of Open Source Cognee** (self-hosted)
- [ ] **AI disclosure repeated in the form text** (Claude Code — Fable 5/Sonnet/Opus; Kiro)
- [ ] Team: solo — Ayush Bharadva
- [ ] Optional: blog post + social post tagging @wemakedevs @cognee_ (separate prize tracks)
