"""POST /feedback/accept — reinforce an accepted fix via Cognee's
session/`improve()` path (FEEDBACK-01, FEEDBACK-02).

There is deliberately NO /feedback/reject route in this module — D-10 makes
Reject a silent, client-side-only dismiss with no backend call.

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
from backend.events import record_event  # noqa: E402

router = APIRouter()
logger = logging.getLogger(__name__)

# D-24 short human messages — never raw exception/validation detail.
_MSG_UNKNOWN_DATASET = "Could not save feedback. Please try again."
_MSG_ERROR = "Could not save feedback. Please try again."


class AcceptRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    qa_id: str = Field(..., min_length=1)
    source_dataset: str = Field(..., min_length=1)


async def _is_known_dataset(name: str) -> bool:
    """RESEARCH.md Pitfall 2 / T-02-09 — validate `source_dataset` against
    the live dataset list before ever calling improve() against it. A
    forged/unknown dataset name must never reach improve()'s `dataset`
    argument, since that would misdirect graph-weight writes at whatever
    dataset the forged name happened to resolve/collide with."""
    all_datasets = await cognee.datasets.list_datasets()
    return any(ds.name == name for ds in all_datasets)


@router.post("/feedback/accept")
async def accept_feedback(request: AcceptRequest):
    """Reinforce the exact source dataset an accepted answer came from
    (FEEDBACK-01/02). Score is always 5 (max) and feedback_alpha is
    explicitly 1.0 — overriding the library's 0.1 default — so a single
    Accept click is visible on the very next re-search within the demo
    window (RESEARCH.md "Feedback API Resolution" §2)."""
    try:
        if not await _is_known_dataset(request.source_dataset):
            logger.warning(
                "feedback accept blocked: unknown source_dataset=%r session=%s qa=%s",
                request.source_dataset,
                request.session_id,
                request.qa_id,
            )
            return {"status": "error", "message": _MSG_UNKNOWN_DATASET}

        await cognee.api.v1.session.add_feedback(
            session_id=request.session_id,
            qa_id=request.qa_id,
            feedback_score=5,
        )
        await cognee.improve(
            dataset=request.source_dataset,
            session_ids=[request.session_id],
            # Library default is 0.1 — explicit 1.0 makes one Accept fully
            # set the normalized score in a single call (RESEARCH §2).
            feedback_alpha=1.0,
        )
        record_event(
            "improve",
            dataset=request.source_dataset,
            detail="Fix accepted — memory reinforced via improve(feedback_alpha=1.0)",
        )
        return {"status": "reinforced"}
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        logger.exception(
            "feedback accept failed for session=%s qa=%s dataset=%s",
            request.session_id,
            request.qa_id,
            request.source_dataset,
        )
        return {"status": "error", "message": _MSG_ERROR}


# NOTE: no /feedback/reject route exists here on purpose (D-10). Reject is a
# silent, client-side-only card dismiss — see frontend/components/
# DiagnosisCard.tsx. Do not add a reject endpoint to this router.
