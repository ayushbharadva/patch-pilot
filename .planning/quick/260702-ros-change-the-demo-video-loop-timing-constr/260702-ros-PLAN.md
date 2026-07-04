---
phase: quick-260702-ros
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/PROJECT.md
  - .planning/REQUIREMENTS.md
  - .planning/STATE.md
  - .planning/ROADMAP.md
  - .claude/CLAUDE.md
  - .planning/research/SUMMARY.md
  - .planning/research/PITFALLS.md
  - .planning/research/ARCHITECTURE.md
  - .planning/research/FEATURES.md
  - .planning/phases/03-drift-forget/03-CONTEXT.md
  - .planning/phases/02-core-recall/02-CONTEXT.md
  - .planning/phases/02-core-recall/02-DISCUSSION-LOG.md
  - .planning/phases/02-core-recall/02-RESEARCH.md
  - .planning/phases/02-core-recall/02-03-SUMMARY.md
autonomous: true
requirements: [DEMO-03]

must_haves:
  truths:
    - "No planning doc (outside the /quick/ task dir) states the search->drift->forget->re-search demo loop budget as 60 seconds; every such reference reads 120 seconds."
    - "The canonical Core Value statement (PROJECT.md, .claude/CLAUDE.md, REQUIREMENTS.md, STATE.md) reads 'under 120 seconds'."
    - "DEMO-03 in REQUIREMENTS.md reads 'completes in under 120 seconds'."
    - "ROADMAP.md Phase 4 title, goal, and success criterion read 120 seconds."
    - "Unrelated timing figures are untouched: PLAT-01 '< 30s', cognify timeout=120 / '10+ minutes' / '15 minutes' windows, '>2 minutes' / 'several minutes' hang timings, and the $10 budget cap."
  artifacts:
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .claude/CLAUDE.md
  key_links:
    - "Core Value string is duplicated verbatim across PROJECT.md, .claude/CLAUDE.md, REQUIREMENTS.md, STATE.md, and quoted in 03-CONTEXT.md — all copies must agree on 120 seconds."
---

<objective>
Update the search -> drift-detected -> forget -> re-search demo/loop timing constraint from 60 seconds to 120 seconds across every planning document that states it, keeping the repo internally consistent (nothing should still claim the demo budget is 60 seconds).

Purpose: The demo-loop budget is being widened to 120 seconds. This value is the project's single most-cited constraint (Core Value, DEMO-03, Phase 4 goal), duplicated verbatim across many docs; leaving stragglers at 60s creates contradictory source-of-truth.
Output: 14 planning docs edited; a consistency grep gate proving zero demo-loop 60s references remain and all unrelated timing figures are untouched.
</objective>

## Replacement rules (apply ONLY to demo-loop references listed in the Occurrence Map)

| Existing form | New form |
|---|---|
| under 60 seconds | under 120 seconds |
| 60 seconds | 120 seconds |
| 60-second / 60-Second | 120-second / 120-Second |
| 60s (e.g. "60s demo", "< 60s") | 120s |
| < 60 seconds / <60 seconds | < 120 seconds / <120 seconds |
| < 60 s | < 120 s |

Word-form ("one minute" / "a minute") does not occur in these docs, so the "2 minutes" variant is not needed. If an unexpected word-form demo reference is found, use "2 minutes".

## Occurrence Map (ground truth from grep — 14 files)

**CHANGE these (demo-loop constraint):**

