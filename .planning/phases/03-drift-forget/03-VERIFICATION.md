---
phase: 03-drift-forget
verified: 2026-07-02T16:40:00Z
status: human_needed
score: 8/11 must-haves verified
behavior_unverified: 3 # present + wired in code, but the runtime state transition is not exercised by any automated test — see behavior_unverified_items
overrides_applied: 0
mvp_mode_note: "ROADMAP.md declares mode: mvp for Phase 3, but the phase-level goal text ('Uploading a release exposes stale workarounds...') does not pass the User Story format guard (gsd_run query user-story.validate --pick valid returned false — missing 'As a ___, I want to ___, so that ___.' structure). Per the MVP verification rules this would normally block verification entirely. Given the parent request explicitly commissioned goal-backward verification of this phase and the ROADMAP already supplies four well-formed, testable Success Criteria, standard (non-MVP-narrowed) goal-backward verification was performed against those Success Criteria instead of producing a User Flow Coverage table. Recommend running `/gsd mvp-phase 3` to backfill a compliant User Story goal for future re-verification passes, but this is a process gap, not a phase-goal failure."
behavior_unverified_items:
  - truth: "Clicking Forget on a 🔴 dataset surgically removes it via cognee.forget(dataset=...) and the incidents dataset remains intact"
    test: "With backend + frontend running and the corpus restored, click Forget on the workarounds_v1_8 row, click Confirm forget?, and observe the network call / server log for a successful cognee.forget(dataset='workarounds_v1_8') call, then re-list datasets and confirm workarounds_v1_8 is gone while incidents is still present with doc_count > 0."
    expected: "workarounds_v1_8 is absent from a fresh GET /datasets response; incidents is still present and search against it still returns results."
    why_human: "No automated test invokes the real cognee.forget() lifecycle verb end-to-end (unit tests only cover the _is_forgettable_workaround guard's True/False decisions, never the actual removal call) and the verifier must not mutate live memory state as a side effect of an automated check."
  - truth: "After a successful forget, the dataset's row disappears from the list and — if a search is on screen — the same query auto-re-runs so the change is visible"
    test: "Search 'double-charged', then Forget → Confirm forget? on workarounds_v1_8, and watch the dataset list and diagnosis card in the browser."
    expected: "The workarounds_v1_8 row vanishes from the Datasets card within one refetch cycle, a 'Forgotten — updating results…' toast appears, and the diagnosis card automatically re-renders with a freshly re-run search (no manual re-search needed)."
    why_human: "This is a client-side render + refetch + callback-triggered mutation sequence (React Query invalidation → refetch → conditional JSX removal → onForgotten → handleReSearch) that only a running browser session can confirm; no component/e2e test exercises it."
  - truth: "Re-searching the same query after forget returns the new correct fix, not the old stale workaround — the before/after flip is visible and unambiguous in the browser"
    test: "Before forgetting workarounds_v1_8, search 'double-charged' and note the evidence panel includes a workarounds_v1_8 chunk. After Forget → Confirm forget? and the auto re-search completes, inspect the new diagnosis card and evidence panel."
    expected: "The re-searched evidence panel no longer contains any workarounds_v1_8 chunk, the root cause still names the workarounds_v1_9 idempotency_guard fix, and incidents evidence still appears — the flip is visually obvious without reading logs."
    why_human: "Full before/after visual proof requires a live browser session comparing two rendered diagnosis cards; this is the phase's core value proposition and both 03-01-SUMMARY.md and 03-02-SUMMARY.md explicitly flag it as human_judgment: true, never exercised live during execution."
human_verification:
  - test: "Click Forget on workarounds_v1_8 (🔴 row), confirm via 'Confirm forget?', and verify the row disappears while incidents remains listed with a non-zero doc count."
    expected: "workarounds_v1_8 is surgically removed; incidents is untouched (FORGET-01, ROADMAP SC3)."
    why_human: "Requires a live running backend + browser session to observe the actual cognee.forget() effect; the verifier must not mutate live memory as a side effect of an automated check."
  - test: "With a search on screen, Forget the drifting dataset and observe the auto re-search."
    expected: "Toast fires, row disappears, last query auto-re-runs without a manual refresh (FORGET-02, ROADMAP SC3/SC4)."
    why_human: "Client-side render/refetch/callback sequence only observable in a running browser."
  - test: "Search 'double-charged' before and after forgetting workarounds_v1_8; compare the two diagnosis cards and evidence panels."
    expected: "Before: root cause and evidence may reference the old workaround. After: root cause names the workarounds_v1_9 fix, evidence panel excludes workarounds_v1_8 chunks, incidents evidence still present — the before/after flip is visually unambiguous (FORGET-02, ROADMAP SC4, PatchPilot's core value loop)."
    why_human: "This is the phase's headline proof and is inherently a visual/browser confirmation; both plan SUMMARYs explicitly defer it to /gsd-verify-work."
