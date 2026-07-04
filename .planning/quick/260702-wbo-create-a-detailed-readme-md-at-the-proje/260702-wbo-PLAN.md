---
task: 260702-wbo
title: Create a verified root README.md
type: execute
mode: quick
autonomous: true
files_modified:
  - README.md
requirements: ["DOC-README"]

must_haves:
  truths:
    - "README.md exists at project root and states 3 of 4 phases complete (75%), matching STATE.md"
    - "Every feature listed as built maps to a REQUIREMENTS.md item marked complete; Phase-4 / pending features are described as planned, never as working"
    - "Backend and frontend run instructions match backend/main.py and frontend/package.json exactly"
    - "Tech stack versions match requirements.txt and frontend/package.json; the active LLM provider is stated as Mistral free tier, not OpenAI"
  artifacts:
    - "README.md"
  key_links:
    - "README feature claims -> REQUIREMENTS.md Traceability table (authoritative feature status)"
    - "README run commands -> backend/main.py docstring + frontend/package.json scripts"
    - "README phase counts -> STATE.md progress block + ROADMAP.md Progress table"
---

<objective>
Create a detailed, accurate `README.md` at the project root for PatchPilot.

Purpose: The repo has no root README. This one must describe what PatchPilot actually is and what is actually built and working — verified against planning docs and source, not copied from memory or the aspirational spec. The single most important accuracy trap: the spec/CLAUDE.md say the LLM provider is OpenAI, but the project pivoted to Mistral free tier in Phase 1. The README must reflect reality.

Output: `README.md` at `/Users/ayushbharadva/dev/personal/patch-pilot/README.md`.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@backend/main.py
@requirements.txt
@frontend/package.json
@backend/cognee_config.py
</context>

<source_of_truth>
Bind each README section to a file. Read the file and confirm the claim before writing it. Never write a fact you have not just read from one of these.

| README section | Verify against |
|---|---|
| What PatchPilot is / tagline / target users | PROJECT.md "What This Is", "Core Value", "Business Context" (customer = small SaaS / engineering teams) |
| Phase count + completion | STATE.md `progress` block (total_phases: 4, completed_phases: 3, total_plans: 10, completed_plans: 10, percent: 75) AND ROADMAP.md Progress table |
| Current features (built & working) | REQUIREMENTS.md checkboxes + Traceability table; cross-check PROJECT.md "Validated" section. `[x]` = built; `[ ]` = pending |
| How to run — backend | backend/main.py module docstring (uvicorn run line: `uvicorn main:app --workers 1 --host 127.0.0.1`), requirements.txt, backend/cognee_config.py (env vars) |
| How to run — frontend | frontend/package.json `scripts` (`npm run dev` = `next dev`), CORS origin in backend/main.py (`http://localhost:3000`) |
| Tech stack + versions | requirements.txt (backend) + frontend/package.json (frontend). Active LLM/embedding provider from PROJECT.md Key Decisions (Mistral pivot) + STATE.md Decisions |
| Env config | backend/cognee_config.py for the real env var names; instruct users to copy `.env.example` -> `.env`. Do NOT paste real secret values (see threat_model) |
| License / disclosure | `ls LICENSE*` at root to check if a license file exists; PROJECT.md Constraints (AI-assistant usage must be declared; hackathon submission — WeMakeDevs x Cognee) |
</source_of_truth>

<aspirational_traps>
These are the specific ways a from-memory README would be WRONG. The executor MUST NOT commit any of these:

