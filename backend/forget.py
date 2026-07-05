"""POST /forget — surgically remove a stale workarounds_v{N} dataset via
Cognee's `forget(dataset=...)` lifecycle verb (FORGET-01, FORGET-02).

Mirrors backend/feedback.py's validate-before-lifecycle-verb structure
almost verbatim, plus a durable-dataset guard Cognee itself does not
provide: the `incidents` dataset (and the `healthcheck`/`canary` throwaway
names) can never be forgotten through this route, even though
`cognee.forget()` would technically permit it (RESEARCH.md Pattern 5 /
T-03-01).

Import order follows the config-before-import keystone (see
backend/cognee_config.py's module docstring): backend.cognee_config, then
cognee, then backend.cognee_patches, before anything else touches Cognee.
"""

import logging

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from fastapi import APIRouter  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import INCIDENTS  # noqa: E402
from backend.events import record_event  # noqa: E402
from backend.search import _WORKAROUNDS_VERSION_RE  # noqa: E402

router = APIRouter()
logger = logging.getLogger(__name__)

# D-24 short human messages — never raw exception/validation detail. Must
# match 03-UI-SPEC.md's Copywriting Contract verbatim.
_MSG_INVALID_DATASET = "That dataset can't be forgotten."
_MSG_ERROR = "Could not forget dataset. Please try again."


class ForgetRequest(BaseModel):
    dataset: str = Field(..., min_length=1)


async def _is_forgettable_workaround(name: str) -> bool:
    """Validate-before-lifecycle-verb (Pattern 5 / ASVS V4+V5) + durable
    guard: `incidents` (INGEST-03/D-01 durability) and anything that isn't a
    `workarounds_v{N}` name (this rejects `healthcheck`/`canary`/any forged
    string too, closing Pitfall 2 before any Cognee call) can never be
    forgotten through this route. Only a name that is BOTH shaped like a
    workaround version, present in the live dataset list, AND classified
    `"drifting"` by the same shared `compute_drift_states` classifier
    `/search` and `/datasets` use is forgettable (CR-02) -- the current,
    non-drifting, highest-version workaround is the one actually in active
    use and must never be forgettable server-side, regardless of what the
    frontend chooses to render."""
    if name == INCIDENTS or not _WORKAROUNDS_VERSION_RE.match(name):
        return False
    all_datasets = await cognee.datasets.list_datasets()
    names = [ds.name for ds in all_datasets if ds.name == INCIDENTS or ds.name.startswith("workarounds_v")]
    if name not in names:
        return False
    from backend.drift import compute_drift_states

    return compute_drift_states(names).get(name) == "drifting"


@router.post("/forget")
async def forget_dataset(request: ForgetRequest):
    """Surgically remove exactly one live workarounds_v{N} dataset via
    `cognee.forget(dataset=...)` (FORGET-01). Never reached for `incidents`
    or any name that fails the durable/allowlist guard above."""
    try:
        if not await _is_forgettable_workaround(request.dataset):
            logger.warning(
                "forget blocked: invalid target dataset=%r", request.dataset
            )
            return {"status": "error", "message": _MSG_INVALID_DATASET}

        await cognee.forget(dataset=request.dataset)

        # WR-01: purge any cached drift-reason entries for the
        # now-forgotten dataset so a same-named dataset re-ingested later
        # (while the current highest is unchanged, keeping the cache key
        # identical) doesn't serve the stale, pre-forget reason string.
        from backend.drift import _reason_cache

        for key in [k for k in _reason_cache if k[0] == request.dataset]:
            del _reason_cache[key]

        record_event(
            "forget",
            dataset=request.dataset,
            detail="Stale workaround surgically removed via forget(dataset=…)",
        )
        return {"status": "forgotten", "dataset": request.dataset}
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        logger.exception("forget failed for dataset=%s", request.dataset)
        return {"status": "error", "message": _MSG_ERROR}