---

# Phase 3: Drift + Forget Verification Report

**Phase Goal:** Uploading a release exposes stale workarounds with human-readable drift explanations; the engineer can forget a drifting workaround with one click; re-searching proves memory changed.
**Verified:** 2026-07-02T16:40:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Both `workarounds_v1_8` and `workarounds_v1_9` are live in the restored demo corpus | ✓ VERIFIED | Live `cognee.datasets.list_datasets()` call run during this verification returned exactly `['incidents', 'workarounds_v1_8', 'workarounds_v1_9']` — matches 03-01-SUMMARY.md's claim, re-confirmed independently. |
| 2 | Every dataset row shows a health badge with a text label (🟢 Stable / 🟡 Aging / 🔴 Drifting) | ✓ VERIFIED | `frontend/components/DatasetList.tsx` `DRIFT_BADGE` map renders a colored dot (`bg-drift-*`) plus the literal text label for every row; `frontend/app/globals.css` registers `--color-drift-stable/-aging/-drifting` inside `@theme inline` (lines 61-63) so the utilities actually generate. `npx tsc --noEmit` passes with zero errors. |
| 3 | `workarounds_v1_8` is classified drifting (🔴) while `workarounds_v1_9` (highest live version) is stable (🟢) | ✓ VERIFIED | Ran `backend.drift.compute_drift_states(['incidents','workarounds_v1_8','workarounds_v1_9'])` live during this verification (pure function, no LLM cost) → `{'incidents': 'stable', 'workarounds_v1_8': 'drifting', 'workarounds_v1_9': 'stable'}`. Also covered by 5 passing unit tests in `backend/tests/test_drift_forget.py`. |
| 4 | Each 🔴 row shows a human-readable reason sentence (or the deterministic fallback), never a raw score or a blank caption | ✓ VERIFIED | `backend/drift.py::generate_drift_reason` calls `GRAPH_COMPLETION` against only the newest dataset with a one-sentence prompt, normalizes via `_result_text` (list-vs-str safe, fixed a documented list-repr bug), wraps in a 10s timeout, and falls back to the fixed string `"A newer release supersedes this workaround."` on any exception — never blank, never raw score/exception text. 03-01-SUMMARY.md documents an actual live-generated sentence from this exact code path. Not re-triggered here to avoid incurring additional LLM spend against the project's $10 cap. |
| 5 | Search stops returning the 🔴 dataset as the primary root-cause answer, while it stays searchable for evidence | ✓ VERIFIED | `backend/search.py::_pick_primary_result` filters out any candidate whose dataset is `"drifting"` before the version tie-break sort; `search()` computes `drift_states` from the live dataset list and passes it in. Unit test `test_pick_primary_result_excludes_drifting_even_if_highest_version` passes; `_active_search_datasets()` still includes drifting datasets for the CHUNKS evidence call (never excluded there). |
| 6 | Clicking Forget on a 🔴 dataset surgically removes it via `forget(dataset="workarounds_v{N}")` | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `backend/forget.py::forget_dataset` calls `await cognee.forget(dataset=request.dataset)` only after `_is_forgettable_workaround` passes — code is correct and unit-tested for the guard decision, but no automated test invokes the real `forget()` call and confirms the dataset is actually gone afterward. Routed to human verification (see below); not counted toward the verified score. |
| 7 | The `incidents` dataset (and `healthcheck`/`canary` throwaways) can never be forgotten through `POST /forget`, even though `cognee.forget()` would technically permit it | ✓ VERIFIED | `_is_forgettable_workaround` returns `False` for `incidents`/`healthcheck`/`canary` before any Cognee call — directly unit-tested (`test_is_forgettable_workaround_rejects_incidents`, `test_is_forgettable_workaround_rejects_healthcheck_and_canary`). All 15 tests in `backend/tests/test_drift_forget.py` pass. |
| 8 | After a successful forget, the dataset's row disappears from the list and — if a search is on screen — the same query auto-re-runs so the change is visible | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Code wiring is present and correct: `ForgetButton`'s `handleForget` invalidates `DATASETS_QUERY_KEY` and calls `onForgotten?.()`; `app/page.tsx` wires `onForgotten={() => void handleReSearch()}` into `<DatasetList />`. But this is a render+refetch+callback state transition no automated test exercises. Routed to human verification. |
| 9 | Forget uses a two-step inline confirm (Forget → Confirm forget? / Cancel), no modal, before the destructive call | ✓ VERIFIED | `ForgetButton` in `frontend/components/DatasetList.tsx` gates rendering on local `confirming` state: default renders `Forget`, `confirming=true` swaps in `Confirm forget?` + `Cancel` inline (no modal component imported anywhere in the file) — statically verifiable from the deterministic JSX branch, `grep -c "Confirm forget?"` = 1. |
| 10 | A forged/unknown dataset name is rejected with a short human message, never a raw `AttributeError` | ✓ VERIFIED | `_is_forgettable_workaround` checks the `_WORKAROUNDS_VERSION_RE` regex BEFORE any Cognee call, so a forged name never reaches `cognee.forget()` (where an unknown name would raise `AttributeError` per RESEARCH Pitfall 2). Directly unit-tested (`test_is_forgettable_workaround_rejects_forged_name`, `test_is_forgettable_workaround_rejects_absent_versioned_name`). The route's outer `try/except Exception` returns the fixed message `"Could not forget dataset. Please try again."` as defense-in-depth. |
| 11 | Re-searching the same query after forget returns the new correct fix — the before/after flip is visible and unambiguous in the browser (ROADMAP SC4) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | All supporting code paths are individually correct and unit/live-verified in isolation (drift exclusion in `/search`, forget guard, auto-re-search wiring), but the composite before/after visual proof — PatchPilot's stated core value loop — has not been exercised end-to-end in a running browser by anyone, including the executor (both 03-01-SUMMARY.md and 03-02-SUMMARY.md explicitly flag this with `human_judgment: true`). Routed to human verification. |

