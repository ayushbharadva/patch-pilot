"""Unit tests for backend/search.py's pure helpers — in-memory fakes only,
no network / no Cognee calls (RECALL-01/02 behavior contract)."""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.search import (  # noqa: E402
    _active_search_datasets,
    _confidence_from_results,
    _flatten_and_truncate,
    _is_ungrounded_answer,
    _pick_primary_result,
)
from backend.datasets import INCIDENTS  # noqa: E402


class _FakeDataset:
    def __init__(self, name: str, id: str | None = None):
        self.name = name
        self.id = id or name


class _FakeScoredResult:
    """Minimal stand-in for cognee's ScoredResult (verbose objects_result
    items) -- attribute access only, no dict methods, matching the real
    pydantic model's shape (.payload / .score)."""

    def __init__(self, payload: dict, score: float):
        self.payload = payload
        self.score = score


def test_pick_primary_result_prefers_non_empty_text():
    results = [
        {"dataset_name": INCIDENTS, "search_result": ""},
        {"dataset_name": "workarounds_v1_8", "search_result": "old fix: dedup_sweeper"},
    ]
    primary = _pick_primary_result(results)
    assert primary is not None
    assert primary["dataset_name"] == "workarounds_v1_8"


def test_pick_primary_result_prefers_highest_version_number():
    results = [
        {"dataset_name": "workarounds_v1_8", "search_result": "old fix: dedup_sweeper"},
        {"dataset_name": "workarounds_v1_9", "search_result": "new fix: idempotency_guard"},
    ]
    primary = _pick_primary_result(results)
    assert primary is not None
    assert primary["dataset_name"] == "workarounds_v1_9"


def test_pick_primary_result_returns_none_when_all_empty():
    results = [
        {"dataset_name": INCIDENTS, "search_result": ""},
        {"dataset_name": "workarounds_v1_8", "search_result": []},
    ]
    assert _pick_primary_result(results) is None


def test_pick_primary_result_handles_list_completion():
    results = [
        {"dataset_name": "workarounds_v1_9", "search_result": ["new fix: idempotency_guard"]},
    ]
    primary = _pick_primary_result(results)
    assert primary is not None
    assert primary["dataset_name"] == "workarounds_v1_9"


def test_flatten_and_truncate_caps_at_limit_with_excerpt_and_full_text():
    long_text = "x" * 500
    results = [
        {
            "dataset_name": "workarounds_v1_9",
            "search_result": [
                {"text": long_text},
                {"text": "second chunk"},
                {"text": "third chunk"},
                {"text": "fourth chunk (should be dropped)"},
            ],
        }
    ]
    evidence = _flatten_and_truncate(results, limit=3)
    assert len(evidence) == 3
    for item in evidence:
        assert set(item.keys()) == {"excerpt", "full_text", "source"}
        assert item["source"] == "workarounds_v1_9"
    # First chunk was long enough to truncate; excerpt must be shorter than
    # full_text while full_text retains the original content.
    assert len(evidence[0]["excerpt"]) < len(evidence[0]["full_text"])
    assert evidence[0]["full_text"] == long_text


def test_flatten_and_truncate_skips_empty_chunks():
    results = [
        {"dataset_name": "workarounds_v1_9", "search_result": [{"text": ""}, {"text": "real content"}]},
    ]
    evidence = _flatten_and_truncate(results, limit=3)
    assert len(evidence) == 1
    assert evidence[0]["full_text"] == "real content"


def test_is_ungrounded_answer_flags_generic_no_info_replies():
    # Exact phrases the LLM emits for an off-corpus query (observed live).
    assert _is_ungrounded_answer("No relevant information.")
    assert _is_ungrounded_answer("No information available.")
    assert _is_ungrounded_answer(
        "I cannot answer how to bake a cake as the provided context is unrelated."
    )
    # Empty / whitespace is also ungrounded.
    assert _is_ungrounded_answer("")
    assert _is_ungrounded_answer("   ")


def test_is_ungrounded_answer_accepts_real_grounded_diagnosis():
    real = (
        "The issue of customers being double-charged was fixed in v1.9 with the "
        "introduction of `idempotency_guard`, which prevents duplicate orders by "
        "keying Stripe webhook events."
    )
    assert not _is_ungrounded_answer(real)


async def test_active_search_datasets_returns_incidents_and_workarounds_only(monkeypatch):
    fake_datasets = [
        _FakeDataset(INCIDENTS),
        _FakeDataset("workarounds_v1_8"),
        _FakeDataset("workarounds_v1_9"),
        _FakeDataset("healthcheck_abc123"),
        _FakeDataset("canary_xyz"),
    ]

    async def _fake_list_datasets():
        return fake_datasets

    async def _fake_list_data(dataset_id):
        # Every candidate dataset has at least one document in this test.
        return ["doc"]

    import cognee

    monkeypatch.setattr(cognee.datasets, "list_datasets", _fake_list_datasets)
    monkeypatch.setattr(cognee.datasets, "list_data", _fake_list_data)

    active = await _active_search_datasets()
    assert active == [INCIDENTS, "workarounds_v1_8", "workarounds_v1_9"]


