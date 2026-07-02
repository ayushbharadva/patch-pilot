"""Unit tests for backend/ingest.py's pure validation + routing helpers --
in-memory only, no network / no Cognee calls (INGEST-01/RELEASE-01 behavior
contract, T-02-05/T-02-06)."""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.ingest import (  # noqa: E402
    _route_dataset,
    _validate_extension,
    _validate_release_version,
)
from backend.datasets import INCIDENTS  # noqa: E402


def test_validate_release_version_accepts_numeric_underscore_forms():
    assert _validate_release_version("1_9")
    assert _validate_release_version("2")
    assert _validate_release_version("1_10")


def test_validate_release_version_rejects_injection_and_collision_strings():
    assert not _validate_release_version("1_9; drop")
    assert not _validate_release_version("../x")
    assert not _validate_release_version("incidents")
    assert not _validate_release_version("")
    assert not _validate_release_version(None)


def test_validate_extension_accepts_allowlisted_types():
    assert _validate_extension("ticket.md")
    assert _validate_extension("chat.txt")
    assert _validate_extension("release.json")
    assert _validate_extension("MixedCase.MD")


def test_validate_extension_rejects_disallowed_or_missing():
    assert not _validate_extension("script.exe")
    assert not _validate_extension("run.sh")
    assert not _validate_extension("noext")
    assert not _validate_extension(None)
    assert not _validate_extension("")


def test_route_dataset_sends_release_note_to_versioned_workarounds():
    assert _route_dataset("release_note", "1_9") == "workarounds_v1_9"
    assert _route_dataset("release_note", "2") == "workarounds_v2"


def test_route_dataset_sends_other_content_types_to_incidents():
    assert _route_dataset("ticket", None) == INCIDENTS
    assert _route_dataset("chat", None) == INCIDENTS
    assert _route_dataset("changelog", None) == INCIDENTS
