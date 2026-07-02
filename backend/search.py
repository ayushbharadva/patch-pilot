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

# NOTE: backend.drift is intentionally NOT imported at module level here.
# backend/drift.py itself imports _WORKAROUNDS_VERSION_RE/_version_sort_key
# FROM this module (RESEARCH.md "Don't Hand-Roll" — reuse, never duplicate
# the version regex), so a top-level `from backend.drift import
# compute_drift_states` here would create a circular import that fails
# depending on which module loads first. compute_drift_states is imported
# lazily inside search() below, once both modules have finished loading.

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

# Explainable no-grounding markers (D-21). GRAPH_COMPLETION does not raise or
# return empty text for an off-corpus query — the LLM instead emits a generic
# "I have no relevant context" style answer (the default answer prompt is just
# "Answer the question using the provided context"). Surfacing that generic
# reply as a diagnosis would be exactly the "ungrounded generic LLM answer"
# D-21 forbids, so we detect it and return no_results instead. These are
# substring markers matched against the normalized (lowercased) answer; the
# real seed answers (e.g. the idempotency_guard fix) never contain them.
_UNGROUNDED_ANSWER_MARKERS = (
    "no relevant information",
    "no relevant data",
    "no relevant context",
    "no information available",
    "no information is available",
    "cannot answer",
    "can't answer",
    "unable to answer",
    "context is unrelated",
    "context provided is unrelated",
    "not enough information",
    "no context is provided",
    "i don't have",
    "i do not have",
)


def _is_ungrounded_answer(text: str) -> bool:
    """True when a GRAPH_COMPLETION answer is a generic no-grounding reply
    rather than a real, evidence-backed diagnosis (D-21)."""
    normalized = " ".join(text.lower().split()) if text else ""
    if not normalized:
        return True
    return any(marker in normalized for marker in _UNGROUNDED_ANSWER_MARKERS)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)


async def _active_search_datasets() -> list[str]:
    """Durable incidents plus every currently-live workaround version that
    actually holds documents, discovered dynamically so this works both
    before and after a release upload (D-16).

    NINTH DEVIATION (found live-testing the 02-04 checkpoint, Rule 1 bug):
    a dataset can exist and report a "completed" pipeline status while still
    holding ZERO documents -- e.g. an upload whose add() never actually
    landed a doc, or a release version created but never populated. Cognee's
    CHUNKS retriever raises NoDataError for a genuinely empty dataset
    (`ChunksRetriever.get_retrieved_objects` -> `CollectionNotFoundError:
    Collection 'DocumentChunk_text' not found`), and
    `search_in_datasets_context` fans out one retrieval task per dataset via
    `asyncio.gather(*tasks)` WITHOUT `return_exceptions=True` -- so a single
    empty dataset raises and cancels the ENTIRE fused search across every
    OTHER (perfectly healthy) dataset too, not just itself. Filtering on
    pipeline status alone does not catch this (an empty dataset's cognify()
    still reports DATASET_PROCESSING_COMPLETED, since there was nothing to
    process) -- doc_count is the only reliable signal, so this reuses the
    same list_data()-length check datasets_router.py already uses for the
    dataset list's doc counts.
    """
    all_datasets = await cognee.datasets.list_datasets()
    candidates = [d for d in all_datasets if d.name == INCIDENTS or d.name.startswith("workarounds_v")]
    ready = []
    for d in candidates:
        doc_count = len(await cognee.datasets.list_data(d.id))
        if doc_count > 0:
            ready.append(d.name)
    return ready


async def _all_workaround_dataset_names() -> list[str]:
    """Every live `incidents`/`workarounds_v{N}` name, regardless of
    doc_count -- used ONLY for drift classification so `/search` and
    `/datasets` never disagree (CR-01). Unlike `_active_search_datasets()`,
    this intentionally includes a just-uploaded `workarounds_v{N+1}` that
    hasn't finished `cognify()` yet (doc_count still 0), since
    `compute_drift_states` needs to see it to correctly demote the prior
    highest version to "drifting" during that transient window."""
    all_datasets = await cognee.datasets.list_datasets()
    return [d.name for d in all_datasets if d.name == INCIDENTS or d.name.startswith("workarounds_v")]


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


def _pick_primary_result(results: list[dict], drift_states: dict[str, str] | None = None) -> dict | None:
    """Prefer the result whose text is non-empty AND is not drift-flagged
    (D-01 — a 🔴-flagged dataset must never win as the primary answer, even
    while it stays "active"/searchable for the evidence panel); among the
    remaining ties, prefer the highest-numbered workarounds_v{N} dataset
    (Pitfall 4) — `incidents` alone rarely carries remediation text.

    `drift_states` defaults to `None` (treated as empty — everything
    non-drifting) so existing callers that don't pass it keep their prior
    behavior unchanged."""
    drift_states = drift_states or {}
    candidates = [
        r
        for r in results
        if _result_text(r.get("search_result"))
        and drift_states.get(r.get("dataset_name"), "stable") != "drifting"
    ]
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
    if not datasets:
        # Nothing has finished ingesting yet (D-21) -- never hand an empty
        # dataset list to cognee.search(), which has no defined behavior
        # for it.
        return {"status": "no_results"}
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

    # Lazy import — see the module-level NOTE above the imports for why this
    # can't be a top-level import (circular with backend.drift).
    from backend.drift import compute_drift_states

    # CR-01: classify drift over the FULL candidate list (every live
    # incidents/workarounds_v{N} name), not the doc_count-filtered
    # `datasets` list used for the actual search calls -- otherwise a
    # just-uploaded, still-cognifying workarounds_v{N+1} is invisible here
    # while GET /datasets already sees it, and the two endpoints disagree
    # about which dataset is drifting during that transient window.
    all_names = await _all_workaround_dataset_names()
    drift_states = compute_drift_states(all_names)
    primary = _pick_primary_result(root_cause_results, drift_states)
    evidence = _flatten_and_truncate(evidence_results, limit=EVIDENCE_LIMIT)

    root_cause = _result_text(primary.get("search_result")) if primary else ""

    # D-21 — never fabricate an ungrounded answer. Against a loaded corpus,
    # CHUNKS vector search always returns nearest-neighbor chunks (evidence is
    # never empty) and GRAPH_COMPLETION returns a generic "no relevant
    # information" reply rather than empty text, so a bare emptiness check is
    # insufficient: gate on whether the root cause is actually grounded.
    if not root_cause or _is_ungrounded_answer(root_cause):
        return {"status": "no_results"}

    qa_id = None
    try:
        session_entries = await cognee.api.v1.session.get_session(session_id=session_id)
        if session_entries:
            qa_id = session_entries[-1].qa_id
    except Exception:  # noqa: BLE001 - qa_id is best-effort; missing it must not fail the search
        logger.warning("Could not resolve qa_id for session=%s", session_id, exc_info=True)

    return {
        "status": "ok",
        "root_cause": root_cause,
        "evidence": evidence,
        "source_dataset": primary.get("dataset_name") if primary else None,
        "session_id": session_id,
        "qa_id": qa_id,
        # UI-SPEC Interaction Contract point 6 — the winning dataset's own
        # drift state, so DiagnosisCard's VersionTagBadge can wire healthState.
        "drift_state": drift_states.get(primary.get("dataset_name")) if primary else None,
    }