**Score:** 8/11 truths verified (3 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/drift.py` | `compute_drift_states`, `generate_drift_reason`, `get_or_generate_reason`, in-process cache | ✓ VERIFIED | All symbols present, substantive, correctly implements precedence rules (D-01/D-02/D-05), imports shared regex/sort-key from `backend.search` (not duplicated). |
| `backend/search.py` | `_pick_primary_result` extended with `drift_states`; `drift_state` in `/search` response | ✓ VERIFIED | Confirmed by direct read — filter applied before tie-break sort; `drift_state` key added to ok response. |
| `backend/datasets_router.py` | `GET /datasets` returns `drift_state` + `drift_reason` per row | ✓ VERIFIED | Confirmed by direct read — computes shared classifier once, resolves reason only for drifting rows, per-row `try/except` isolation preserved. |
| `frontend/lib/api.ts` | `DatasetInfo.drift_state/drift_reason`, `SearchResponseOk.drift_state`, `ForgetResponse`, `forgetDataset` | ✓ VERIFIED | All types and the `forgetDataset` wrapper present, mirror `acceptFeedback`'s try/catch/status-branch shape exactly. |
| `frontend/components/DatasetList.tsx` | Drift badge (dot + text label), reason caption, `ForgetButton`, `onForgotten` prop | ✓ VERIFIED | All present and wired — confirmed by direct read, not just grep. |
| `frontend/components/DiagnosisCard.tsx` | `VersionTagBadge` `healthState` wired from search response | ✓ VERIFIED | `healthState={response.drift_state ?? undefined}` at the call site; `data-[health-state=*]` CSS variants actually color the badge (a gap the executor caught and fixed mid-phase, per its own deviation log). |
| `frontend/app/globals.css` | Drift color vars registered inside `@theme inline` | ✓ VERIFIED | Lines 61-63 register `--color-drift-stable/-aging/-drifting` inside the `@theme inline` block; light/dark hex values unchanged at lines 145-153. |
| `backend/forget.py` | `POST /forget`, `ForgetRequest`, `_is_forgettable_workaround` guard | ✓ VERIFIED | Full implementation matches `feedback.py`'s validate-before-lifecycle-verb pattern; D-24 message constants match UI-SPEC verbatim. |
| `backend/main.py` | `forget_router` registered | ✓ VERIFIED | `grep -c forget_router backend/main.py` = 2 (import + `include_router`); no new CORS config added, per plan. |
| `frontend/app/page.tsx` | `onForgotten` wired to `handleReSearch` | ✓ VERIFIED | `<DatasetList onForgotten={() => void handleReSearch()} />` present. |
| `backend/tests/test_drift_forget.py` | Unit tests for drift classification, exclusion, forget guard, route registration | ✓ VERIFIED | 15 tests, all pass (`.venv/bin/python -m pytest backend/tests/test_drift_forget.py -q` → `15 passed`). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `frontend/components/DatasetList.tsx` | `backend/datasets_router.py` | `listDatasets()` GET /datasets reads `drift_state`/`drift_reason` | ✓ WIRED | Confirmed by direct read of both files. |
| `backend/search.py` | `backend/drift.py` | `_pick_primary_result` consumes `compute_drift_states()` output | ✓ WIRED | Lazy import inside `search()` to avoid circular import — documented and correct. |
| `backend/datasets_router.py` | `backend/drift.py` | `GET /datasets` calls `compute_drift_states` + `get_or_generate_reason` | ✓ WIRED | Module-top import (no circularity issue here since `datasets_router.py` doesn't get imported by `drift.py`). |
| `frontend/components/DatasetList.tsx` | `backend/forget.py` | `forgetDataset()` POST /forget → `cognee.forget(dataset=...)` | ✓ WIRED | Confirmed by direct read. |
| `frontend/components/DatasetList.tsx` | `frontend/app/page.tsx` | `onForgotten` callback → `handleReSearch` re-runs last query | ✓ WIRED | Confirmed by direct read of `page.tsx` line 84. |
| `backend/main.py` | `backend/forget.py` | `app.include_router(forget_router)` | ✓ WIRED | Confirmed. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `DatasetList.tsx` rows | `dataset.drift_state`/`drift_reason` | `GET /datasets` → `compute_drift_states()` + `get_or_generate_reason()` (live Cognee-backed) | Yes — confirmed live during this verification (`compute_drift_states` on the real live dataset list returned the expected non-trivial classification, not a static/empty stub) | ✓ FLOWING |
| `DiagnosisCard.tsx` `VersionTagBadge` | `response.drift_state` | `POST /search` → `drift_states.get(primary_dataset_name)` | Yes — same shared classifier, fed from the live active-datasets list | ✓ FLOWING |
| `ForgetButton` | `dataset.drift_state === "drifting"` gate | Same `GET /datasets` source as above | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Live corpus has both workaround versions | `cognee.datasets.list_datasets()` | `['incidents', 'workarounds_v1_8', 'workarounds_v1_9']` | ✓ PASS |
| Drift classifier produces the expected Stripe-arc mapping against live data (no LLM cost — pure function) | `compute_drift_states(['incidents','workarounds_v1_8','workarounds_v1_9'])` | `{'incidents': 'stable', 'workarounds_v1_8': 'drifting', 'workarounds_v1_9': 'stable'}` | ✓ PASS |
| Backend unit test suite for this phase | `.venv/bin/python -m pytest backend/tests/test_drift_forget.py -q` | `15 passed` | ✓ PASS |
| Frontend typecheck | `cd frontend && npx tsc --noEmit` | exit 0, no errors | ✓ PASS |
| Live `POST /forget` call against `workarounds_v1_8` and re-list to confirm removal | — | not run | ? SKIP — would mutate live memory state as a side effect of an automated verification check; deferred to human verification per the destructive-action constraint (Step 7b: "Do not modify state") |
| Live `POST /search` "double-charged" before/after forget comparison in browser | — | not run | ? SKIP — requires a running server + browser session; deferred to human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DRIFT-01 | 03-01 | Every memory carries a health state — 🟢/🟡/🔴 | ✓ SATISFIED | Truths 2, 3 verified; `compute_drift_states` + `DatasetList.tsx`/`DiagnosisCard.tsx` badge rendering. |
| DRIFT-02 | 03-01 | On release upload, drift detection flags affected older memories with a visible, explainable reason string | ✓ SATISFIED | Truth 4 verified; `generate_drift_reason` + `drift_reason` field on drifting rows. |
| DRIFT-03 | 03-01 | Drift recommends which workarounds to forget | ✓ SATISFIED | Truth 5, artifact `ForgetButton` gated on `drift_state === "drifting"` (row identifies the forget target). |
| FORGET-01 | 03-02 | User can forget a flagged workaround via surgical `forget(dataset="workarounds_v{N}")` | ✓ SATISFIED (code); ⚠️ live removal unexercised | Truths 7, 9, 10 verified at code/unit-test level; truth 6 (the actual live removal) is `PRESENT_BEHAVIOR_UNVERIFIED` — see human verification. |
| FORGET-02 | 03-02 | Re-searching the same bug after forget returns the new correct fix (before/after proof) | ⚠️ Code wiring verified; live before/after proof unexercised | Truths 8, 11 are `PRESENT_BEHAVIOR_UNVERIFIED` — routed to human verification, matching both plan SUMMARYs' own `human_judgment: true` flags. |

No orphaned requirements found — REQUIREMENTS.md's Phase 3 mapping (DRIFT-01, DRIFT-02, DRIFT-03, FORGET-01, FORGET-02) exactly matches the union of `requirements:` declared across both PLAN frontmatters.

### Anti-Patterns Found

None. Scanned every file modified in this phase (`backend/drift.py`, `backend/forget.py`, `backend/search.py`, `backend/datasets_router.py`, `backend/main.py`, `backend/tests/test_drift_forget.py`, `frontend/lib/api.ts`, `frontend/components/DatasetList.tsx`, `frontend/components/DiagnosisCard.tsx`, `frontend/app/globals.css`, `frontend/app/page.tsx`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/stub-shaped empty returns/hardcoded-empty props. The only match was the phrase "Loading placeholder" in a `DiagnosisCard.tsx` doc comment describing the pre-existing skeleton-loader pattern (D-20) — a legitimate UI pattern, not a stub indicator.

### Human Verification Required

### 1. Live surgical forget of a drifting dataset

**Test:** With backend (`uvicorn --workers 1`) and frontend (`next dev`) running against the restored corpus, click **Forget** on the `workarounds_v1_8` 🔴 row, then **Confirm forget?**.
**Expected:** `workarounds_v1_8` is gone from a fresh `GET /datasets`; `incidents` is untouched and still has a non-zero doc count.
**Why human:** No automated test invokes the real `cognee.forget()` call end-to-end; the verifier must not mutate live memory as a side effect of an automated check (FORGET-01).

### 2. Row removal + auto re-search after forget

**Test:** With a search already on screen, forget the drifting dataset and watch the Datasets card and diagnosis card.
**Expected:** The row disappears, a `Forgotten — updating results…` toast appears, and the last query auto-re-runs without a manual refresh.
**Why human:** Client-side render/refetch/callback sequence only observable in a running browser (FORGET-02).

### 3. Before/after search proof (the phase's core value loop)

**Test:** Search `double-charged` before forgetting `workarounds_v1_8` (note the evidence panel includes a `workarounds_v1_8` chunk), then Forget → Confirm forget?, then compare the auto-re-searched diagnosis card and evidence panel.
**Expected:** The re-searched evidence panel no longer contains any `workarounds_v1_8` chunk, the root cause names the `workarounds_v1_9` idempotency fix, and `incidents` evidence is still present — visually unambiguous before/after flip, completing in well under 120 seconds.
**Why human:** This is PatchPilot's headline demo proof and is inherently visual; both `03-01-SUMMARY.md` and `03-02-SUMMARY.md` explicitly flag it `human_judgment: true` and note it was never exercised live during execution.

### Gaps Summary

No blocking gaps. Every artifact exists, is substantive, and is correctly wired; all 15 backend unit tests pass; the frontend typechecks cleanly; the live corpus and the pure `compute_drift_states` classifier were independently re-verified during this pass and match the SUMMARY claims exactly. The three items marked `PRESENT_BEHAVIOR_UNVERIFIED` are not code defects — they are the composite live/browser proof of the destructive forget→re-search loop that neither plan's own executor exercised end-to-end (both SUMMARYs self-report this with `human_judgment: true`), and which this verifier deliberately did not trigger itself in order to avoid (a) mutating live demo memory state as a side effect of an automated check and (b) incurring additional LLM spend against the project's $10 cap. A human should run the three checks above — ideally timed, to confirm ROADMAP's implicit DEMO-03 "<120s" expectation — before the final demo rehearsal.

---

*Verified: 2026-07-02T16:40:00Z*
*Verifier: Claude (gsd-verifier)*
