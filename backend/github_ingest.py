"""POST /ingest/github -- ingest GitHub issues as tickets from a repo/issue
URL instead of a file upload (GIT-01).

Flow mirrors POST /ingest exactly: validate + fetch everything SYNCHRONOUSLY
inside the request handler (so bad URLs / 404s / rate limits surface as an
immediate short human message, never a stuck "processing" badge), then
schedule ONE background task that add()s + cognify()s the already-fetched
text sequentially -- reusing backend/ingest.py's proven `_schedule` +
`_ingest_all` path (and inheriting all its live-tested deviations: plain-str
add(), asyncio.create_task scheduling, sequential cognify).

SSRF guard (T-05-01): the client-supplied URL is never fetched. It is parsed
down to `owner`/`repo`/`issue number` components, each validated against a
strict allowlist regex, and the outbound request is always built against the
fixed `https://api.github.com` host. A crafted URL can therefore never
redirect the backend to an arbitrary host or path.

Issues fetched via GitHub's public REST API. Unauthenticated works (60
req/hr); set GITHUB_TOKEN in .env for 5000 req/hr. The issues list endpoint
also returns pull requests -- those are skipped (a PR carries a
"pull_request" key). Fetch cap is MAX_GITHUB_ISSUES to respect the $10
cognify budget.
"""

import logging
import os
import re
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import httpx  # noqa: E402
from fastapi import APIRouter  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from backend.datasets import INCIDENTS  # noqa: E402
from backend.ingest import _ingest_all, _schedule  # noqa: E402

router = APIRouter()
logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"

# Budget guard: each issue becomes one cognify()-bound document.
MAX_GITHUB_ISSUES = 10
# Comments fetched only in single-issue mode -- keeps list mode at one API call.
MAX_ISSUE_COMMENTS = 10
# Repo picker (GIT-02): most-recently-pushed repos shown in the dropdown.
MAX_GITHUB_REPOS = 30

FETCH_TIMEOUT_SECONDS = 15.0

# GitHub's own naming rules, as allowlists (T-05-01): usernames/orgs are
# alphanumeric + hyphen ONLY (no dots -- critical, or a bare host like
# "evil.com" or "github.com" itself would parse as an owner); repos also
# allow underscore and dot.
_OWNER_RE = re.compile(r"^[A-Za-z0-9-]+$")
_REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+$")

# Accepted URL shapes:
#   https://github.com/owner/repo
#   https://github.com/owner/repo/issues
#   https://github.com/owner/repo/issues/123
#   github.com/owner/repo            (scheme optional)
#   owner/repo                       (bare shorthand)
_GITHUB_URL_RE = re.compile(
    r"^(?:https?://)?(?:www\.)?(?:github\.com/)?"
    r"(?P<owner>[A-Za-z0-9-]+)/(?P<repo>[A-Za-z0-9_.-]+?)(?:\.git)?"
    r"(?:/issues(?:/(?P<number>[0-9]+))?)?/?$"
)

# D-24 short human messages -- never raw exception/API detail.
_MSG_INVALID_URL = (
    "Enter a GitHub repository or issue URL, e.g. https://github.com/owner/repo."
)
_MSG_NOT_FOUND = "GitHub repository or issue not found (is it private?)."
_MSG_RATE_LIMITED = "GitHub rate limit reached. Try again later or set GITHUB_TOKEN."
_MSG_FETCH_FAILED = "Couldn't fetch from GitHub. Please try again."
_MSG_NO_ISSUES = "No open or closed issues found in that repository."
_MSG_INVALID_USERNAME = "Enter a valid GitHub username."
_MSG_USER_NOT_FOUND = "GitHub user not found."


class GithubIngestRequest(BaseModel):
    url: str


def _parse_github_url(url: str) -> tuple[str, str, int | None] | None:
    """Parse a GitHub URL / shorthand into (owner, repo, issue_number|None).

    Returns None for anything that doesn't strictly match -- the components
    are re-validated against _OWNER_REPO_RE so nothing path-like ever
    reaches the outbound request builder (T-05-01)."""
    match = _GITHUB_URL_RE.match(url.strip())
    if not match:
        return None
    owner, repo = match.group("owner"), match.group("repo")
    if not _OWNER_RE.match(owner) or not _REPO_RE.match(repo):
        return None
    number = match.group("number")
    return owner, repo, int(number) if number else None


def _format_issue(issue: dict, comments: list[dict] | None = None) -> str:
    """Render one GitHub issue (+ optional comments) as the markdown ticket
    text handed to cognee.add() -- same plain-str path as file uploads."""
    labels = ", ".join(
        label.get("name", "") for label in issue.get("labels", []) if label.get("name")
    )
    user = (issue.get("user") or {}).get("login", "unknown")
    lines = [
        f"# GitHub Issue #{issue.get('number')}: {issue.get('title', '').strip()}",
        "",
        f"- State: {issue.get('state', 'unknown')}",
        f"- Author: {user}",
        f"- Created: {issue.get('created_at', 'unknown')}",
    ]
    if labels:
        lines.append(f"- Labels: {labels}")
    if issue.get("html_url"):
        lines.append(f"- URL: {issue['html_url']}")
    body = (issue.get("body") or "").strip()
    lines += ["", body if body else "(no description)"]
    for comment in comments or []:
        commenter = (comment.get("user") or {}).get("login", "unknown")
        comment_body = (comment.get("body") or "").strip()
        if comment_body:
            lines += ["", f"## Comment by {commenter}", "", comment_body]
    return "\n".join(lines)


