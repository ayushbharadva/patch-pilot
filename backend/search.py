"""POST /search — fused GRAPH_COMPLETION root cause + CHUNKS evidence
(RECALL-01, RECALL-02).

Cognee returns one result per dataset searched, never a single fused answer
across datasets (.planning/phases/02-core-recall/02-RESEARCH.md "Architecture
Patterns" Pattern 4) — this module owns that fusion.

Import order follows the config-before-import keystone (see
backend/cognee_config.py's module docstring): backend.cognee_config, then
cognee, then backend.cognee_patches, before anything else touches Cognee.
"""

import logging
import re

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from cognee import SearchType  # noqa: E402
from fastapi import APIRouter  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import INCIDENTS  # noqa: E402
from backend.sessions import new_session_id  # noqa: E402

router = APIRouter()
logger = logging.getLogger(__name__)

# ASVS V5 — bound LLM token spend from an oversized query string.
MAX_QUERY_LENGTH = 500

# Number of evidence snippets shown on the diagnosis card (D-07).
EVIDENCE_LIMIT = 3
# Short excerpt length before truncation (D-07) — full text stays available
# via full_text for click-to-expand (D-08).
EXCERPT_LENGTH = 200

_WORKAROUNDS_VERSION_RE = re.compile(r"^workarounds_v(\d+)(?:_(\d+))?$")


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)


async def _active_search_datasets() -> list[str]:
    """Durable incidents plus every currently-live workaround version,
    discovered dynamically so this works both before and after a release
    upload (D-16)."""
    all_datasets = await cognee.datasets.list_datasets()
    return [INCIDENTS] + [d.name for d in all_datasets if d.name.startswith("workarounds_v")]


def _result_text(raw) -> str:
    """Normalize a Cognee completion value (str, list[str]/list[dict], or
    None) into flat display text."""
    if raw is None:
        return ""
    if isinstance(raw, list):
        return " ".join(str(item) for item in raw if item).strip()
    return str(raw).strip()


def _version_sort_key(dataset_name: str | None) -> tuple[int, int]:
    """Higher-numbered workarounds_v{N} sorts first (Pitfall 4); anything
    else (e.g. `incidents`) sorts last."""
    if not dataset_name:
        return (-1, -1)
    match = _WORKAROUNDS_VERSION_RE.match(dataset_name)
    if not match:
        return (-1, -1)
    major = int(match.group(1))
    minor = int(match.group(2)) if match.group(2) else 0
    return (major, minor)


def _pick_primary_result(results: list[dict]) -> dict | None:
    """Prefer the result whose text is non-empty; among ties, prefer the
    highest-numbered workarounds_v{N} dataset (Pitfall 4) — `incidents`
    alone rarely carries remediation text."""
    candidates = [r for r in results if _result_text(r.get("search_result"))]
    if not candidates:
        return None
    candidates.sort(key=lambda r: _version_sort_key(r.get("dataset_name")), reverse=True)
    return candidates[0]


def _flatten_and_truncate(results: list[dict], limit: int = EVIDENCE_LIMIT) -> list[dict]:
    """Flatten CHUNKS results (one list of chunk payloads per dataset) into
    at most `limit` evidence snippets, each with a short excerpt, the
    retained full_text, and its source dataset (D-07/D-08)."""
    flattened: list[dict] = []
    for result in results:
        source = result.get("dataset_name")
        chunks = result.get("search_result") or []
        if not isinstance(chunks, list):
            chunks = [chunks]
        for chunk in chunks:
            text = chunk.get("text", "") if isinstance(chunk, dict) else str(chunk)
            text = text.strip()
            if not text:
                continue
            excerpt = text if len(text) <= EXCERPT_LENGTH else text[:EXCERPT_LENGTH].rstrip() + "…"
            flattened.append({"excerpt": excerpt, "full_text": text, "source": source})
            if len(flattened) >= limit:
                return flattened
    return flattened


@router.post("/search")
async def search(request: SearchRequest):
    """Fused diagnosis: GRAPH_COMPLETION root cause + CHUNKS evidence,
    minted with a fresh per-request session_id (never client-supplied,
    ASVS V3)."""
    query = request.query.strip()[:MAX_QUERY_LENGTH]
    if not query:
        return {"status": "no_results"}

    datasets = await _active_search_datasets()
    session_id = new_session_id()

    try:
        root_cause_results = await cognee.search(
            query_text=query,
            query_type=SearchType.GRAPH_COMPLETION,
            datasets=datasets,
            session_id=session_id,
            # Library default is 0.0 — must be explicit or a reinforced
            # fix's feedback_weight has zero effect on ranking (Pitfall 3).
            feedback_influence=0.5,
        )
        evidence_results = await cognee.search(
            query_text=query,
            query_type=SearchType.CHUNKS,
            datasets=datasets,
            top_k=5,
            # No feedback_influence here — SearchType.CHUNKS has no such
            # parameter on its retriever path (Pitfall 3 / RESEARCH §7).
        )
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        logger.exception("search failed for query=%r", query)
        return {"status": "error", "message": "Search failed. Please try again in a moment."}

    primary = _pick_primary_result(root_cause_results)
    evidence = _flatten_and_truncate(evidence_results, limit=EVIDENCE_LIMIT)

    if not primary and not evidence:
        return {"status": "no_results"}  # D-21 — never fabricate an ungrounded answer

    qa_id = None
    try:
        session_entries = await cognee.api.v1.session.get_session(session_id=session_id)
        if session_entries:
            qa_id = session_entries[-1].qa_id
    except Exception:  # noqa: BLE001 - qa_id is best-effort; missing it must not fail the search
        logger.warning("Could not resolve qa_id for session=%s", session_id, exc_info=True)

    return {
        "status": "ok",
        "root_cause": _result_text(primary.get("search_result")) if primary else "",
        "evidence": evidence,
        "source_dataset": primary.get("dataset_name") if primary else None,
        "session_id": session_id,
        "qa_id": qa_id,
    }
