---
phase: quick-260703-rks
plan: "260703-rks"
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
autonomous: true
requirements:
  - DOC-README
must_haves:
  truths:
    - "A newcomer reading README.md understands PatchPilot's concept, tagline, and the search→drift→forget→re-search core value without reading any planning doc."
    - "README states the project is 100% complete — all 4 phases shipped, milestone v1.9 — with NO 'Phase 4 not started' / 'not yet built' language surviving anywhere."
    - "Every version number, endpoint, dependency, and the active LLM/embedding provider in README matches the live codebase, not the stale README or planning-doc assumptions."
    - "All Phase 4 features are documented as WORKING: memory graph (GRAPH-01/STRETCH-04), confidence badge (STRETCH-01), health dashboard (STRETCH-02), incident timeline (STRETCH-03), one-click reset (DEMO-01), demo-loop timing (DEMO-03)."
    - "Known caveats (FEEDBACK-02 reorder not demonstrable; evidence panel not interleaved; local-only, no deployed instance) are stated honestly."
    - "A reader can start backend + frontend from README instructions alone with correct env-var setup."
  artifacts:
    - "README.md (repo root) — rewritten end-to-end"
  key_links:
    - "Frontend versions in README == frontend/package.json"
    - "Backend versions in README == requirements.txt"
    - "Endpoint list in README == actual @router/@app decorators in backend/*.py"
    - "Active provider in README == reconciliation of .env / .env.example / backend/cognee_config.py + STATE.md decision"
---

<objective>
Rewrite `README.md` at the repo root end-to-end so it accurately reflects the FINAL, shipped PatchPilot: all 4 phases complete (milestone v1.9), the full feature set including every Phase 4 stretch feature, correct current tech/versions/config, and honest caveats — every factual claim verified against the live codebase, not copied from the stale README or from planning docs uncritically.

Purpose: The current `README.md` is stale — it claims "3 of 4 phases complete (75%)", marks Phase 4 "Not started", and lists shipped features (memory graph, reset, stretch features) as "Not Yet Built". This misrepresents a finished project to hackathon judges and reviewers.

Output: A single rewritten `README.md` at repo root.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@README.md
@requirements.txt
@frontend/package.json
@backend/cognee_config.py
@seed/README.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Establish ground truth — verify every factual claim against the live codebase</name>
  <files>(read-only audit — no file written this task) README.md, requirements.txt, frontend/package.json, backend/main.py, backend/search.py, backend/ingest.py, backend/feedback.py, backend/datasets_router.py, backend/forget.py, backend/reset.py, backend/graph.py, backend/cognee_config.py, .env.example, .env, frontend/components/, scripts/, seed/README.md</files>
  <action>
Build an in-context fact inventory by reading the live codebase. Treat the existing README.md and the planning docs as UNTRUSTED for facts — they are starting points, not ground truth. Do NOT copy version numbers, endpoint lists, or provider claims from them; re-derive each from source.

Verify and record each of the following:

1. Backend dependency versions — read `requirements.txt`. Record exact pins (cognee, fastapi, uvicorn, python-dotenv, python-multipart, mistralai, mistral-common, pytest, pytest-asyncio).

2. Frontend dependency versions — read `frontend/package.json`. Record exact versions for next, react, react-dom, @tanstack/react-query, tailwindcss, @tailwindcss/postcss, shadcn, radix-ui, sonner, react-force-graph, react-force-graph-3d, lucide-react, next-themes. Note specifically that BOTH react-force-graph and react-force-graph-3d ARE installed (the stale README falsely claims react-force-graph "isn't even installed yet").

3. Active LLM / embedding provider — this is the highest-risk claim. Reconcile three sources: (a) `backend/cognee_config.py` (note it `setdefault`s openai/gpt-4o-mini + openai as the FALLBACK default, overridable by .env); (b) `.env.example` (the committed template — read it if permissions allow); (c) `.env` (the actual active config — read it if permissions allow) and STATE.md's recorded provider decision. STATE.md records the active provider as Mistral free tier (LLM_PROVIDER=mistral, LLM_MODEL=mistral/mistral-small-latest, EMBEDDING_PROVIDER=mistral, EMBEDDING_MODEL=mistral/mistral-embed, EMBEDDING_DIMENSIONS=1024). If `.env`/`.env.example` are readable, document what they actually contain and how the template vs. active config differ. If they are permission-blocked, document the reconciliation transparently: cognee_config.py default (OpenAI gpt-4o-mini) + the STATE-recorded active override (Mistral). NEVER guess a single provider silently — state the source of the claim.

