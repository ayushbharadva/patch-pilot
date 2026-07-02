"""Unit tests for drift classification (backend/drift.py) and the
_pick_primary_result drift-exclusion extension (backend/search.py) -- in
in-memory fakes only, no network / no Cognee calls (DRIFT-01/02/03 behavior
contract)."""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.datasets import INCIDENTS  # noqa: E402
from backend.drift import compute_drift_states  # noqa: E402
from backend.search import _pick_primary_result  # noqa: E402


def test_drift_reuses_shared_version_regex_not_a_duplicate():
    """RESEARCH.md 'Don't Hand-Roll' -- drift.py must import the shared
    regex/sort-key from search.py, never redefine its own copy."""
    drift_source = (_REPO_ROOT / "backend" / "drift.py").read_text()
    assert "from backend.search import" in drift_source


def test_compute_drift_states_stripe_arc_highest_stable_others_drifting():
    states = compute_drift_states([INCIDENTS, "workarounds_v1_8", "workarounds_v1_9"])
    assert states == {
        INCIDENTS: "stable",
        "workarounds_v1_8": "drifting",
        "workarounds_v1_9": "stable",
    }


def test_compute_drift_states_lone_version_is_its_own_max():
    states = compute_drift_states(["workarounds_v1_9"])
    assert states == {"workarounds_v1_9": "stable"}


def test_compute_drift_states_no_versioned_datasets_all_stable():
    states = compute_drift_states([INCIDENTS])
    assert states == {INCIDENTS: "stable"}


def test_compute_drift_states_aging_branch_via_injected_candidates():
    """D-05 Option B: aging is a real, unit-tested branch reachable only via
    an injected relatedness set -- never fires from version comparison
    alone."""
    states = compute_drift_states(
        ["workarounds_v1_9"], aging_candidates={"workarounds_v1_9"}
    )
    assert states == {"workarounds_v1_9": "aging"}


def test_compute_drift_states_non_max_never_demoted_to_aging():
    """Pitfall 3: the drifting check runs BEFORE the aging check, so a
    non-max name flagged in aging_candidates by mistake still stays
    drifting, never demoted to aging."""
    states = compute_drift_states(
        [INCIDENTS, "workarounds_v1_8", "workarounds_v1_9"],
        aging_candidates={"workarounds_v1_8"},
    )
    assert states["workarounds_v1_8"] == "drifting"


def test_pick_primary_result_excludes_drifting_even_if_highest_version():
    results = [
        {"dataset_name": "workarounds_v1_8", "search_result": "old fix: dedup_sweeper"},
        {"dataset_name": "workarounds_v1_9", "search_result": "new fix: idempotency_guard"},
    ]
    drift_states = {"workarounds_v1_9": "drifting", "workarounds_v1_8": "stable"}
    primary = _pick_primary_result(results, drift_states)
    assert primary is not None
    assert primary["dataset_name"] == "workarounds_v1_8"


def test_pick_primary_result_returns_none_when_all_non_drifting_candidates_empty():
    results = [
        {"dataset_name": "workarounds_v1_8", "search_result": ""},
        {"dataset_name": "workarounds_v1_9", "search_result": "new fix"},
    ]
    drift_states = {"workarounds_v1_9": "drifting", "workarounds_v1_8": "stable"}
    primary = _pick_primary_result(results, drift_states)
    assert primary is None


def test_pick_primary_result_without_drift_states_arg_still_works():
    """Backward compatibility: existing callers (test_search_helpers.py) call
    _pick_primary_result(results) with no drift_states -- must default to
    treating everything as non-drifting."""
    results = [
        {"dataset_name": "workarounds_v1_8", "search_result": "old fix: dedup_sweeper"},
        {"dataset_name": "workarounds_v1_9", "search_result": "new fix: idempotency_guard"},
    ]
    primary = _pick_primary_result(results)
    assert primary is not None
    assert primary["dataset_name"] == "workarounds_v1_9"
