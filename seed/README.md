# PatchPilot Seed Corpus

This directory is the **human-authored source of truth** for PatchPilot's demo memory. Cognee never authors content here — it only ingests (`add()` + `cognify()`) what these 3 Markdown documents already say, then builds the knowledge graph from them.

## Folder -> Dataset mapping (INGEST-03 / PROJECT.md D-02)

Each folder maps 1:1 to a locked Cognee dataset name (`backend/datasets.py`), which is what makes surgical `forget(dataset=...)` possible:

| Folder | Dataset | Role |
|--------|---------|------|
| `seed/incidents/` | `incidents` | Durable bug records — **survive every forget()** |
| `seed/workarounds_v1_8/` | `workarounds_v1_8` | The old custom mail worker stopgap — **the dataset that gets forgotten** |
| `seed/workarounds_v1_9/` | `workarounds_v1_9` | The v1.9 SendGrid release — **survives forget, supplies the flipped answer** |

## The before/after arc (D-01)

The demo's core loop is the Forgot Password email issue. The **reset snapshot is the PRE-RELEASE state** — `incidents` + `workarounds_v1_8` only (both 🟢); `workarounds_v1_9` is created *live* during the demo by uploading `sendgrid-release.md` as a release note (version 1.9):

1. **SEARCH** `"forgot password email not sending"` -> recall returns the incident **and** the old fix: the manual `flush_mail_queue` script (v1.8 workaround).
2. **UPLOAD** `sendgrid-release.md` (release note, version 1.9) -> Memory Drift marks the v1.8 workaround 🔴 ("v1.9 migrates to SendGrid API; the old custom mail worker and `flush_mail_queue` script are obsolete").
3. **FORGET** `workarounds_v1_8` -> the old fix's contribution to recall is surgically removed.
4. **RE-SEARCH** `"forgot password email not sending"` -> recall now returns only the new fix: the migration to the SendGrid API (v1.9).

Timed live over HTTP (scripts/time_demo_loop.py, Jul 5): the whole loop runs in **~20s**, well inside the 120s Core Value budget.

## Canonical demo query term (B-02)

Use **`"What is the fix for forgot password emails not sending?"`** (or `"forgot password email"`) as the search query for the demo. This phrase appears in the core incident and workaround docs, ensuring recall stays focused on the email story before and after the forget flip.

## The isolation rule (B-01) — revised for this corpus

The flip is *answer-level*, not vocabulary-level: what must stay isolated per dataset is **the recommendation itself**, not every mention of an artifact name.

- **v1.8 (forgotten):** the *instruction* to run `flush_mail_queue` every 30 minutes exists **only** in `seed/workarounds_v1_8/` — once that dataset is forgotten, no surviving document recommends the manual workaround.
- **v1.9 (flipped answer):** the SendGrid API migration is *recommended* **only** in `seed/workarounds_v1_9/`.
- The v1.9 release note deliberately **names** the old artifacts (`custom mail worker`, `flush_mail_queue`) in its deprecation section — that cross-reference is what lets Memory Drift generate a specific live reason ("SendGrid replaces the custom mail worker, `flush_mail_queue` is obsolete"), and it can never resurrect the old answer because it only ever describes those artifacts as removed/obsolete.
- The durable `incidents` doc shares the problem vocabulary ("forgot password email", "custom mail worker" as the root cause) but never recommends either fix.

Validated live (Jul 5): before the release upload, `/search` answers "Run `flush_mail_queue`…" from `workarounds_v1_8`; after upload + `forget(dataset="workarounds_v1_8")`, the same query answers "Use the SendGrid API…" from `workarounds_v1_9`, and the incidents dataset survives untouched (no Cognee #1023 cross-dataset leak).

## Document inventory (3 docs + this README)

| File | Dataset | Role |
|------|---------|------|
| `incidents/forgot-password-incident.md` | `incidents` | Bug report — durable, shared vocab |
| `workarounds_v1_8/mail-queue-workaround.md` | `workarounds_v1_8` | Old fix — introduces `flush_mail_queue` / custom mail worker |
| `workarounds_v1_9/sendgrid-release.md` | `workarounds_v1_9` | Release note — introduces `SendGrid API`, states v1.8 fix is obsolete |

Any seed CLI or ingestion script must add + cognify each folder into its matching dataset name from `backend/datasets.py` — never mix folders into a single dataset, or the isolation this README documents is lost.
