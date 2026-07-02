"""Unit tests for backend/search.py's pure helpers — in-memory fakes only,
no network / no Cognee calls (RECALL-01/02 behavior contract)."""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.search import (  # noqa: E402
    _active_search_datasets,
    _flatten_and_truncate,
    _is_ungrounded_answer,
    _pick_primary_result,
)
from backend.datasets import INCIDENTS  # noqa: E402


class _FakeDataset:
    def __init__(self, name: str):
        self.name = name


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

    import cognee

    monkeypatch.setattr(cognee.datasets, "list_datasets", _fake_list_datasets)

    active = await _active_search_datasets()
    assert active == [INCIDENTS, "workarounds_v1_8", "workarounds_v1_9"]