1. LLM provider: the ACTIVE provider is Mistral free tier (`mistral/mistral-small-latest`, `mistral/mistral-embed`). The OpenAI gpt-4o-mini in CLAUDE.md/spec was superseded in Phase 1 (Gemini tried first, hit quota; Mistral chosen). State Mistral as current; you may note OpenAI as the original spec default if useful, but not as the active provider.
2. Memory Graph view (GRAPH-01) is NOT built — it is Phase 4, pending. `react-force-graph` is not even in frontend/package.json. List it as planned, not working.
3. Demo reset (DEMO-01) and the deployed 120s-loop verification (DEMO-03) are NOT built — Phase 4. Zero-cost reseed exists only as `scripts/snapshot_memory.py` tar snapshot + `seed/seed_cli.py`, not prune-based reset.
4. Feedback: Accept/Dismiss + `improve()` reinforcement IS wired (FEEDBACK-01 partial), but FEEDBACK-02's visible pre/post-Accept reorder is NOT demonstrable with the current seed corpus. REQUIREMENTS.md keeps both `[ ]`. Describe honestly: reinforcement is wired; the visible ranking change is a known gap.
5. Not deployed — there is no live Render URL yet (Phase 4). Do not claim a hosted demo link.
6. Stretch features (STRETCH-01..04: confidence score, health dashboard, timeline, richer graph) are all pending — do not list as done.
</aspirational_traps>

<tasks>