| File | Line(s) | Context |
|---|---|---|
| .planning/PROJECT.md | 11 | Core Value "…under 60 seconds" |
| .planning/PROJECT.md | 19 | "the 60-second before/after demo landing" |
| .claude/CLAUDE.md | 11 | Core Value "…under 60 seconds" |
| .planning/REQUIREMENTS.md | 4 | Core Value "…under 60 seconds" |
| .planning/REQUIREMENTS.md | 52 | DEMO-03 "…completes in under 60 seconds" |
| .planning/STATE.md | 26 | Core value "…under 60 seconds" |
| .planning/ROADMAP.md | 5 | "the full 60-second demo loop" |
| .planning/ROADMAP.md | 19 | "Phase 4: Demo Loop + Stretch - 60-second loop verified…" |
| .planning/ROADMAP.md | 100 | Phase 4 Goal "…runs in under 60 seconds…" |
| .planning/ROADMAP.md | 106 | Phase 4 success criterion "…finishes in under 60 seconds…" |
| .planning/research/SUMMARY.md | 10, 37, 45, 89, 138, 139, 142 | "under 60 seconds", "60-second demo critical path", "beyond the 60s demo path", "<60 seconds", "< 60 seconds", "< 60s" |
| .planning/research/PITFALLS.md | 173, 278, 306 | "under 60 seconds", "Demo runs in 60 seconds"/"60 seconds on deployed", "< 60 seconds before any stretch" |
| .planning/research/ARCHITECTURE.md | 334, 512 | "< 60 seconds end-to-end", "< 60 s end-to-end" |
| .planning/research/FEATURES.md | 33, 89, 100, 147 | "before/after in 60 seconds", "the 60-second demo fails", "### The 60-Second Demo Critical Path", "not in 60s demo" |
| .planning/phases/03-drift-forget/03-CONTEXT.md | 9 | quotes Core Value "…visibly, in under 60 seconds." |
| .planning/phases/02-core-recall/02-CONTEXT.md | 43 | "the timed 60s demo" |
| .planning/phases/02-core-recall/02-DISCUSSION-LOG.md | 92 | "the timed 60s demo" |
| .planning/phases/02-core-recall/02-RESEARCH.md | 89 | "within the 60-second demo window" |
| .planning/phases/02-core-recall/02-03-SUMMARY.md | 191, 224 | "Core Value's 60s demo budget", "PROJECT.md's Core Value (60-second demo budget)" / "(60-second demo budget)" |

**DO NOT CHANGE these (unrelated figures — false-positive guardrails):**

| File | Line | Figure | Why it stays |
|---|---|---|---|
| .planning/REQUIREMENTS.md | 56 | PLAT-01 "< 30s" | health smoke-test budget, not the demo loop |
| .planning/research/SUMMARY.md | 83 | "must return < 30s" | /health/cognee smoke test |
| .planning/research/PITFALLS.md | 18 | "10+ minutes" | instructor retry window |
| .planning/research/PITFALLS.md | 27 | "timeout=120" | cognify() asyncio timeout (already 120; unrelated) |
| .planning/research/PITFALLS.md | 123 | "15 minutes" | Render idle-restart window |
| .planning/phases/02-core-recall/02-03-SUMMARY.md | 193, 199 | "several minutes", ">2 minutes" | cognify hang timings |
| (multiple) | — | "$10" | OpenAI budget cap |

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update canonical Core Value + Roadmap docs (60s -> 120s)</name>
  <files>.planning/PROJECT.md, .claude/CLAUDE.md, .planning/REQUIREMENTS.md, .planning/STATE.md, .planning/ROADMAP.md</files>
  <action>Apply the Replacement rules to the demo-loop references in these five source-of-truth files, per the Occurrence Map. PROJECT.md: the Core Value line and the "60-second before/after demo landing" success-metric line. .claude/CLAUDE.md: the Core Value line (identical wording to PROJECT.md). REQUIREMENTS.md: the top Core Value line AND the DEMO-03 checklist item. STATE.md: the "Core value:" line in Project Reference. ROADMAP.md: the intro paragraph ("full 60-second demo loop"), the Phase 4 one-liner title, the Phase 4 Goal line, and the Phase 4 success criterion (timed-loop) line. Use exact scoped string edits (do not blanket sed the file). CRITICAL guardrail: leave REQUIREMENTS.md PLAT-01 "< 30s" and every "$10" cap exactly as-is — those are not the demo loop.</action>
  <verify>
    <automated>! grep -rniE '60[ -]?second|60-second|\b60s\b|under 60|<[ ]?60' .planning/PROJECT.md .claude/CLAUDE.md .planning/REQUIREMENTS.md .planning/STATE.md .planning/ROADMAP.md; grep -q '< 30s' .planning/REQUIREMENTS.md</automated>
  </verify>
  <done>All five files read "120 seconds"/"120-second" for the demo loop; the consistency grep returns no matches; PLAT-01 "< 30s" still present in REQUIREMENTS.md.</done>
</task>