def _github_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "PatchPilot",
    }
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def _fetch_issues(
    owner: str, repo: str, issue_number: int | None
) -> list[tuple[str, str]]:
    """Fetch issue(s) and return ingest-ready (filename, text) tuples --
    the exact item shape backend/ingest.py's _ingest_all consumes.

    Raises httpx.HTTPStatusError / httpx.HTTPError upward; the route handler
    maps those onto short human messages (D-24)."""
    async with httpx.AsyncClient(
        headers=_github_headers(), timeout=FETCH_TIMEOUT_SECONDS
    ) as client:
        if issue_number is not None:
            res = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}/issues/{issue_number}")
            res.raise_for_status()
            issue = res.json()
            comments: list[dict] = []
            if issue.get("comments", 0) > 0:
                comments_res = await client.get(
                    f"{GITHUB_API}/repos/{owner}/{repo}/issues/{issue_number}/comments",
                    params={"per_page": MAX_ISSUE_COMMENTS},
                )
                # Comments are enrichment only -- an issue without them is
                # still a perfectly good ticket.
                if comments_res.status_code == 200:
                    comments = comments_res.json()
            return [(f"issue-{issue_number}.md", _format_issue(issue, comments))]

        res = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/issues",
            params={"state": "all", "per_page": MAX_GITHUB_ISSUES},
        )
        res.raise_for_status()
        items = []
        for issue in res.json():
            if "pull_request" in issue:
                continue  # the issues list endpoint includes PRs -- skip them
            items.append((f"issue-{issue.get('number')}.md", _format_issue(issue)))
        return items


@router.get("/github/repos")
async def list_github_repos(username: str):
    """GIT-02: list a user's public repos for the in-app repo picker, so
    issues are imported by SELECTING a repo -- never by pasting a URL.

    Same T-05-01 posture as ingest: the client-supplied username is
    allowlist-validated and the outbound request is always built against the
    fixed api.github.com host. Response is {status:"ok", repos:[...]} or the
    D-24 short-message error shape."""
    candidate = (username or "").strip()
    if not _OWNER_RE.match(candidate):
        return {"status": "error", "message": _MSG_INVALID_USERNAME}

    try:
        async with httpx.AsyncClient(
            headers=_github_headers(), timeout=FETCH_TIMEOUT_SECONDS
        ) as client:
            res = await client.get(
                f"{GITHUB_API}/users/{candidate}/repos",
                params={"sort": "pushed", "per_page": MAX_GITHUB_REPOS},
            )
            res.raise_for_status()
            payload = res.json()
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        logger.warning("GitHub repo list failed for %s: HTTP %s", candidate, status)
        if status == 404:
            return {"status": "error", "message": _MSG_USER_NOT_FOUND}
        if status in (403, 429):
            return {"status": "error", "message": _MSG_RATE_LIMITED}
        return {"status": "error", "message": _MSG_FETCH_FAILED}
    except httpx.HTTPError:
        logger.exception("GitHub repo list failed for %s", candidate)
        return {"status": "error", "message": _MSG_FETCH_FAILED}

    repos = [
        {
            "full_name": repo.get("full_name", ""),
            "description": (repo.get("description") or "")[:140],
            "open_issues": repo.get("open_issues_count", 0),
            "pushed_at": repo.get("pushed_at"),
        }
        for repo in payload
        if repo.get("full_name")
    ]
    return {"status": "ok", "repos": repos}


@router.post("/ingest/github")
async def ingest_github(request: GithubIngestRequest):
    """GIT-01: fetch GitHub issue(s) from a URL and ingest them as tickets
    into the incidents dataset. Response shape mirrors POST /ingest exactly
    ({status, dataset, files}) so the frontend reuses the same status
    polling + row rendering."""
    parsed = _parse_github_url(request.url)
    if parsed is None:
        return {"status": "error", "message": _MSG_INVALID_URL}
    owner, repo, issue_number = parsed

    try:
        items = await _fetch_issues(owner, repo, issue_number)
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        logger.warning(
            "GitHub fetch failed for %s/%s (issue=%s): HTTP %s",
            owner, repo, issue_number, status,
        )
        if status == 404:
            return {"status": "error", "message": _MSG_NOT_FOUND}
        if status in (403, 429):
            return {"status": "error", "message": _MSG_RATE_LIMITED}
        return {"status": "error", "message": _MSG_FETCH_FAILED}
    except httpx.HTTPError:
        logger.exception("GitHub fetch failed for %s/%s (issue=%s)", owner, repo, issue_number)
        return {"status": "error", "message": _MSG_FETCH_FAILED}

    if not items:
        return {"status": "error", "message": _MSG_NO_ISSUES}

    _schedule(_ingest_all(items, INCIDENTS))
    return {
        "status": "accepted",
        "dataset": INCIDENTS,
        "files": [filename for filename, _ in items],
    }
