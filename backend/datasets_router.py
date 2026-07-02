"""GET /datasets — name + live document count for display datasets only
(RELEASE-01, D-15). Also returns each dataset's drift_state + drift_reason
(DRIFT-01/02/03).

Import order follows the config-before-import keystone (see
backend/cognee_config.py's module docstring): backend.cognee_config, then
cognee, then backend.cognee_patches, before anything else touches Cognee.
"""

import logging

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from fastapi import APIRouter  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import CANARY, HEALTHCHECK  # noqa: E402
from backend.drift import compute_drift_states, get_or_generate_reason, highest_live_version  # noqa: E402

router = APIRouter()
logger = logging.getLogger(__name__)

# Throwaway-dataset prefixes to hide from the display list (T-02-11). These
# match backend/main.py's health-check naming (f"{HEALTHCHECK}_{uuid4().hex}")
# and any equivalent per-request canary datasets — internal plumbing, never
# meant to be seen by a user.
_THROWAWAY_PREFIXES = (f"{HEALTHCHECK}_", f"{CANARY}_")
_THROWAWAY_EXACT = {HEALTHCHECK, CANARY}


def _is_display_dataset(name: str) -> bool:
    """True for durable/demo datasets (incidents, workarounds_v{N}) that
    should appear in the dataset list; False for HEALTHCHECK/CANARY and
    their uuid-suffixed per-request throwaways (D-15, T-02-11)."""
    if not name:
        return False
    if name in _THROWAWAY_EXACT:
        return False
    return not name.startswith(_THROWAWAY_PREFIXES)


@router.get("/datasets")
async def list_datasets():
    """Live doc counts, never manually tracked — always accurate against
    the actual relational DB state (RESEARCH.md "Don't Hand-Roll"). Each row
    also carries drift_state + drift_reason (DRIFT-01/02/03), computed via
    the same shared classifier /search uses so the two endpoints can never
    disagree about which dataset is drifting."""
    all_datasets = await cognee.datasets.list_datasets()
    display_datasets = [ds for ds in all_datasets if _is_display_dataset(ds.name)]
    names = [ds.name for ds in display_datasets]
    drift_states = compute_drift_states(names)
    # WR-02: reuse compute_drift_states's own notion of "highest" via the
    # shared sibling helper rather than re-deriving it independently -- see
    # backend/drift.py's highest_live_version docstring.
    highest = highest_live_version(names)
    result = []
    for ds in display_datasets:
        try:
            doc_count = len(await cognee.datasets.list_data(ds.id))
        except Exception:  # noqa: BLE001 - D-24: one bad dataset must not break the whole list
            logger.exception("could not resolve doc count for dataset=%s", ds.name)
            doc_count = 0
        state = drift_states.get(ds.name, "stable")
        reason = None
        if state == "drifting" and highest:
            try:
                reason = await get_or_generate_reason(ds.name, highest)
            except Exception:  # noqa: BLE001 - D-24: one bad reason must not break the whole list
                logger.exception("could not resolve drift reason for dataset=%s", ds.name)
                reason = None
        result.append(
            {
                "name": ds.name,
                "doc_count": doc_count,
                "drift_state": state,
                "drift_reason": reason,
            }
        )
    return result
