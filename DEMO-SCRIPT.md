# PatchPilot — Demo Video Script (target 3:00, hard cap 3:00)

One continuous screen recording. No cuts inside the core loop (1:10–2:25) —
judges must see the flip happen live. Every beat is tagged with the judging
criterion it scores. Voiceover lines are written to be read at a calm pace
(~140 wpm) and fit their time slots; rehearse once against a stopwatch.

## Pre-recording checklist

- [ ] Backend running: `cd backend && ../.venv/bin/uvicorn main:app --workers 1 --host 127.0.0.1`
- [ ] Frontend running: `cd frontend && npm run dev`
- [ ] **Create 2–3 realistic issues on one of your GitHub repos** (e.g. on
      `patch-pilot`: "Webhook retries create duplicate orders", "Login session
      expires early"). The picker imports issues, not PRs.
- [ ] Signed OUT (the script shows sign-up → sign-in live)
- [ ] Click Reset once (sign in, reset, sign out again) → canonical demo state:
      `incidents` (1 doc 🟢) · `workarounds_v1_8` (1 doc 🟢) — **no v1_9 yet; it is uploaded live on camera**
- [ ] `seed/workarounds_v1_9/sendgrid-release.md` sitting in a Finder window / desktop, ready to drag
- [ ] Timing harness passes: `.venv/bin/python scripts/time_demo_loop.py` (last run: **19.7s** < 120s)
- [ ] Browser at 100% zoom, 1920×1080 recording, notifications off (macOS Focus mode)
- [ ] Dark theme (the neural-dark palette is the signature look)

## Beat sheet + voiceover (line-by-line, timed)

Subtitle text = the VO lines verbatim (a ready `demo-voiceover.srt` sits next
to this file; regenerate timings only if your recording drifts >2s from the
slots below).

### 0:00–0:32 — Landing page, one slow continuous scroll *(Presentation, Impact)*

Screen: start at the top of the landing page. Begin scrolling ~2s in — slow,
constant speed, pausing ~2s on each section so its heading is readable:
Hero → source marquee → lifecycle strip → How It Works → live activity feed
→ diagnosis preview → drift preview → final CTA. Reach the CTA by 0:30.

> [0:00] Every engineering team has a memory problem.
> [0:04] The fix for last quarter's incident lives in a closed ticket, a Slack thread, or someone's head.
> [0:10] And half of that tribal knowledge is stale — the workaround everyone remembers was replaced two releases ago.
> [0:17] PatchPilot is incident memory that never goes stale.
> [0:21] It's built end-to-end on Cognee's memory lifecycle — remember, recall, improve, forget —
> [0:27] and you're about to watch every one of those four verbs work, live.

### 0:32–0:48 — Auth: sign-up, then sign-in *(UX)*

Screen: click **Try Now** → lands on sign-up. Hover the form + OAuth buttons
(~5s). Click "Sign in" link at the bottom → sign-in page → click **Continue
with GitHub** → OAuth → lands on `/app`.

> [0:32] Sign-up and sign-in are real — Clerk auth with email or OAuth.
> [0:37] I'll sign in with GitHub — and that choice is about to matter,
> [0:42] because PatchPilot treats your repo as a memory source, not just a login.

### 0:48–1:10 — Remember: incremental GitHub sync *(Creativity, Cognee)*

Screen: `/app/memory` → "Or import from GitHub" — username is already
auto-filled from the GitHub sign-in. **Load repos** → pick your repo →
**Sync Now** → toast "Synced N new issues" → rows flip Processing → Ready.
Point the cursor at the header lifecycle counters ticking.

> [0:48] This is remember. My GitHub username came from the sign-in — I pick a repo, hit Sync Now,
> [0:55] and its real issues become incident memory — each one through Cognee's add and cognify, into a knowledge graph.
> [1:03] And sync is incremental: next click only pulls issues opened since this one. Continuous memory, not a one-time import.

### 1:10–1:35 — Recall: the on-call moment *(Technical Excellence, UX)*

Screen: `/app` → type `forgot password email not sending` → diagnosis card:
root cause says **run the `flush_mail_queue` script**, confidence badge,
expand one evidence chunk (leave it open ~3s).

> [1:10] Now the on-call moment: users aren't getting password-reset emails.
> [1:15] I search — and PatchPilot recalls the incident with a recommendation, a real confidence score,
> [1:22] and the exact evidence chunks it's grounded in — graph search fused with chunk-level evidence.
> [1:29] Note the answer: run the flush_mail_queue script. That was the right fix… in version 1.8.

### 1:35–2:00 — Drift: memory that knows it's stale *(Creativity, Cognee)*

Screen: `/app/memory` → Upload panel → content type **Release note**,
version `1.9` → drop `sendgrid-release.md` → Upload → row flips to Ready in
~8s. The dataset list now shows `workarounds_v1_8` 🔴 with a live drift
reason. Hover the reason (~3s), then `/app/graph` → point at the red cluster,
click one red node.

> [1:35] Then release one-point-nine ships, migrating email to the SendGrid API. I upload the release note —
> [1:43] and watch the old workaround. PatchPilot flagged it red — drifting —
> [1:49] with a reason generated live from the new release's knowledge graph.
> [1:54] In the memory graph, that red cluster is the stale knowledge, isolated in its own dataset.

### 2:00–2:25 — Forget → the flip *(Best Use of Cognee — the money shot)*

Screen: `/app/memory` → **Forget** on the 🔴 row → confirm → toast → auto
re-search fires → "View diagnosis" → the answer now reads **use the SendGrid
API**. Click **Accept fix** → reinforcement toast, Improve counter ticks.

> [2:00] Stale memory doesn't get archived — it gets forgotten. One click, Cognee's surgical forget, that dataset only.
> [2:08] Same search, seconds later — the answer has flipped to the current fix. The durable incident history survived untouched.
> [2:17] I accept the fix, and improve reinforces it — the next recall ranks it even higher.

### 2:25–2:45 — Alive: Ask + the operations feed *(UX, Cognee)*

Screen: `/app/ask` → ask "What is the current fix for forgot password
emails?" → answer cites SendGrid. Then `/app/activity` → the live Memory
Operations feed: remember, recall, drift, forget, improve rows + analytics
tiles.

> [2:25] There's even a conversational layer — same memory, session-aware follow-ups.
> [2:31] And the operations feed shows everything you just watched, as lifecycle events:
> [2:38] remembered, recalled, drift caught, forgotten, reinforced. The memory is alive — you can see it think.

### 2:45–3:00 — Close *(Presentation)*

Screen: header lifecycle counters (all four > 0) → cut to the README's
"How PatchPilot uses Cognee" lifecycle table for the final 5 seconds.

> [2:45] Remember, recall, improve, forget — every lifecycle verb load-bearing, self-hosted on the open-source stack:
> [2:52] Kuzu, LanceDB, SQLite. The whole loop runs in twenty seconds.
> [2:57] PatchPilot — every bug remembers its history.

## Producing the voiceover + subtitles (no video editor needed)

**Record the screen first, voice second.** Actions are much easier to re-do
than narration timing.

1. **Screen recording (macOS):** `Cmd+Shift+5` → "Record Entire Screen" (or
   QuickTime → File → New Screen Recording), microphone OFF. Perform the beat
   sheet with this script open on a second screen/phone; keep a stopwatch
   visible off-recording. One take that lands beats within ±2s is enough.
   Re-record until the core loop (1:10–2:25) is clean — no cuts there.
2. **Voiceover, pick ONE:**
   - *Own voice (recommended — judges respond to a human):* open the
     recording in **CapCut** (free, capcut.com desktop app) → Audio → Record,
     and read each line as its beat plays back. Flub a line? Stop, delete
     that clip, re-record just that line.
   - *TTS fallback:* paste the VO lines (bracketed timestamps removed) into
     **ElevenLabs** (free tier covers ~3 min) one section at a time →
     download MP3s → drag each onto the CapCut timeline at its section's
     timestamp.
3. **Subtitles:** the file `demo-voiceover.srt` next to this script already
   contains every line with the timings above.
   - *Easiest:* upload the finished video to YouTube (unlisted) → YouTube
     Studio → Subtitles → upload `demo-voiceover.srt`. Done — no burn-in.
   - *Burned-in (plays anywhere, including the submission form preview):*
     CapCut → Text → Auto captions (it transcribes your VO), or import the
     SRT (Text → Local captions). Style: bottom-center, white on 60% black.
4. **Export:** CapCut → Export → 1080p, 30fps, MP4. Watch it once, cold,
   start to finish before submitting.

Total production time: ~60–90 min including retakes.
