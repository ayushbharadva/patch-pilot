---
phase: 01-foundation
fixed_at: 2026-07-01T20:38:13Z
review_path: .planning/phases/01-foundation/01-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 01-foundation: Code Review Fix Report

**Fixed at:** 2026-07-01T20:38:13Z
**Source review:** .planning/phases/01-foundation/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (fix_scope: critical_warning -- CR-01 + WR-01..WR-06; IN-01/IN-02 excluded)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Patched Mistral retry policy silently drops the `asyncio.CancelledError` exclusion, contradicting the module's own "unchanged" claim

**Files modified:** `backend/cognee_patches.py`
**Commit:** 9d7dc08
**Applied fix:** Verified the actually-installed `cognee==1.2.2` source in `.venv/lib/python3.14/site-packages/cognee/infrastructure/llm/structured_output_framework/litellm_instructor/llm/mistral/adapter.py` directly (same method the reviewer used) and confirmed the original `MistralAdapter.acreate_structured_output` retry decorator excludes exactly `(litellm.exceptions.NotFoundError, litellm.exceptions.AuthenticationError, asyncio.CancelledError)`. Added `import asyncio` to `backend/cognee_patches.py` and restored `asyncio.CancelledError` to the patched `retry_if_not_exception_type(...)` tuple, so the module's "retry policy preserved unchanged" docstring claim is now true again and task cancellation is no longer caught/retried.

### WR-01: `scripts/snapshot_memory.py` hardcodes the memory root, ignoring the project's own `SYSTEM_ROOT_DIRECTORY`/`DATA_ROOT_DIRECTORY` override convention

**Files modified:** `scripts/snapshot_memory.py`
**Commit:** 70be171
**Applied fix:** Added `import os` and `from dotenv import load_dotenv`, called `load_dotenv()`, and changed `MEMORY_ROOT` to resolve via `os.environ.get("SYSTEM_ROOT_DIRECTORY", <default>)`, matching the same env var `backend/cognee_config.py` supports -- without importing `cognee` itself. Updated the module docstring to clarify why this one env var is re-read despite the module's cognee-independence.

### WR-02: `/health/cognee` shares a single mutable dataset name across concurrent requests — race condition on the cleanup path

**Files modified:** `backend/main.py`
**Commit:** 27b8b4d
**Applied fix:** Applied the reviewer's minimal option (b): each request now computes `dataset_name = f"{HEALTHCHECK}_{uuid.uuid4().hex}"` and uses that per-request name for `add()`/`cognify()`/`search()`/`forget()`, so concurrent health checks never collide on a shared dataset. Chose the unique-dataset-name approach over adding an `asyncio.Lock` since this is a single-user demo app with no need for the added serialization/locking infrastructure.

### WR-03: `/health/cognee` returns raw exception text to the caller

**Files modified:** `backend/main.py`
**Commit:** f5bf08c
**Applied fix:** Added a module-level `logger = logging.getLogger(__name__)` and changed the `except Exception as e` handler to `logger.exception("Cognee health check failed")` followed by returning a generic `{"status": "unhealthy"}` (no `error` field) to the client, exactly as the reviewer's minimal fix suggested.

### WR-04: Best-effort cleanup swallows all exceptions with no logging

**Files modified:** `backend/main.py`
**Commit:** 2a925ed
**Applied fix:** The `finally` block's cleanup `except Exception: pass` now logs via `logger.warning(...)` (including the dataset name and `exc_info=True`) before continuing, so a failed `forget()` is no longer silently invisible.

### WR-05: `seed/seed_cli.py --reset` silently ignores `--seed`/`--flip` when combined, instead of rejecting the combination

**Files modified:** `seed/seed_cli.py`
**Commit:** 61bb1c5
**Applied fix:** Used the reviewer's suggested manual-check approach (rather than a strict `add_mutually_exclusive_group`, which would have also blocked the valid `--seed --flip` combination): added `if args.reset and (args.seed or args.flip): parser.error(...)` right after `parse_args()`, so `--reset` now fails fast with a clear argparse error when combined with either sibling flag, while `--seed`+`--flip` remain freely combinable.

### WR-06: Isolation check in `flip()` only verifies non-emptiness, not actual content — weaker than the equivalent check elsewhere in the codebase

**Files modified:** `seed/seed_cli.py`
**Commit:** b3dccb7
**Applied fix:** Verified the canonical identifying strings present in the seed corpus (`seed/incidents/stripe-double-charge-incident.md` contains both "double-charged" and "Stripe"). Replaced `incidents_survived = bool(incidents_answer)` with a substring-match assertion (`"double-charged" in incidents_answer.lower() or "stripe" in incidents_answer.lower()`), mirroring the stronger pattern already used by `backend/persistence_check.py`'s `"zephyr-relay-77" in answer_text` durability check.

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-07-01T20:38:13Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
