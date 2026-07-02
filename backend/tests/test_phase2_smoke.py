"""Wave-0 smoke tests — de-risk the Phase 2 config keystone before anything
else is built on top of it.

Three self-contained, runtime-behavior assertions (never source greps):

(a) Continuation-regression check — proves CACHING=true + AUTO_FEEDBACK=false
    retires the Phase 1 "Got it." bug (see backend/cognee_config.py's
    docstring and .planning/phases/02-core-recall/02-RESEARCH.md "Feedback
    API Resolution" §3-§5, Common Pitfalls Pitfall 1).
(b) BinaryIO check — proves cognee.add() accepts an UploadFile-style BinaryIO
    directly with no temp-file write (RESEARCH.md Assumption A2).
(c) Latency check — times one fused GRAPH_COMPLETION + CHUNKS search and
    prints the elapsed seconds, so Plan 02's skeleton-card minimum-display
    time (D-20/B-02) can be tuned. The measured number is also recorded in
    this plan's SUMMARY.md.

Import order follows the config-before-import keystone (see
backend/cognee_config.py's module docstring): backend.cognee_config, then
cognee, then backend.cognee_patches, before anything else touches Cognee.
"""

import sys
import time
import uuid
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from cognee import SearchType  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bugs)

SEED_FILE = _REPO_ROOT / "seed" / "incidents" / "stripe-double-charge-incident.md"

FIXTURE_TEXT = (
    "Widget dashboard freezes when a user uploads a CSV larger than 10MB. "
    "The fix is to stream-parse the CSV in 64KB chunks instead of loading "
    "the whole file into memory at once."
)
FIXTURE_QUERY = "Why does the widget dashboard freeze on large CSV uploads?"


def _answer_text(results) -> str:
    return " ".join(str(r) for r in results).strip()


@pytest.mark.asyncio
async def test_continuation_regression_retired():
    """Re-running the SAME GRAPH_COMPLETION query twice must never return a
    bare canned continuation acknowledgment the second time (Pitfall 1)."""
    dataset_name = f"phase2_smoke_continuation_{uuid.uuid4().hex}"
    try:
        await cognee.add(FIXTURE_TEXT, dataset_name=dataset_name)
        await cognee.cognify(datasets=[dataset_name])

        first_results = await cognee.search(
            query_text=FIXTURE_QUERY,
            query_type=SearchType.GRAPH_COMPLETION,
            datasets=[dataset_name],
        )
        first_answer = _answer_text(first_results)

        second_results = await cognee.search(
            query_text=FIXTURE_QUERY,
            query_type=SearchType.GRAPH_COMPLETION,
            datasets=[dataset_name],
        )
        second_answer = _answer_text(second_results)

        assert second_answer, "second identical query returned an empty answer"
        # Real content, not a bare continuation acknowledgment. "Got it." (or
        # any very short generic reply) is the exact regression this flag
        # combination retires — assert real fixture content is present
        # instead of just checking non-emptiness.
        lowered = second_answer.lower()
        assert lowered != "got it." and lowered != "got it"
        assert "csv" in lowered or "widget" in lowered or "chunk" in lowered, (
            f"second answer does not mention fixture content — possible "
            f"regression: {second_answer!r}"
        )
    finally:
        try:
            await cognee.forget(dataset=dataset_name)
        except Exception:  # noqa: BLE001 - best-effort cleanup only
            pass


@pytest.mark.asyncio
async def test_binaryio_add_no_temp_file():
    """cognee.add() must accept a raw BinaryIO (no temp-file write, no
    prior .read()) exactly as an UploadFile.file would arrive (RESEARCH A2).
    """
    dataset_name = f"phase2_smoke_binaryio_{uuid.uuid4().hex}"
    try:
        with open(SEED_FILE, "rb") as file_obj:
            # Pass the raw BinaryIO straight to add() — no .read(), no
            # NamedTemporaryFile, matching how FastAPI's UploadFile.file
            # will be handed to add() in backend/ingest.py (future plan).
            await cognee.add(file_obj, dataset_name=dataset_name)
        await cognee.cognify(datasets=[dataset_name])

        # A follow-up search must complete without raising.
        results = await cognee.search(
            query_text="customers double-charged",
            query_type=SearchType.GRAPH_COMPLETION,
            datasets=[dataset_name],
        )
        assert results is not None
    finally:
        try:
            await cognee.forget(dataset=dataset_name)
        except Exception:  # noqa: BLE001 - best-effort cleanup only
            pass


@pytest.mark.asyncio
async def test_search_latency(capsys):
    """Time one GRAPH_COMPLETION + one CHUNKS search; print elapsed seconds
    so the number can be recorded in the plan SUMMARY for D-20/B-02 tuning.
    """
    dataset_name = f"phase2_smoke_latency_{uuid.uuid4().hex}"
    try:
        with open(SEED_FILE, "rb") as file_obj:
            await cognee.add(file_obj, dataset_name=dataset_name)
        await cognee.cognify(datasets=[dataset_name])

        start = time.perf_counter()
        await cognee.search(
            query_text="customers double-charged",
            query_type=SearchType.GRAPH_COMPLETION,
            datasets=[dataset_name],
            feedback_influence=0.5,
        )
        await cognee.search(
            query_text="customers double-charged",
            query_type=SearchType.CHUNKS,
            datasets=[dataset_name],
            top_k=5,
        )
        elapsed = time.perf_counter() - start

        print(f"\nPHASE2_SEARCH_LATENCY_SECONDS={elapsed:.2f}")
    finally:
        try:
            await cognee.forget(dataset=dataset_name)
        except Exception:  # noqa: BLE001 - best-effort cleanup only
            pass
