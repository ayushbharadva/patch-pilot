"""Unit tests for backend/github_ingest.py's pure URL-parsing + formatting
helpers -- in-memory only, no network / no Cognee calls (GIT-01 behavior
contract, T-05-01 SSRF guard)."""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.github_ingest import _format_issue, _parse_github_url  # noqa: E402


def test_parse_accepts_full_repo_url_forms():
    assert _parse_github_url("https://github.com/octocat/hello-world") == (
        "octocat", "hello-world", None,
    )
    assert _parse_github_url("http://www.github.com/octocat/hello-world/") == (
        "octocat", "hello-world", None,
    )
    assert _parse_github_url("https://github.com/octocat/hello-world.git") == (
        "octocat", "hello-world", None,
    )


def test_parse_accepts_bare_shorthand_and_issues_forms():
    assert _parse_github_url("octocat/hello-world") == ("octocat", "hello-world", None)
    assert _parse_github_url("github.com/octocat/hello-world/issues") == (
        "octocat", "hello-world", None,
    )
    assert _parse_github_url("https://github.com/octocat/hello-world/issues/42") == (
        "octocat", "hello-world", 42,
    )


def test_parse_rejects_non_github_and_malformed_urls():
    assert _parse_github_url("https://evil.com/octocat/hello-world") is None
    assert _parse_github_url("https://github.com/octocat") is None
    assert _parse_github_url("https://github.com/octocat/repo/pulls/1") is None
    assert _parse_github_url("octocat/repo/issues/notanumber") is None
    assert _parse_github_url("") is None
    assert _parse_github_url("   ") is None


def test_parse_rejects_path_injection_components():
    # T-05-01: nothing path-like may survive into the api.github.com URL.
    assert _parse_github_url("https://github.com/../../etc/passwd") is None
    assert _parse_github_url("owner/repo%2f..%2fsecrets") is None
    assert _parse_github_url("https://github.com/o w n e r/repo") is None


def test_format_issue_renders_title_metadata_and_body():
    issue = {
        "number": 42,
        "title": "Retry loop hangs on 429",
        "state": "open",
        "user": {"login": "octocat"},
        "created_at": "2026-06-01T00:00:00Z",
        "labels": [{"name": "bug"}, {"name": "payments"}],
        "html_url": "https://github.com/o/r/issues/42",
        "body": "Webhook retries never back off.",
    }
    text = _format_issue(issue)
    assert "# GitHub Issue #42: Retry loop hangs on 429" in text
    assert "- State: open" in text
    assert "- Author: octocat" in text
    assert "- Labels: bug, payments" in text
    assert "Webhook retries never back off." in text


def test_format_issue_handles_missing_body_and_appends_comments():
    issue = {"number": 7, "title": "Crash", "state": "closed", "body": None}
    comments = [
        {"user": {"login": "alice"}, "body": "Fixed by upgrading the SDK."},
        {"user": None, "body": ""},  # empty comment bodies are skipped
    ]
    text = _format_issue(issue, comments)
    assert "(no description)" in text
    assert "## Comment by alice" in text
    assert "Fixed by upgrading the SDK." in text
    assert text.count("## Comment by") == 1