4. Backend endpoint inventory — grep the actual route decorators: `grep -rnE '@(app|router)\.(get|post|put|delete|patch)' backend/*.py`. The live set is: GET /health/cognee (main.py), POST /search (search.py), POST /ingest + GET /ingest/status + POST /sample/load (ingest.py), POST /feedback/accept (feedback.py), GET /datasets (datasets_router.py), POST /forget (forget.py), POST /reset (reset.py), GET /graph (graph.py). Re-run the grep to confirm; document the list you actually observe.

5. CORS allowed origin — read `backend/main.py` around the CORSMiddleware config. Confirm the allowed origin is http://localhost:3000 (single origin).

6. Frontend feature surface — list `frontend/components/`. Confirm the stretch components exist: HealthDashboard.tsx (STRETCH-02), IncidentTimeline.tsx (STRETCH-03), MemoryGraphView.tsx (GRAPH-01/STRETCH-04), ResetButton.tsx (DEMO-01), plus DiagnosisCard/SearchBar/UploadPanel/DatasetList/FileStatusRow.

7. Demo tooling — confirm `scripts/snapshot_memory.py` (tar snapshot save/restore, the zero-LLM-cost reset mechanism) and `scripts/time_demo_loop.py` (drives + times the full loop; STATE records a measured 23.6s local run, well under the 120s budget) exist.

8. Seed corpus / isolation — read `seed/README.md`. Confirm the 8-doc corpus, the incidents / workarounds_v1_8 / workarounds_v1_9 dataset mapping, the canonical query "customers double-charged", and that `seed/seed_cli.py` is the seed entrypoint.

9. License — confirm NO LICENSE file exists at repo root (`ls LICENSE*`). All-rights-reserved by default.

10. Known caveats to carry forward (from PROJECT.md / STATE.md, but frame as honest limitations): FEEDBACK-02's visible re-rank on Accept is NOT demonstrable with the current seed corpus (highest-version tie-break in `_pick_primary_result` dominates independent of feedback_influence); the CHUNKS evidence panel is NOT interleaved across datasets (`_flatten_and_truncate`), so for the canonical query the visible forget proof is the dataset-list row disappearing, not an evidence-chunk diff; there is NO deployed instance — the 120s loop was measured locally.