<task type="auto">
  <name>Task 2: Update research corpus + phase context/summary docs (60s -> 120s)</name>
  <files>.planning/research/SUMMARY.md, .planning/research/PITFALLS.md, .planning/research/ARCHITECTURE.md, .planning/research/FEATURES.md, .planning/phases/03-drift-forget/03-CONTEXT.md, .planning/phases/02-core-recall/02-CONTEXT.md, .planning/phases/02-core-recall/02-DISCUSSION-LOG.md, .planning/phases/02-core-recall/02-RESEARCH.md, .planning/phases/02-core-recall/02-03-SUMMARY.md</files>
  <action>Apply the Replacement rules to every demo-loop reference in these nine files per the Occurrence Map, including the FEATURES.md section heading "### The 60-Second Demo Critical Path" and the mixed-spacing forms "< 60s" / "< 60 s". For the two historical Phase 2 files (02-03-SUMMARY.md, 02-RESEARCH.md), change only the numeric constraint token that references the Core Value ("60s demo budget" -> "120s demo budget", "60-second demo budget" -> "120-second demo budget", "60-second demo window" -> "120-second demo window") and preserve the surrounding narrative verbatim — the goal is to keep those references consistent with the now-updated Core Value, not to rewrite what happened. CRITICAL guardrails: do NOT touch cognify timing figures — research/SUMMARY.md "must return < 30s", research/PITFALLS.md "10+ minutes" / "timeout=120" / "15 minutes", and 02-03-SUMMARY.md "several minutes" / ">2 minutes". These share no "60" token so a scoped edit will not hit them; confirm you did not alter them.</action>
  <verify>
    <automated>! grep -rniE '60[ -]?second|60-second|\b60s\b|under 60|<[ ]?60|< 60 s' .planning/research/ .planning/phases/03-drift-forget/03-CONTEXT.md .planning/phases/02-core-recall/02-CONTEXT.md .planning/phases/02-core-recall/02-DISCUSSION-LOG.md .planning/phases/02-core-recall/02-RESEARCH.md .planning/phases/02-core-recall/02-03-SUMMARY.md; grep -q 'timeout=120' .planning/research/PITFALLS.md; grep -q '< 30s' .planning/research/SUMMARY.md</automated>
  </verify>
  <done>All nine files read 120s for the demo loop; consistency grep returns no matches; cognify "timeout=120" and "< 30s" health-check figures still present.</done>
</task>

<task type="auto">
  <name>Task 3: Repo-wide consistency gate + guardrail confirmation</name>
  <files>.planning/</files>
  <action>Run the repo-wide consistency gate to prove no demo-loop 60s reference survives anywhere under .planning/ or in .claude/CLAUDE.md, EXCLUDING this quick task's own directory (whose plan text legitimately describes the 60->120 change and would otherwise self-fail the gate). Then run the guardrail confirmation greps to prove the unrelated timing figures are intact. No file edits in this task — it is a pure verification gate. If the consistency gate reports any line outside /quick/, go back and fix that file, then re-run.</action>
  <verify>
    <automated>test -z "$(grep -rniE '60[ -]?second|60-second|\b60s\b|under 60|<[ ]?60|< 60 s' .planning/ .claude/CLAUDE.md | grep -v '/quick/')" && grep -q '< 30s' .planning/REQUIREMENTS.md && grep -q 'timeout=120' .planning/research/PITFALLS.md && grep -rq '\$10' .planning/PROJECT.md</automated>
  </verify>
  <done>Consistency gate returns zero demo-loop 60s references outside the /quick/ dir; PLAT-01 "< 30s", cognify "timeout=120", and the "$10" cap all still present. Repo is internally consistent at 120 seconds.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| edit tool -> planning docs | Automated text replacement risks over-broad substitution of unrelated numeric figures |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Tampering | Unrelated timing figures (PLAT-01 "< 30s", cognify "timeout=120", "10+/15 minutes", ">2 minutes", "$10") | medium | mitigate | Scoped per-string edits (no blanket sed); explicit DO-NOT-CHANGE guardrail list; Task 3 gate asserts guardrail figures still present |
| T-quick-02 | Repudiation | Self-referential grep gate | low | mitigate | Consistency gate excludes /quick/ so the plan's own descriptive text cannot silently pass/fail the gate; gate greps the rest of the tree |
</threat_model>

<verification>
- Every file in the Occurrence Map "CHANGE" set reads 120 seconds / 120-second / 120s for the demo loop.
- Repo-wide gate (Task 3) returns zero demo-loop 60s matches outside the /quick/ dir.
- Guardrail figures unchanged: PLAT-01 "< 30s", cognify "timeout=120" and minute-scale hang/retry windows, and the "$10" budget cap.
- The duplicated Core Value string now agrees across PROJECT.md, .claude/CLAUDE.md, REQUIREMENTS.md, STATE.md, and the 03-CONTEXT.md quote.
</verification>

<success_criteria>
- 14 planning docs updated from the 60-second to the 120-second demo-loop constraint.
- No planning doc (outside the /quick/ task dir) states the demo loop budget as 60 seconds.
- No unrelated timing figure or the $10 cap was altered.
</success_criteria>

<output>
Create `.planning/quick/260702-ros-change-the-demo-video-loop-timing-constr/260702-ros-SUMMARY.md` when done.
</output>