async def test_active_search_datasets_excludes_empty_datasets(monkeypatch):
    """NINTH DEVIATION regression lock: a dataset with a "completed" pipeline
    status but ZERO documents (e.g. an upload whose add() never landed) must
    be excluded, or Cognee's CHUNKS retriever raises NoDataError for it and
    fails the entire fused search via asyncio.gather (search.py 02-04
    checkpoint bug)."""
    fake_datasets = [
        _FakeDataset(INCIDENTS, id="incidents-id"),
        _FakeDataset("workarounds_v1_9", id="v1_9-id"),
        _FakeDataset("workarounds_v2_0", id="v2_0-id"),  # exists but empty
    ]

    async def _fake_list_datasets():
        return fake_datasets

    async def _fake_list_data(dataset_id):
        return [] if dataset_id == "v2_0-id" else ["doc"]

    import cognee

    monkeypatch.setattr(cognee.datasets, "list_datasets", _fake_list_datasets)
    monkeypatch.setattr(cognee.datasets, "list_data", _fake_list_data)

    active = await _active_search_datasets()
    assert active == [INCIDENTS, "workarounds_v1_9"]
    assert "workarounds_v2_0" not in active


# --- STRETCH-01: verbose objects_result evidence path + confidence extraction ---


def test_flatten_and_truncate_reads_verbose_objects_result():
    """04-RESEARCH.md Pitfall 5: with verbose=True, cognee reshapes each
    per-dataset result to expose `objects_result` (a list of ScoredResult-
    shaped items with .payload/.score) instead of the flat `search_result`
    list-of-dicts. Evidence extraction must read the new shape and produce
    the identical {excerpt, full_text, source} output as the legacy path."""
    results = [
        {
            "dataset_name": "workarounds_v1_9",
            "objects_result": [
                _FakeScoredResult({"text": "idempotency_guard fix chunk"}, score=0.12),
                _FakeScoredResult({"text": "second chunk"}, score=0.30),
            ],
        }
    ]
    evidence = _flatten_and_truncate(results, limit=3)
    assert len(evidence) == 2
    assert evidence[0] == {
        "excerpt": "idempotency_guard fix chunk",
        "full_text": "idempotency_guard fix chunk",
        "source": "workarounds_v1_9",
    }
    assert evidence[1]["full_text"] == "second chunk"


def test_flatten_and_truncate_objects_result_skips_empty_payload_text():
    results = [
        {
            "dataset_name": "workarounds_v1_9",
            "objects_result": [
                _FakeScoredResult({"text": ""}, score=0.5),
                _FakeScoredResult({"text": "real content"}, score=0.2),
            ],
        }
    ]
    evidence = _flatten_and_truncate(results, limit=3)
    assert len(evidence) == 1
    assert evidence[0]["full_text"] == "real content"


def test_flatten_and_truncate_legacy_search_result_shape_still_works():
    """Backward compat (non-verbose callers, and existing tests above):
    when `objects_result` is absent, the legacy `search_result` key must
    still be read exactly as before."""
    results = [
        {"dataset_name": "workarounds_v1_9", "search_result": [{"text": "legacy chunk"}]},
    ]
    evidence = _flatten_and_truncate(results, limit=3)
    assert len(evidence) == 1
    assert evidence[0] == {
        "excerpt": "legacy chunk",
        "full_text": "legacy chunk",
        "source": "workarounds_v1_9",
    }


def test_confidence_from_results_inverts_best_distance_score():
    """ScoredResult.score is a raw cosine DISTANCE where lower is better
    (cognee/infrastructure/databases/vector/models/ScoredResult.py
    docstring) -- the helper must invert it (1 - score) so higher = more
    confident, and pick the single best (lowest-distance) score across every
    dataset's objects_result."""
    results = [
        {
            "dataset_name": "incidents",
            "objects_result": [_FakeScoredResult({"text": "a"}, score=0.4)],
        },
        {
            "dataset_name": "workarounds_v1_9",
            "objects_result": [
                _FakeScoredResult({"text": "b"}, score=0.1),  # best (lowest distance)
                _FakeScoredResult({"text": "c"}, score=0.9),
            ],
        },
    ]
    confidence = _confidence_from_results(results)
    assert confidence == 0.9


def test_confidence_from_results_clamps_out_of_range_scores():
    # A distance > 1.0 would otherwise invert to a negative confidence.
    results = [{"dataset_name": "d", "objects_result": [_FakeScoredResult({}, score=1.5)]}]
    assert _confidence_from_results(results) == 0.0


def test_confidence_from_results_returns_none_for_empty_input():
    assert _confidence_from_results([]) is None


def test_confidence_from_results_returns_none_when_no_objects_result_present():
    """Legacy (non-verbose) shape has no objects_result / no scores at all --
    must yield None, never raise."""
    results = [{"dataset_name": "workarounds_v1_9", "search_result": [{"text": "chunk"}]}]
    assert _confidence_from_results(results) is None