<task type="auto">
  <name>Task 1: Verify facts against source-of-truth, then write root README.md</name>
  <files>README.md</files>
  <action>
    First VERIFY, then write. Read every file in the source_of_truth table above and confirm each fact before it goes in the README — do not copy any claim from memory or from CLAUDE.md's aspirational spec. Run `ls LICENSE*` at the repo root to determine whether a license file exists.

    Then create `/Users/ayushbharadva/dev/personal/patch-pilot/README.md` with these sections, using ONLY verified facts:

    - Title + tagline ("every bug remembers its history") and a 2-4 sentence description of what PatchPilot is and its core value (the search -> drift -> forget -> re-search loop), sourced from PROJECT.md.
    - Target users: small SaaS / engineering teams drowning in scattered incident knowledge (PROJECT.md Business Context).
    - Project status: "3 of 4 phases complete (75%)" with a short table listing Phase 1 Foundation (done), Phase 2 Core Recall (done), Phase 3 Drift + Forget (done), Phase 4 Demo Loop + Stretch (not started). Source from STATE.md progress block and ROADMAP.md.
    - Current features (built & working): the diagnosis card (fused GRAPH_COMPLETION + CHUNKS recall), multi-source ingest + Load Sample, per-release workaround datasets, drift detection with health badges (green Stable / yellow Aging / red Drifting) and explainable reason strings, surgical guarded forget with auto re-search proof, persistence + health check. Map each to its REQUIREMENTS.md ID and only include `[x]` items. Honestly note the two caveats from aspirational_traps items 4 (feedback reinforcement wired but visible reorder not demonstrable) — keep this factual, not marketing.
    - Roadmap / not-yet-built: Memory Graph view, demo reset, deployed 120s-loop verification, and stretch features — clearly labelled Phase 4 / planned.
    - Tech stack: backend (Python 3.12, FastAPI 0.138.2, Cognee 1.2.2 self-hosted with Kuzu + LanceDB + SQLite, uvicorn, Mistral free-tier LLM + embeddings) and frontend (Next.js 16.2.10 App Router, React 19.2.4, TanStack React Query, Tailwind 4, shadcn/radix-ui, sonner). Pull exact versions from requirements.txt and frontend/package.json.
    - How to run: a Backend subsection (create/activate venv, `pip install -r requirements.txt`, copy `.env.example` to `.env` and set the Mistral API key per backend/cognee_config.py env vars, then the uvicorn command from backend/main.py's docstring `uvicorn main:app --workers 1 --host 127.0.0.1` run from the `backend/` dir) and a Frontend subsection (`cd frontend`, `npm install`, `npm run dev`, opens on http://localhost:3000 which is the only CORS-allowed origin). Mention memory persists to `.patchpilot_memory/`.
    - Architecture one-liner: Next.js (App Router) -> HTTP -> FastAPI -> Cognee (self-hosted graph + vector + sqlite).
    - License & AI disclosure: state the actual license situation from `ls LICENSE*` (if no LICENSE file, say so plainly — do NOT invent an MIT/Apache license); note this is a hackathon submission (WeMakeDevs x Cognee) and that AI-assistant usage is disclosed per house rule (PROJECT.md Constraints).

    Write directive prose and real commands the user can copy; do not fabricate any endpoint, flag, version, or feature not confirmed in a source file.
  </action>
  <verify>
    <automated>test -f /Users/ayushbharadva/dev/personal/patch-pilot/README.md && grep -Eqi '(3 of 4|3/4|75%)' /Users/ayushbharadva/dev/personal/patch-pilot/README.md && grep -qi 'mistral' /Users/ayushbharadva/dev/personal/patch-pilot/README.md && grep -qi 'cognee' /Users/ayushbharadva/dev/personal/patch-pilot/README.md && grep -qi 'uvicorn main:app' /Users/ayushbharadva/dev/personal/patch-pilot/README.md && grep -qi 'npm run dev' /Users/ayushbharadva/dev/personal/patch-pilot/README.md</automated>
  </verify>
  <done>README.md exists at root with all listed sections; phase count says 3 of 4 / 75%; active provider is Mistral; backend uvicorn command and frontend npm run dev are present and match source files.</done>
</task>

<task type="auto">
  <name>Task 2: Accuracy audit — cross-check every README claim against the codebase and correct discrepancies</name>
  <files>README.md</files>
  <action>
    Re-read README.md and audit it line-by-line against the source_of_truth table and the aspirational_traps list. For each factual claim (phase counts, every feature's built/pending status, each version number, each run command, the LLM provider, the license statement), confirm it against its source file. Correct any claim that drifted from reality.

    Specifically confirm none of the six aspirational_traps slipped in: no OpenAI-as-active-provider, no Memory Graph view / demo reset / deployed-loop / stretch features described as working, no fabricated live demo URL, and the feedback caveat is stated honestly. Confirm versions match requirements.txt and frontend/package.json exactly, and that the backend run command matches backend/main.py's docstring. Apply edits in place; if everything is already accurate, make no changes.
  </action>
  <verify>
    <automated>grep -qi 'cognee==1.2.2\|cognee 1.2.2' /Users/ayushbharadva/dev/personal/patch-pilot/README.md && grep -qi 'fastapi' /Users/ayushbharadva/dev/personal/patch-pilot/README.md && grep -Eqi 'next(\.js)? *16' /Users/ayushbharadva/dev/personal/patch-pilot/README.md && grep -qi 'phase 4' /Users/ayushbharadva/dev/personal/patch-pilot/README.md</automated>
    <human-check>Read README.md top to bottom. Confirm every phase count, feature built/pending status, run command, version, and the LLM provider matches the actual codebase — no unbuilt feature is presented as working, and no secret values from .env appear.</human-check>
  </verify>
  <done>Every README claim traces to a source file; all six aspirational traps are absent; versions and run commands match source exactly.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repo -> public README | README is committed and may be published; must not leak secrets |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-wbo-01 | Information Disclosure | README.md env/setup section | medium | mitigate | Reference `.env.example` placeholder names only (from backend/cognee_config.py); never paste real API-key values from `.env`. The executor is denied read access to `.env`, which structurally prevents leakage. |

Docs-only task: no package installs, no runtime code, no new network surface — no further STRIDE categories apply.
</threat_model>

<verification>
- `README.md` exists at repo root.
- Phase status reads 3 of 4 complete / 75%, matching STATE.md and ROADMAP.md.
- Feature list only includes REQUIREMENTS.md `[x]` items as working; Phase-4 / stretch items labelled planned.
- Backend (`uvicorn main:app --workers 1 --host 127.0.0.1`) and frontend (`npm run dev`) commands present and correct.
- Versions match requirements.txt + frontend/package.json; active LLM provider stated as Mistral.
- No secret values from `.env` appear in the file.
</verification>

<success_criteria>
A new reader can understand what PatchPilot is, see accurately what is built (3 of 4 phases, features as of Phase 3), and run both backend and frontend from the README alone — with zero aspirational or unverified claims.
</success_criteria>

<output>
Modify `/Users/ayushbharadva/dev/personal/patch-pilot/README.md`. No SUMMARY file required for this quick task; report completion to the orchestrator.
</output>
