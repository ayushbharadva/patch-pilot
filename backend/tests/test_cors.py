"""Regression tests for the CORS origin allowlist (Jul 6 production incident).

The live Render service's dashboard env vars are not synced from render.yaml,
so a stale ``CORS_ORIGINS`` (localhost-only) made Starlette's CORSMiddleware
reject the Vercel frontend's preflight with 400 "Disallowed CORS origin" —
every browser call from https://patchpilotapp.vercel.app failed before ever
reaching a route handler.

The fix bakes the canonical frontend origins into backend/main.py and treats
``CORS_ORIGINS`` as an *extension* of that list, never a replacement, plus a
scoped regex for this project's Vercel preview deployments. Each test here
reimports backend.main under a controlled ``CORS_ORIGINS`` value because the
allowlist is fixed at import time.
"""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from fastapi.testclient import TestClient  # noqa: E402

PRODUCTION_ORIGIN = "https://patchpilotapp.vercel.app"
STALE_ENV = "http://localhost:3000"  # the value the Render dashboard was stuck on


def _client(monkeypatch, cors_origins_env):
    """Build a TestClient against a freshly imported backend.main.

    The CORS allowlist is computed at module import, so the module must be
    evicted and reimported for the patched env var to take effect. Requests
    are made without entering the client's context manager so the app's
    lifespan (Cognee migrations) never runs — preflight OPTIONS is answered
    entirely by CORSMiddleware.
    """
    if cors_origins_env is None:
        monkeypatch.delenv("CORS_ORIGINS", raising=False)
    else:
        monkeypatch.setenv("CORS_ORIGINS", cors_origins_env)
    sys.modules.pop("backend.main", None)
    import backend.main  # noqa: E402

    return TestClient(backend.main.app)


def _preflight(client, origin):
    return client.options(
        "/search",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )


def test_production_origin_allowed_despite_stale_env(monkeypatch):
    """The exact production failure: stale localhost-only CORS_ORIGINS must
    no longer be able to lock out the deployed Vercel frontend."""
    res = _preflight(_client(monkeypatch, STALE_ENV), PRODUCTION_ORIGIN)
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == PRODUCTION_ORIGIN


def test_production_origin_allowed_when_env_unset(monkeypatch):
    res = _preflight(_client(monkeypatch, None), PRODUCTION_ORIGIN)
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == PRODUCTION_ORIGIN


def test_vercel_preview_origin_allowed(monkeypatch):
    preview = "https://patchpilotapp-git-fix-cors-ayushbharadva.vercel.app"
    res = _preflight(_client(monkeypatch, STALE_ENV), preview)
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == preview


def test_env_var_extends_allowlist(monkeypatch):
    extra = "https://staging.example.com"
    client = _client(monkeypatch, f"{STALE_ENV},{extra}")
    res = _preflight(client, extra)
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == extra


def test_unknown_origin_still_rejected(monkeypatch):
    """The allowlist must stay an allowlist — no wildcard regression."""
    res = _preflight(_client(monkeypatch, STALE_ENV), "https://evil.example.com")
    assert res.status_code == 400
    assert "access-control-allow-origin" not in res.headers


def test_foreign_vercel_project_rejected(monkeypatch):
    """The preview regex is scoped to this project's subdomain prefix, not
    all of *.vercel.app."""
    res = _preflight(_client(monkeypatch, STALE_ENV), "https://other-app.vercel.app")
    assert res.status_code == 400
    assert "access-control-allow-origin" not in res.headers
