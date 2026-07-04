# PatchPilot Seed Corpus

This directory is the **human-authored source of truth** for PatchPilot's demo memory. Cognee never authors content here — it only ingests (`add()` + `cognify()`) what these 11 Markdown documents already say, then builds the knowledge graph from them.

## Folder -> Dataset mapping (INGEST-03 / PROJECT.md D-02)

Each folder maps 1:1 to a locked Cognee dataset name (`backend/datasets.py`), which is what makes surgical `forget(dataset=...)` possible:

| Folder | Dataset | Role |
|--------|---------|------|
| `seed/incidents/` | `incidents` | Durable bug records — **survive every forget()** |
| `seed/workarounds_v1_8/` | `workarounds_v1_8` | The old nightly-dedup stopgap — **the dataset that gets forgotten** |
| `seed/workarounds_v1_9/` | `workarounds_v1_9` | The v1.9 release fix — **survives forget, supplies the flipped answer** |

## The before/after arc (D-01)

The demo's core loop is the Stripe duplicate-charge story:

1. **SEARCH** `"customers double-charged"` -> recall returns the incident **and** the old fix: the nightly `dedup_sweeper` script (v1.8 workaround).
2. **UPLOAD** `release-v1.9.md` -> Memory Drift marks the v1.8 workaround 🔴 ("v1.9 adds an idempotency key; the nightly dedup approach is redundant").
3. **FORGET** `workarounds_v1_8` -> the old fix's contribution to recall is surgically removed.
4. **RE-SEARCH** `"customers double-charged"` -> recall now returns only the new fix: the `idempotency_guard` idempotency-key check on the Stripe webhook handler (v1.9).

## Canonical demo query term (B-02)

Use **`"customers double-charged"`** (or `"double-charged"` / `"duplicate charge"`) as the search query for the demo. This phrase appears only in the Stripe arc's documents (`seed/incidents/stripe-double-charge-*.md`, both workaround folders) and is deliberately absent from the two decoy incidents (`login-timeout-incident.md`, `api-latency-spike-incident.md`), so recall stays focused on the Stripe story before and after the forget flip.

## The isolation rule (B-01)

For the forget flip to work cleanly, the v1.8 fix's identifying artifact names must appear **only** in `workarounds_v1_8`, and the v1.9 fix's artifact names must appear **only** in `workarounds_v1_9`:

- **v1.8 (forgotten):** `dedup_sweeper` (script) / `nightly-dedup-cron` (scheduled component) — appears exclusively in `seed/workarounds_v1_8/`.
- **v1.9 (flipped answer):** `idempotency_guard` (idempotency-key check on the webhook handler) — appears exclusively in `seed/workarounds_v1_9/`.

Neither the durable `incidents` docs nor the opposite workaround dataset ever name the other dataset's fix artifact. Shared, stable vocabulary ("customers double-charged", "Stripe webhook retries") ties all three datasets together for recall, while the fix-specific proper nouns stay isolated per dataset. This isolation is what lets `forget(dataset="workarounds_v1_8")` cleanly remove the old answer without leaking into or breaking any other dataset (mitigates Cognee #1023's cross-dataset leak risk).

## Document inventory (11 docs + this README)

| File | Dataset | Role |
|------|---------|------|
| `incidents/stripe-double-charge-incident.md` | `incidents` | Bug report — durable, shared vocab |
| `incidents/stripe-double-charge-escalation.md` | `incidents` | Escalation chat — durable, shared vocab |
| `incidents/login-timeout-incident.md` | `incidents` | Decoy — never mentions double-charging |
| `incidents/api-latency-spike-incident.md` | `incidents` | Decoy — never mentions double-charging |
| `incidents/queue-backlog-incident.md` | `incidents` | Decoy — never mentions double-charging |
| `workarounds_v1_8/nightly-dedup-workaround.md` | `workarounds_v1_8` | Old fix — introduces `dedup_sweeper` / `nightly-dedup-cron` |
| `workarounds_v1_8/dedup-runbook-thread.md` | `workarounds_v1_8` | Runbook thread reinforcing the same isolated entity |
| `workarounds_v1_8/dedup-monitoring-note.md` | `workarounds_v1_8` | Monitoring note reinforcing the same isolated entity |
| `workarounds_v1_9/release-v1.9.md` | `workarounds_v1_9` | Release note — introduces `idempotency_guard`, states v1.8 fix is redundant |
| `workarounds_v1_9/idempotency-fix-thread.md` | `workarounds_v1_9` | Engineering thread confirming the new fix |
| `workarounds_v1_9/idempotency-rollout-note.md` | `workarounds_v1_9` | Rollout note reinforcing the new fix |

Any seed CLI or ingestion script must add + cognify each folder into its matching dataset name from `backend/datasets.py` — never mix folders into a single dataset, or the isolation this README documents is lost.