Hold this inventory in context for Task 2. Where any live-source fact contradicts the stale README or a planning doc, the LIVE SOURCE wins.
  </action>
  <verify>
    <automated>grep -rnE '@(app|router)\.(get|post|put|delete|patch)' backend/*.py | wc -l | awk '$1>=9{print "OK endpoints="$1} $1<9{print "FAIL endpoints="$1; exit 1}'</automated>
    <automated>grep -Ec 'react-force-graph' frontend/package.json</automated>
    <automated>grep -Ec 'cognee==1.2.2|fastapi==0.138.2' requirements.txt</automated>
    <automated>ls frontend/components/HealthDashboard.tsx frontend/components/IncidentTimeline.tsx frontend/components/MemoryGraphView.tsx frontend/components/ResetButton.tsx >/dev/null && echo "OK stretch components present"</automated>
    <automated>ls LICENSE* 2>/dev/null && echo "LICENSE EXISTS" || echo "OK no LICENSE (all rights reserved)"</automated>
  </verify>
  <done>Fact inventory established from live sources: backend + frontend versions, active provider (with source of claim documented), 9 endpoints, CORS origin, stretch components, demo scripts, seed corpus, and license state — each verified against source, not copied from the stale README.</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite README.md end-to-end from verified facts</name>
  <files>README.md</files>
  <action>
Overwrite `README.md` at repo root with a complete, accurate rewrite built ONLY from the Task 1 fact inventory. Do not preserve any stale claim from the current README. Organize into these sections:

1. Title + tagline — "PatchPilot", tagline "Every bug remembers its history." Keep the concept paragraph (living incident-memory system; ingests tickets/chats/changelogs/fixes into Cognee; recalls with evidence; reinforces; detects Memory Drift on release and forgets stale workarounds). Link Cognee. State the target users (small SaaS / engineering teams). Keep the one-line hackathon attribution (The Hangover Part AI: Where's My Context? — WeMakeDevs x Cognee, Jun 29 – Jul 5, 2026).

2. Core value — the visible loop: search a bug → see the old workaround → upload a release that supersedes it → workaround flagged drifting → forget it → re-search returns the new correct fix, in under 120 seconds. Emphasize PatchPilot is impossible without Cognee's full lifecycle (add → cognify → search → improve → forget).

3. Project status — the project is COMPLETE. State: all 4 phases shipped, milestone v1.9, 100%. Use a 4-row table (Phase 1 Foundation / Phase 2 Core Recall / Phase 3 Drift + Forget / Phase 4 Demo Loop + Stretch) with EVERY row marked done. There must be NO surviving "not started" / "not yet built" / "roadmap" / "pending" framing for any Phase 4 item. Delete the stale "Roadmap / Not Yet Built (Phase 4)" section entirely — do not carry it forward in any form.

4. Features (built and working) — one accurate list, each mapped to its requirement ID(s):
   - Multi-source ingest (INGEST-01/02/03) — file upload + Load Sample, background add()+cognify(), incidents vs workarounds_v{N} datasets for surgical forget.
   - Evidence-grounded diagnosis card (RECALL-01/02/03) — fused search(GRAPH_COMPLETION) + search(CHUNKS).
   - Confidence badge (STRETCH-01) — real [0,1] score derived from the CHUNKS retriever similarity, shown on the diagnosis card.
   - Release ingestion (RELEASE-01) — per-release workarounds_v{N} dataset, visible in the dataset list.
   - Memory Drift detection (DRIFT-01/02/03) — 🟢 Stable / 🟡 Aging / 🔴 Drifting badges with a live Cognee-generated reason string.
   - Surgical Forget with proof (FORGET-01/02) — guarded POST /forget (durable incidents can never be forgotten; only a live, drifting workarounds_v{N}); two-step UI confirm + auto re-search.
   - Memory Graph view (GRAPH-01 / STRETCH-04) — 3D react-force-graph-3d rendering of the real aggregated Cognee graph with click-to-explore node detail; GET /graph trims all chunk text before it crosses to the browser.
   - Memory Health dashboard (STRETCH-02) — live 🟢/🟡/🔴 drift tallies.
   - Incident Timeline (STRETCH-03) — chronological incidents/releases.
   - One-click Demo Reset (DEMO-01) — confirm modal → tar snapshot restore → dataset-list restore; zero-LLM-cost reset (snapshot save/restore, not prune+reseed).
   - Demo-loop timing (DEMO-03) — scripts/time_demo_loop.py drives + times the full loop; measured ~23.6s locally, well under the 120s budget.
   - Persistence (PLAT-01/02) — GET /health/cognee round-trip < 30s; memory survives restart (file-based Kuzu/LanceDB/SQLite).

5. Known caveats / honest limitations — a short section: FEEDBACK-02 visible re-rank not demonstrable with the current seed corpus (state why briefly); CHUNKS evidence panel not interleaved across datasets so the canonical-query forget proof is the dataset-list row disappearing; no deployed instance (120s loop measured locally, not on Render).

6. Tech stack — Backend and Frontend subsections using the EXACT versions recorded in Task 1 (requirements.txt + frontend/package.json). Backend: Python 3.10–3.14 (dev on 3.12), FastAPI 0.138.2, uvicorn[standard], cognee 1.2.2 self-hosted (Kuzu graph / LanceDB vector / SQLite relational, all file-based), pinned mistralai==1.12.4 + mistral-common==1.11.5 with the one-line reason (newer versions break cognee 1.2.2's import or fail to build). Frontend: Next.js 16.2.10 (App Router), React 19.2.4, TanStack React Query, Tailwind CSS 4, shadcn + radix-ui, sonner, react-force-graph + react-force-graph-3d. State the active LLM/embedding provider EXACTLY as reconciled in Task 1 — do not assert a provider the sources do not support; if template (.env.example) and active (.env / STATE decision) differ, say so in one sentence.

7. Architecture — a fenced ASCII diagram: Next.js (App Router) --HTTP--> FastAPI --> Cognee (self-hosted: graph + vector + sqlite). Note memory persists to .patchpilot_memory/ (gitignored) so it survives restarts. Include a compact endpoint reference listing the endpoints exactly as enumerated by the Task 1 grep (do not hardcode a count), grouped by concern (health, search, ingest/status/sample, feedback, datasets, forget, reset, graph).

8. How to run — Backend and Frontend subsections with correct commands. Backend: venv + pip install -r requirements.txt, then cp .env.example .env and set the provider env vars (VARIABLE NAMES ONLY — never paste a real key value), then run uvicorn with --workers 1 (Kuzu file-lock) bound to 127.0.0.1, then GET /health/cognee to verify, then python seed/seed_cli.py --seed to load the demo corpus. Frontend: cd frontend, npm install, npm run dev, opens http://localhost:3000 (the only CORS-allowed origin per backend/main.py).

9. License & disclosure — no LICENSE file exists (all rights reserved by default); hackathon submission; AI-assistant usage disclosed per house rules.

Style: fenced code blocks for all shell commands and the architecture diagram. Keep it tight and reviewer-facing. Do not include any secret values. Do not reintroduce any "not yet built"/"roadmap"/"75%" framing.
  </action>
  <verify>
    <automated>test -f README.md && echo "OK README exists"</automated>
    <automated>grep -Ec 'GRAPH-01|STRETCH-01|STRETCH-02|STRETCH-03|DEMO-01|DEMO-03' README.md</automated>
    <automated>grep -Ec 'react-force-graph' README.md</automated>
    <automated>grep -Ec 'FEEDBACK-02' README.md</automated>
    <automated>grep -Ec 'v1\.9|100%|4 of 4|all 4 phases|all four phases' README.md</automated>
    <automated>grep -Ec 'next.*16\.2\.10|16\.2\.10' README.md</automated>
    <automated>grep -Ec 'health/cognee' README.md</automated>
  </verify>
  <done>README.md is rewritten end-to-end: status shows 100%/all-4-phases-complete with zero surviving "not built"/"roadmap"/"75%" framing; all Phase 4 stretch features documented as working with requirement IDs; versions match package.json + requirements.txt; the 9 endpoints and CORS origin are accurate; the active provider is stated with its source; run instructions are correct and leak no secrets; caveats and license/disclosure sections present.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repo → published README | README is committed and read by hackathon judges/reviewers; it must not disclose secrets and must not misrepresent shipped state. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-rks-01 | Information Disclosure | README env-setup section | high | mitigate | Document env VARIABLE NAMES only; never copy a real key/secret value from `.env` into README. Task 2 action forbids pasting secret values. |
| T-rks-02 | Repudiation | README project-status claims | medium | mitigate | Every factual claim (versions, endpoints, provider) re-derived from live source in Task 1; live source wins over stale README/planning docs; provider claim states its source. |
| T-rks-SC | Tampering | package installs | low | accept | Documentation-only change; no npm/pip/cargo installs performed by this plan. No package-legitimacy checkpoint required. |
</threat_model>

<verification>
- README.md exists at repo root and opens with the PatchPilot title + tagline.
- No "Phase 4 not started" / "not yet built" / "roadmap" / "75%" language remains anywhere in the file.
- All Phase 4 requirement IDs (GRAPH-01, STRETCH-01, STRETCH-02, STRETCH-03, STRETCH-04, DEMO-01, DEMO-03) appear and are described as working.
- Versions in README match `requirements.txt` and `frontend/package.json` exactly.
- The backend endpoint list (as enumerated by the Task 1 grep) and the single CORS origin match `backend/*.py`.
- The active LLM/embedding provider claim is consistent with the reconciled sources and names its source.
- No secret values appear anywhere in README.
- Known caveats (FEEDBACK-02, evidence-panel non-interleave, local-only) are stated.
- License & disclosure section present (no LICENSE file → all rights reserved).
</verification>

<success_criteria>
A reviewer who has never seen the project can, from README.md alone: understand what PatchPilot is and its core value; see that it is 100% complete (all 4 phases, milestone v1.9) with every stretch feature working; find accurate versions, endpoints, and provider config; run backend + frontend correctly; and understand the honest caveats — with every fact traceable to the live codebase.
</success_criteria>

<output>
Overwrite `README.md` at the repo root. Create `.planning/quick/260703-rks-rewrite-readme-md-end-to-end-to-accurate/260703-rks-SUMMARY.md` when done.
</output>
