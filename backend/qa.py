"""POST /qa — conversational Q&A over the repo's incident memory (QA-01).

The cut-down "ask your repo" layer: free-form questions ("what does this
issue mean?", "why do forgot-password emails stall?") answered by Cognee's
GRAPH_COMPLETION recall over the same live datasets /search uses — the
incidents dataset holds every synced GitHub issue, so the connected repo's
history is part of the answerable memory.

What makes this more than /search: the SAME session_id is reused across a
conversation's turns, so Cognee's session layer (CACHING=true,
backend/cognee_config.py) folds the conversation's prior Q&A into each new
prompt — real multi-turn conversational memory, not stateless queries.
backend/sessions.py's mint-fresh-per-search rule exists precisely because
session reuse biases follow-up answers toward earlier turns; a conversation
is the one place that bias is the desired behavior.

Import order follows the config-before-import keystone (see
backend/cognee_config.py's module docstring): backend.cognee_config, then
cognee, then backend.cognee_patches, before anything else touches Cognee.
"""

import logging
import re
import uuid

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from cognee import SearchType  # noqa: E402
from fastapi import APIRouter  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.events import record_event  # noqa: E402
from backend.search import (  # noqa: E402
    MAX_QUERY_LENGTH,
    _active_search_datasets,
    _is_ungrounded_answer,
    _result_text,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# ASVS V3 — a client may only CONTINUE a session this endpoint minted, never
# inject an arbitrary session key into Cognee's session store. The strict
# shape check (qa_ + 32 hex) rejects forged/other-namespace ids (e.g. the
# search_* ids /search mints) before they reach cognee.search().
_QA_SESSION_RE = re.compile(r"^qa_[0-9a-f]{32}$")

# D-24 short human messages — never raw exception/validation detail.
_MSG_ERROR = "Could not answer that. Please try again."
_MSG_NO_ANSWER = (
    "Nothing in memory answers that yet. Sync your repo's issues or upload "
    "incident docs, then ask again."
)


class QaRequest(BaseModel):
    question: str = Field(..., min_length=1)
    session_id: str | None = None


@router.post("/qa")
async def ask(request: QaRequest):
    """One conversational turn: GRAPH_COMPLETION over every live dataset,
    threaded through a per-conversation session id so follow-up questions
    see the conversation's earlier turns."""
    question = request.question.strip()[:MAX_QUERY_LENGTH]
    if not question:
        return {"status": "no_answer", "message": _MSG_NO_ANSWER}

    if request.session_id and _QA_SESSION_RE.match(request.session_id):
        session_id = request.session_id
    else:
        session_id = f"qa_{uuid.uuid4().hex}"

    try:
        datasets = await _active_search_datasets()
        if not datasets:
            return {"status": "no_answer", "message": _MSG_NO_ANSWER}

        results = await cognee.search(
            query_text=question,
            query_type=SearchType.GRAPH_COMPLETION,
            datasets=datasets,
            session_id=session_id,
            feedback_influence=0.5,
        )
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        logger.exception("qa failed for question=%r", question)
        return {"status": "error", "message": _MSG_ERROR}

    answer = " ".join(_result_text(r.get("search_result")) for r in results).strip()
    if not answer or _is_ungrounded_answer(answer):
        return {"status": "no_answer", "message": _MSG_NO_ANSWER}

    record_event(
        "recall",
        dataset=None,
        detail=f"Repo Q&A: “{question[:70]}” answered from memory",
    )
    return {"status": "ok", "answer": answer, "session_id": session_id}
