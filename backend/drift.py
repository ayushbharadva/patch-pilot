"""Shared drift classification + live reason generation (DRIFT-01/02/03).

Computes the three-state health of every live dataset (`"stable"` |
`"aging"` | `"drifting"`) from one pure, shared helper so `/search`'s
primary-answer selection and `GET /datasets`'s badge rendering can never
disagree about which dataset is drifting (RESEARCH.md Pattern 1 /
Anti-Patterns). Also owns the live LLM-generated drift-reason string for
🔴 datasets, with a bounded timeout, a deterministic fallback (D-24), and an
in-process cache keyed on the drift fact itself (Pattern 4, B-02 mitigation).

Import order follows the config-before-import keystone (see
backend/cognee_config.py's module docstring): backend.cognee_config, then
cognee, then backend.cognee_patches, before anything else touches Cognee.
"""

import asyncio
import logging

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from cognee import SearchType  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import INCIDENTS  # noqa: E402
from backend.search import _WORKAROUNDS_VERSION_RE, _result_text, _version_sort_key  # noqa: E402

logger = logging.getLogger(__name__)

# D-03: one-sentence, direct engineering explanation of what changed and why
# the prior manual workaround is now unnecessary -- never mention
# "context"/"documents" (that would read as an LLM answering about its own
# retrieval mechanics rather than the actual release).
DRIFT_REASON_PROMPT = (
    "Answer in one concise sentence (max ~30 words): what does this release "
    "change, and why does it make an existing manual workaround for the same "
    "problem unnecessary? Do not mention 'context' or 'documents' — answer as "
    "a direct engineering explanation."
)

# B-02 mitigation: bound the live LLM call so a hung/slow Mistral request can
# never stack up indefinitely per request.
_REASON_TIMEOUT_SECONDS = 10

# D-24: deterministic fallback -- never leak raw exception/timeout text, never
# a blank reason.
_FALLBACK_REASON = "A newer release supersedes this workaround."

# Pattern 4 / B-02 -- module-level, single-worker-safe cache (per
# .claude/CLAUDE.md's --workers 1 constraint). Keyed on (drifting_name,
# current_highest_name) so a cached reason is reused only while the exact
# same drift fact holds; the moment a new release changes the winning half of
# the key, the cache key changes and a fresh live call happens. Intentionally
# unbounded -- see RESEARCH.md Pitfall 5 (not worth eviction logic at this
# scale).
_reason_cache: dict[tuple[str, str], str] = {}


def compute_drift_states(
    live_dataset_names: list[str],
    aging_candidates: set[str] | None = None,
) -> dict[str, str]:
    """Map every live dataset name to `"stable"` | `"aging"` | `"drifting"`.

    Precedence (D-01/D-02/D-05):
    1. `incidents` and any non-`workarounds_v{N}` name -> always `"stable"`
       (durable ground truth, never a drift subject).
    2. Any versioned name that is NOT the current highest live version ->
       always `"drifting"` (D-02, unconditional -- this check runs BEFORE
       the aging check, so a non-max name is never demoted from 🔴 to 🟡;
       RESEARCH.md Pitfall 3).
    3. A highest-version name present in `aging_candidates` -> `"aging"`
       (D-05, Option B -- a real, unit-tested branch reachable only via an
       injected relatedness set; no current data source supplies
       topic-relatedness, so this never fires against the single-arc seed
       corpus, matching CONTEXT.md D-05's "won't fire live" narrative).
    4. Otherwise -> `"stable"`.
    """
    aging_candidates = aging_candidates or set()
    versioned = [n for n in live_dataset_names if _WORKAROUNDS_VERSION_RE.match(n)]
    highest = max(versioned, key=_version_sort_key) if versioned else None

    states: dict[str, str] = {}
    for name in live_dataset_names:
        if name == INCIDENTS or not _WORKAROUNDS_VERSION_RE.match(name):
            states[name] = "stable"
        elif name != highest:
            states[name] = "drifting"
        elif name in aging_candidates:
            states[name] = "aging"
        else:
            states[name] = "stable"
    return states


async def generate_drift_reason(newest_dataset_name: str) -> str:
    """Live GRAPH_COMPLETION call against ONLY the newest (superseding)
    dataset (RESEARCH.md Pattern 3 -- a two-dataset call returns two
    unrelated per-dataset answers, never a fused "why X replaces Y"
    explanation). D-24: broad except, log server-side, deterministic
    fallback -- never leak raw exception/timeout text, never return blank."""
    try:
        results = await asyncio.wait_for(
            cognee.search(
                query_text="Why does this release make the prior workaround unnecessary?",
                query_type=SearchType.GRAPH_COMPLETION,
                datasets=[newest_dataset_name],
                system_prompt=DRIFT_REASON_PROMPT,
            ),
            timeout=_REASON_TIMEOUT_SECONDS,
        )
        # Rule 1 fix (found live-testing this task): normalize each result's
        # search_result via the same helper search.py uses for completion
        # text (_result_text) -- a naive str(r.get("search_result", "")) on
        # a list-shaped completion (Cognee sometimes returns
        # ["sentence"] rather than a bare string) renders the Python list
        # repr ("['sentence']") instead of the clean sentence text.
        text = " ".join(_result_text(r.get("search_result")) for r in results).strip()
        return text or _FALLBACK_REASON
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        logger.exception("drift reason generation failed for dataset=%s", newest_dataset_name)
        return _FALLBACK_REASON


async def get_or_generate_reason(drifting_name: str, current_highest_name: str) -> str:
    """Cache-checked wrapper around `generate_drift_reason` (Pattern 4). The
    LLM is re-called only when the current-winner half of the key changes --
    safe because the app is single-worker (.claude/CLAUDE.md)."""
    key = (drifting_name, current_highest_name)
    if key in _reason_cache:
        return _reason_cache[key]
    reason = await generate_drift_reason(current_highest_name)
    _reason_cache[key] = reason
    return reason
