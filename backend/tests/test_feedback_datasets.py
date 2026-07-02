"""Unit tests for backend/feedback.py + backend/datasets_router.py's pure
helpers — in-memory fakes only, no network / no Cognee calls (FEEDBACK-01/02,
RELEASE-01 behavior contract, D-10, D-15, T-02-09)."""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.datasets_router import _is_display_dataset, router as datasets_router  # noqa: E402
from backend.feedback import _is_known_dataset, router as feedback_router  # noqa: E402


class _FakeDataset:
    def __init__(self, name: str):
        self.name = name


# --- _is_display_dataset (D-15, T-02-11) ---------------------------------


def test_is_display_dataset_keeps_durable_and_demo_datasets():
    assert _is_display_dataset("incidents")
    assert _is_display_dataset("workarounds_v1_8")
    assert _is_display_dataset("workarounds_v1_9")


def test_is_display_dataset_drops_throwaway_exact_names():
    assert not _is_display_dataset("healthcheck")
    assert not _is_display_dataset("canary")


def test_is_display_dataset_drops_uuid_suffixed_throwaways():
    assert not _is_display_dataset("healthcheck_ab12")
    assert not _is_display_dataset("canary_ff01")


def test_is_display_dataset_handles_empty_name():
    assert not _is_display_dataset("")


# --- source_dataset validation (RESEARCH Pitfall 2 / T-02-09) ------------


async def test_is_known_dataset_accepts_name_present_in_live_list(monkeypatch):
    fake_datasets = [
        _FakeDataset("incidents"),
        _FakeDataset("workarounds_v1_9"),
    ]

    async def _fake_list_datasets():
        return fake_datasets

    import cognee

    monkeypatch.setattr(cognee.datasets, "list_datasets", _fake_list_datasets)

    assert await _is_known_dataset("workarounds_v1_9")


async def test_is_known_dataset_rejects_name_absent_from_live_list(monkeypatch):
    fake_datasets = [
        _FakeDataset("incidents"),
        _FakeDataset("workarounds_v1_9"),
    ]

    async def _fake_list_datasets():
        return fake_datasets

    import cognee

    monkeypatch.setattr(cognee.datasets, "list_datasets", _fake_list_datasets)

    assert not await _is_known_dataset("some_forged_dataset")


# --- D-10: no reject route exists on the feedback router ------------------


def test_feedback_router_has_no_reject_route():
    paths = {route.path for route in feedback_router.routes}
    assert "/feedback/accept" in paths
    assert not any("reject" in path for path in paths)


def test_datasets_router_has_list_route():
    paths = {route.path for route in datasets_router.routes}
    assert "/datasets" in paths
