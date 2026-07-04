# Pitfalls Research

**Domain:** Self-hosted Cognee incident-memory app (Next.js + FastAPI + Cognee) — hackathon demo with drift→forget→re-search loop
**Researched:** 2026-06-30
**Confidence:** MEDIUM (Cognee is a fast-moving OSS library; some findings from GitHub issues and community reports, not official docs)

---

## Critical Pitfalls

### Pitfall 1: cognify() Hangs Silently — No Error, No Timeout

**What goes wrong:**
`await cognee.cognify()` freezes indefinitely and emits no error. The process appears alive but produces no output, no knowledge graph, and no exception. Observed on macOS (GitHub #1743, #2119) but the underlying cause can affect any environment.

**Why it happens:**
Cognee runs a mandatory LLM connection test using `instructor` structured output before processing. Two triggers:
1. The `instructor` library retries failed JSON parsing 5 times with a 128-second tenacity window per attempt — totaling 10+ minutes of silent retries if the first call fails.
2. On macOS, the asyncio event loop uses KqueueSelector which can deadlock during the I/O-bound cognify pipeline.

If the OpenAI key is missing, wrong, or if Cognee is misconfigured before the first call, the retry stack swallows the error completely.

**How to avoid:**
- Validate the OpenAI key with a direct `openai.chat.completions.create()` call in a startup health check before any cognee call.
- Pin cognee to a known-working version (`pip install cognee==X.Y.Z`) and lock it in `requirements.txt` immediately — do not use `cognee@latest` during the build.
- If building/testing on macOS locally, set `PYTHONASYNCIODEBUG=1` to expose loop issues early; for production on Linux (Render), this is less likely.
- Add an explicit asyncio timeout wrapper around `cognify()` calls: `await asyncio.wait_for(cognee.cognify(), timeout=120)` so the FastAPI endpoint returns a 504 rather than hanging forever.
- Emergency workaround if cognify freezes on first run: monkey-patch `cognee.modules.pipelines.layers.setup_and_check_environment._first_run_done = True` before calling to skip connection tests.

**Warning signs:**
- `/api/remember` or `/api/cognify` endpoint never returns after upload.
- No log lines appear after "Starting cognify pipeline…"
- CPU usage is zero but the process is alive.

**Phase to address:** Phase 1 (scaffold + Cognee integration). Write a smoke test endpoint `/api/health/cognee` that runs a minimal `add()` + `cognify()` on a 3-line text fixture. If this returns in under 30 seconds, the integration is live. Block all other phases on this passing.

---

### Pitfall 2: forget(dataset=...) Does Not Visibly Change Search Results

**What goes wrong:**
The demo centrepiece — forget workarounds → re-search returns new fix — silently fails. You call `await cognee.forget(dataset="workarounds_v1_9")` and get a success response, but the subsequent `search(GRAPH_COMPLETION)` still returns the old workaround text. The before/after flip never happens. Judges see no change.

**Why it happens:**
Two separate failure modes:

1. **Dataset leakage (confirmed bug):** GitHub issue #1023 shows that `search()` with the `datasets=` parameter still returns results from datasets that were not requested — dataset filtering is partially broken in the vector store layer. If the graph traversal picks up entities that exist in both `workarounds_v1_9` and `incidents` (because they share entity names like "auth service"), forgetting one dataset does not remove those graph edges.

2. **GRAPH_COMPLETION synthesizes from the full graph:** `GRAPH_COMPLETION` traverses the entire knowledge graph to synthesize an answer; it is not strictly dataset-scoped at the LLM-reasoning layer. Even after forgetting a dataset's raw chunks, residual graph nodes and edges (entity references that co-occur with the forgotten dataset) may remain and still influence the synthesized answer.

**How to avoid:**
- Design seed data with clean entity isolation: workaround dataset uses entities named `auth_workaround_v1` not just `auth` — unique node names that only exist in that dataset and nowhere else.
- After calling `forget()`, also call the low-level `cognee.datasets.delete_data(dataset_name=...)` to purge relational metadata, and verify with `cognee.datasets.list_datasets()` that the dataset is gone.
- Write a pre/post `recall()` assertion in the FastAPI `/api/forget` endpoint: capture the search result before forget, then verify the result changes after forget, and surface a warning if they are identical (so you know the demo loop is broken before judges see it).
- Keep workaround data and incident data in strictly separate datasets (`incidents_main` vs `workarounds_v1_9`) with no overlapping entity names — this is the only way to guarantee surgical deletion changes recall output.
- Test the full loop (`add → cognify → search → forget → search`) with the actual demo data as a CI integration test during Phase 2.

**Warning signs:**
- Re-search after forget returns text that quotes the old workaround verbatim.
- `cognee.datasets.list_datasets()` still shows the forgotten dataset name.
- The GRAPH_COMPLETION answer references entities you expected to be removed.

**Phase to address:** Phase 2 (memory lifecycle) and demo data design (Phase 1 or a dedicated seed-data sprint). The demo dataset schema must be locked before writing any other feature.

---

### Pitfall 3: Demo Seed Data That Does Not Flip — Ambiguous Before/After Story

**What goes wrong:**
The sample tickets and release notes fail to produce a convincing before/after recall change. Before forget: search for "auth timeout" returns a vague paragraph mentioning both the old workaround and a hint at the fix. After forget: the same vague paragraph still appears, just slightly shorter. Judges cannot tell anything changed. The drift demo feels underwhelming.

**Why it happens:**
- Workaround text and fix text share too many overlapping terms ("auth", "timeout", "retry"), so the graph entity extraction merges them into the same nodes.
- The "new fix" release notes don't explicitly contradict the old workaround — they describe a new behavior without referencing the old one, so the knowledge graph doesn't build a contradiction edge.
- GRAPH_COMPLETION synthesizes prose; if the evidence in the graph is ambiguous, the synthesized answer is also ambiguous.

**How to avoid:**
- Write seed data as a deliberate narrative: Ticket #101 says "workaround: set retry_max=0 to disable auth retries"; Release v1.9 notes say "Auth service now retries automatically — setting retry_max=0 is no longer needed and will break login." The contradiction is explicit in the text.
- Use distinct, collision-free entity names per dataset (e.g., `auth_workaround_retry_disable` vs `auth_v19_auto_retry`).
- Run the full add→cognify→search→forget→search pipeline on the seed data manually before writing any UI. Verify the before/after answers are unambiguously different. If they are not, rewrite the seed data, not the code.
- Limit seed corpus to 3-5 documents total (2 ticket files, 1 release notes file) — small enough to be fully understood, large enough to produce graph edges.

**Warning signs:**
- GRAPH_COMPLETION answers before and after forget sound similar.
- Running `search(CHUNKS)` after forget still surfaces chunks from the workaround dataset.
- cognify produces fewer than 5 graph triplets from a seed document (graph too sparse to traverse).

**Phase to address:** Pre-Phase 1 (before any code). Write the three seed files (`tickets_auth.md`, `workaround_v18.md`, `release_v19.md`) and manually validate the story is unambiguous. Treat seed data as a deliverable, not an afterthought.

---

### Pitfall 4: Memory Drift Heuristics Feel Like Magic — No Visible Reasoning

**What goes wrong:**
A badge changes from 🟢 to 🔴 and the judge asks "how do you know it's drifting?" You say "we computed a drift score" and cannot show the reasoning. The differentiator reads as hand-waving. Score on "Best Use of Cognee" drops because Drift looks bolted-on rather than grounded in the memory lifecycle.

**Why it happens:**
- Drift is implemented as a server-side number returned by the API with no breakdown.
- The UI shows the badge but not the contributing factors (which heuristic fired, which memory it matches against, what score each heuristic contributed).
- The heuristics are plausible ("newer fix contradicts older workaround") but implemented as fuzzy string matching without showing the match evidence.

**How to avoid:**
- Return a structured `drift_detail` object alongside every drift badge: `{ score: 0.82, factors: [ { rule: "contradiction_detected", evidence: "Release v1.9 says X; Workaround says NOT-X", weight: 0.6 }, { rule: "component_touched", evidence: "auth_service in release notes", weight: 0.2 } ] }`.
- Display at least the top factor in the UI beside the badge — one sentence of plain English. "🔴 Drifting — Release v1.9 contradicts this workaround (auth retry behavior changed)."
- Anchor the contradiction heuristic to Cognee's actual graph: use the knowledge graph edges to find contradicting entity properties, not freeform text similarity. This makes Drift feel like a Cognee feature, not a wrapper.
- Keep heuristics to exactly 3-4 visible rules, each named and shown. Do not build a complex scoring model — simple and explainable beats "ML magic."

**Warning signs:**
- Drift badge changes but clicking it shows no detail.
- You cannot articulate in one sentence why a specific memory is 🔴.
- The drift score is computed entirely in Python with no Cognee API calls involved.

**Phase to address:** Phase 3 (Drift detection). Design the `drift_detail` schema in Phase 2 when designing the recall response schema — it must be a first-class output, not a post-hoc annotation.

---

### Pitfall 5: Render Free Tier Wipes All Memory on Redeploy

**What goes wrong:**
You demo perfectly on localhost, push a fix at 11 PM the night before submission, Render redeploys, and all Cognee memory (`.patchpilot_memory/`, SQLite, LanceDB, Kuzu files) is wiped. You wake up to a blank app with no knowledge graph. With < 1 hour before submission deadline, there is no time to re-seed.

**Why it happens:**
Render free tier services have an ephemeral filesystem — any file written to disk outside of a build artifact is gone on every deploy and on every instance restart (which happens after 15 minutes of inactivity). Cognee's default storage (`DATA_ROOT_DIRECTORY`, Kuzu `.pkl` files, LanceDB indexes, SQLite metadata) is entirely file-based and goes to the local disk.

**How to avoid:**
- Attach a Render persistent disk ($7/month, 1 GB) mounted at `/data` and set `DATA_ROOT_DIRECTORY=/data/patchpilot_memory` in env vars. Do this on Day 1 before seeding any data.
- Alternatively: use Render's managed Postgres (free 90 days) for the relational layer and configure `DB_PROVIDER=postgres` — but this only persists the metadata DB, not the Kuzu graph or LanceDB vectors, so it is insufficient alone.
- Write a `/api/admin/reseed` endpoint that re-runs the full seed pipeline in one HTTP call. Even if data is wiped, you can recover in the time it takes cognify to run. Make this endpoint key-protected but fast to invoke.
- Before the hackathon deadline, verify the deployment is persistent: deploy a canary write (`write timestamp to /data/canary.txt`), redeploy, verify the timestamp is still there.

**Warning signs:**
- App returns empty search results immediately after a Render deploy.
- `DATA_ROOT_DIRECTORY` in env vars points to `/tmp` or a path that is not on the mounted disk.
- No disk is listed in the Render service "Disks" tab.

**Phase to address:** Phase 1 (infrastructure setup). Persistent disk configuration must be the first infra task before any seed data is loaded.

---

### Pitfall 6: cognify() Blows the $10 OpenAI Budget

**What goes wrong:**
You add a large seed corpus (20+ documents), run `cognify()` once to test, it costs $3. You fix a bug and re-seed, another $3. You demo for judges, another $2. You are at the cap before the judges even finish viewing. OpenAI rejects all subsequent calls and the demo breaks mid-session.

**Why it happens:**
`cognify()` calls the LLM once per chunk for entity/relationship extraction, and again to build structured output. A single medium-length Markdown file (500 words) can generate 8-15 LLM calls. With `gpt-4o-mini` at $0.15/$0.60 per million tokens, a 10-document corpus at ~500 words/doc is roughly $0.05-0.15 per cognify run. But each re-seed (after prune) repeats all calls. Multiple judge sessions or failed reruns stack up fast.

**How to avoid:**
- Hard rule: seed corpus = 3 files max, each under 300 words. The story needs to be convincing, not comprehensive.
- Set an OpenAI usage alert at $7 (not $10) so you have $3 headroom for emergencies.
- Cache the cognified state: after seeding successfully, snapshot the `.patchpilot_memory/` directory as a tar file committed to the repo (under 10 MB for a small graph). The `/api/admin/reseed` endpoint restores from this snapshot instead of re-running cognify. Zero cost for reseeds.
- Never cognify on every file upload in development — gate cognify behind an explicit "Process Memory" button and only run it when testing the demo loop.
- Track token usage via the OpenAI usage API and surface it in the admin panel.

**Warning signs:**
- OpenAI API returns `429 quota exceeded` or `billing hard limit reached`.
- A single cognify run takes more than 90 seconds (indicates large document count).
- The seed corpus is growing because "more context = better answers" — resist this.

**Phase to address:** Phase 1 (infra + seed data design). Budget constraints must be encoded as a corpus size limit rule before any seeding begins. Document this in the repo as `SEED_CORPUS_LIMIT: 3 files, 300 words each`.

---

### Pitfall 7: All 4 Nice-to-Haves Land in v1 Scope on a 5-Day Clock

**What goes wrong:**
Confidence scoring, memory health dashboard, incident timeline, and interactive graph visualization all get built in parallel with the core lifecycle. On Day 4, the core `forget→re-search` loop is still broken because all engineering time went into the dashboard. The demo fails. Judges see a pretty UI with a broken centrepiece.

**Why it happens:**
The PROJECT.md already flags this: "All 4 nice-to-haves promoted to v1 (stretch) ⚠️ Revisit." The Cognee integration has hidden complexity (async issues, dataset scoping bugs, cognify latency), and each day lost debugging infrastructure is a day not spent perfecting the demo loop.

**How to avoid:**
- Hard cut rule: nothing beyond the must-build lifecycle starts until `search → drift → forget → re-search` works end-to-end with the actual seed data and the demo runs in under 120 seconds.
- Order of features for the 5 days: Day 1: infra + cognee smoke test. Day 2: add/cognify/search working. Day 3: forget + drift badges. Day 4: demo loop polished + seed data perfect. Day 5: UI polish only on what exists.
- Nice-to-haves are unlocked only when Day 4 is complete: interactive graph first (highest visual impact for judges), then health dashboard, then confidence scores, then timeline.
- Cut timeline entirely — it provides no demo value and requires non-trivial data modeling.

**Warning signs:**
- GitHub issues labeled "health dashboard" are open before "forget endpoint" is closed.
- Any frontend component references data that doesn't yet have a working API endpoint.
- Day 3 is spent on graph visualization instead of the forget loop.

**Phase to address:** Phase 0 (planning) and enforced at every phase boundary. Each phase must have a working demo of the core loop as its exit criterion before any next phase begins.

---

### Pitfall 8: Instructor Dependency Version Conflicts Break Installation

**What goes wrong:**
`pip install cognee` succeeds but the app crashes on startup with `ImportError` or `AttributeError` from `instructor`. Or the poetry.lock file gets out of sync and the Render deploy installs a different instructor version than local, causing silent behavior changes in structured output parsing.

**Why it happens:**
Cognee pins `instructor < 1.15.3` (changed in cognee 1.1.3). If the project also depends on something that requires `instructor >= 1.15.3`, pip's resolver either fails or silently installs the wrong version depending on the constraint order. Additionally, cognee has 40+ transitive dependencies — an unintended upgrade of `litellm` or `pydantic` can break the instructor parsing chain.

**How to avoid:**
- Pin cognee to an exact version the day it works: `cognee==X.Y.Z` in `requirements.txt`, never `cognee>=X.Y.Z`.
- Use a `requirements.txt` lock file generated via `pip freeze > requirements.txt` from a known-good local install, not just the top-level package list.
- Test the Render build from scratch at least once by deleting the virtual environment locally and running `pip install -r requirements.txt` in a clean Python 3.11 environment before the deadline.
- If a conflict appears, install cognee first in isolation: `pip install cognee==X.Y.Z && pip install -r other_requirements.txt` to let cognee's constraints win.

**Warning signs:**
- `pip install` completes but shows `WARNING: pip is configured with locations that require TLS/SSL` or dependency conflict notices.
- `import cognee` succeeds but `await cognee.cognify()` raises `AttributeError` at runtime.
- Local works, Render crashes on first request.

**Phase to address:** Phase 1 (backend scaffold). Write the exact `requirements.txt` with pinned versions as the first commit and test a clean install in CI before adding any application code.

---

### Pitfall 9: GRAPH_COMPLETION Returns Empty or Hallucinated Results When Graph Is Sparse

**What goes wrong:**
After seeding, `search(SearchType.GRAPH_COMPLETION, "auth timeout")` returns an empty list or a confident but factually wrong answer that invents incident details not in any seed document. Judges see either a blank diagnosis card or a hallucinated root cause.

**Why it happens:**
- **Empty result:** cognify didn't extract enough graph triplets from the seed documents (sparse graph). GRAPH_COMPLETION traverses the graph; if no relevant nodes are found, it returns nothing. This happens when seed text is too short, too vague, or uses jargon that the LLM doesn't extract as entities.
- **Hallucinated result:** GRAPH_COMPLETION uses the graph context as a hint but still runs an LLM completion call. If the graph context is weak, the LLM fills in gaps from its training data rather than returning "unknown."

**How to avoid:**
- After cognify, always inspect the graph: call `cognee.visualize_graph()` locally or log the entity count from `search(SearchType.CHUNKS)`. You need at least 10-20 nodes for GRAPH_COMPLETION to produce grounded answers on a small corpus.
- Write seed documents that are entity-rich: names, versions, component names, error codes. "The auth service (version 1.8) throws error AUTH_TIMEOUT_503 when retry_max=0" extracts 3+ entities. "There was an auth problem" extracts 0.
- For the fused recall strategy (GRAPH_COMPLETION + CHUNKS), always fall back to CHUNKS results if GRAPH_COMPLETION returns empty — the evidence panel in the diagnosis card still shows grounded text even if the synthesis fails.
- Add an explicit check: if GRAPH_COMPLETION result list is empty, return a "Searching incident records…" state rather than a blank card.

**Warning signs:**
- `search(SearchType.GRAPH_COMPLETION, query)` returns `[]`.
- `search(SearchType.CHUNKS, query)` returns results but GRAPH_COMPLETION returns nothing — graph is too sparse.
- Diagnosis card shows a confident answer that quotes text not in any seed file.

**Phase to address:** Phase 2 (recall). Build the fused search with empty-result handling before building any UI component that renders results.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip pinning cognee version | Faster setup | Render deploy gets different version than local; silent behavior changes | Never — pin on Day 1 |
| Use `prune_system()` for demo reset instead of dataset-scoped delete | One API call | Wipes ALL datasets including incidents_main; re-seed required | Acceptable for full demo reset; unacceptable for surgical forget demo |
| Store OpenAI key in `.env` committed to repo | Zero config friction | Key leaked on GitHub | Never — use Render env vars; add `.env` to `.gitignore` on commit 1 |
| Seed corpus > 10 docs for "richer demo" | More realistic feel | cognify cost blows $10 cap; cognify takes 5+ min per run | Never during hackathon |
| Implement drift as freeform text similarity (cosine on embeddings) | Quick to build | Disconnected from Cognee graph; judges ask "why is this Cognee?" | Acceptable as a fallback only — primary signal must use graph edges |
| Hardcode dataset names like `"incidents"` in frontend | No config needed | Naming change anywhere breaks the demo silently | Acceptable for hackathon; use a single `config.ts` constants file |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Cognee + FastAPI async | Calling `asyncio.run(cognee.cognify())` inside an `async def` endpoint | Use `await cognee.cognify()` directly — all cognee operations are natively async; `asyncio.run()` in an async context raises RuntimeError |
| Cognee + FastAPI async | Running cognify in a thread pool via `run_in_executor` | Not needed; cognee is async-native. Do not wrap in executor unless cognify is genuinely blocking (rare) |
| cognee storage paths | Using default storage path `~/.cognee_system` | Set `DATA_ROOT_DIRECTORY=/data/patchpilot_memory` explicitly via env var so the path is predictable and mountable on Render |
| Next.js → FastAPI | Calling FastAPI directly from Server Components | Use Route Handlers (`app/api/*/route.ts`) for external API calls from Next.js; enables proper error boundaries and avoids CORS issues |
| cognee forget | Calling `forget()` without verifying the dataset exists first | Call `cognee.datasets.list_datasets()` before `forget()`; forgetting a non-existent dataset may silently succeed or raise an unclear error |
| cognee + OpenAI | Using `OPENAI_API_KEY` vs `LLM_API_KEY` env var | Cognee uses its own env var `LLM_API_KEY` via `cognee.config` — set both to avoid confusion; validate at startup |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| cognify on every upload | Upload endpoint times out; $10 budget consumed in testing | Decouple upload (add) from processing (cognify); make cognify an explicit user action | At 3rd test run |
| Re-seeding from scratch on every demo reset | 5-10 min recovery time during judge session | Snapshot `.patchpilot_memory/` as a tar blob; restore from snapshot for reset | First time a demo session goes wrong live |
| GRAPH_COMPLETION on cold Kuzu graph | 15-30 second first-query latency due to Kuzu cold start | Warm up with a no-op search at FastAPI startup (lifespan event) | Every cold start on Render free tier (spins down after 15 min inactivity) |
| Large seed documents (> 500 words each) | cognify takes 90+ seconds per doc; high token cost | Keep each seed doc under 300 words; split longer docs into 2-3 focused chunks | At doc 2 or 3 |

---

## "Looks Done But Isn't" Checklist

- [ ] **forget() demo loop:** The endpoint returns 200 — verify re-search actually returns different text before marking done. Log both before/after responses in the endpoint handler.
- [ ] **Cognee initialized:** FastAPI starts without error — verify `cognee.health()` or a minimal `search()` call succeeds at startup, not just that `import cognee` works.
- [ ] **Persistent disk mounted:** Render service shows no errors — verify by writing a canary file to `DATA_ROOT_DIRECTORY` on startup, reading it back, and logging the timestamp. A fresh file on every restart means the disk is not mounted.
- [ ] **Drift badge shown:** Badge renders in UI — verify the `drift_detail.factors` list is non-empty and the first factor renders a human-readable sentence next to the badge.
- [ ] **Seed data cognified:** `add()` returns success — verify with `search(SearchType.CHUNKS)` that at least 5 chunks are retrievable. `add()` success only means files were stored, not that the knowledge graph was built.
- [ ] **Demo runs in 120 seconds:** The demo loop works locally — time it on the deployed Render instance including Kuzu cold start. Add 15 seconds for the cold start to your estimate.
- [ ] **OpenAI budget intact:** App works — check the OpenAI usage dashboard before any live judge session to confirm headroom remains.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| cognify hang | MEDIUM | Kill the FastAPI process; set monkey-patch flag; restart; run cognify on smaller single-doc subset first to confirm it works |
| forget doesn't change recall | HIGH | Switch to `prune_system()` + full reseed from snapshot for the demo; surgical forget can be fixed post-submission |
| Memory wiped on Render | MEDIUM | Invoke `/api/admin/reseed` endpoint if snapshot restore is set up; rebuild from scratch takes 15-30 min |
| OpenAI budget hit | HIGH | Switch `LLM_PROVIDER` to a free Ollama endpoint (if available) or request a temporary key increase from OpenAI support |
| Seed data doesn't flip | HIGH | Rewrite 1-2 seed files, re-cognify, re-test loop; allocate 3 hours minimum for this |
| Instructor version conflict | LOW | `pip install --force-reinstall cognee==X.Y.Z instructor==X.Y.Z`; rebuild Render from scratch |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| cognify() silent hang | Phase 1 — add `/api/health/cognee` smoke test | Health endpoint returns 200 in < 30 seconds on startup |
| forget() doesn't change search results | Phase 1 (seed data design) + Phase 2 (forget endpoint) | Integration test asserts before ≠ after recall output |
| Ambiguous seed data story | Pre-Phase 1 (seed data sprint) | Manual recall before/after produces obviously different prose |
| Drift feels magic | Phase 3 (drift detection) | Each 🔴 badge shows a human-readable factor sentence in UI |
| Render ephemeral filesystem | Phase 1 (infra setup) | Canary file survives a Render redeploy |
| $10 OpenAI budget blown | Phase 1 (corpus size rules) | OpenAI usage dashboard shows < $5 after full seed + 3 demo runs |
| Nice-to-haves crowding core | Phase 0 (planning) | Core loop demo runs < 120 seconds before any stretch feature starts |
| Instructor version conflict | Phase 1 (backend scaffold) | Clean `pip install -r requirements.txt` in fresh venv succeeds |
| Sparse graph → empty GRAPH_COMPLETION | Phase 2 (recall) | `search(CHUNKS)` returns ≥ 5 results AND `search(GRAPH_COMPLETION)` returns non-empty after seed |

---

## Sources

- [GitHub Issue #1743 — cognify hangs on macOS KqueueSelector](https://github.com/topoteretes/cognee/issues/1743)
- [GitHub Issue #2119 — add() and cognify() hang with local LLM on macOS](https://github.com/topoteretes/cognee/issues/2119)
- [GitHub Issue #1023 — search with datasets parameter includes results from other datasets](https://github.com/topoteretes/cognee/issues/1023)
- [Cognee Releases / dependency changes](https://github.com/topoteretes/cognee/releases)
- [Render Persistent Disks documentation](https://render.com/docs/disks)
- [Render Free Tier documentation](https://render.com/docs/free)
- [Cognee prune documentation](https://docs.cognee.ai/python-api/prune)
- [Cognee remember documentation](https://docs.cognee.ai/core-concepts/main-operations/remember)
- [Self-Hosting Cognee LLM Performance Tests — DEV Community](https://dev.to/rosgluk/self-hosting-cognee-llm-performance-tests-3oel)
- [Search Types in Cognee — DEV Community](https://dev.to/chinmay_bhosale_9ceed796b/search-types-in-cognee-1jo7)

---
*Pitfalls research for: PatchPilot — self-hosted Cognee incident-memory app*
*Researched: 2026-06-30*
