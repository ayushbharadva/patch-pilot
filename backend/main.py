"""PatchPilot FastAPI backend — GET /health/cognee, POST /search,
POST /ingest, GET /ingest/status, POST /sample/load, POST /feedback/accept,
GET /datasets, POST /forget.

Run with (single worker — Kuzu is file-locked; bind to localhost only):

    cd backend && ../.venv/bin/uvicorn main:app --workers 1 --host 127.0.0.1

CORS is enabled for the Next.js dev origin only (Phase 2 — first phase with
a browser origin). The origin list is always explicit — never a wildcard
(a wildcard breaks `allow_credentials=True` and is a real security risk).

Note on import style: this module deliberately imports its sibling modules
as `backend.cognee_config` / `backend.datasets` (package-qualified) rather
than bare `import cognee_config` / `import datasets`. A bare `import
datasets` would register `sys.modules["datasets"]` under our own module,
which fools lancedb's optional HuggingFace-datasets integration
(`lancedb/scannable.py` checks `"datasets" in sys.modules`) into trying to
import `Dataset`/`DatasetDict` from *our* module and crashing the health
round-trip with an ImportError. The repo root is added to `sys.path` below
so the package-qualified imports resolve correctly even when uvicorn is run
with `backend/` as the working directory.
"""

import logging  # noqa: E402
import os  # noqa: E402
import sys  # noqa: E402
import uuid  # noqa: E402
from contextlib import asynccontextmanager  # noqa: E402
from pathlib import Path  # noqa: E402

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from cognee import SearchType  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import HEALTHCHECK  # noqa: E402
from backend.datasets_router import router as datasets_router  # noqa: E402
from backend.events import router as events_router  # noqa: E402
from backend.feedback import router as feedback_router  # noqa: E402
from backend.forget import router as forget_router  # noqa: E402
from backend.github_ingest import router as github_ingest_router  # noqa: E402
from backend.graph import router as graph_router  # noqa: E402
from backend.ingest import router as ingest_router  # noqa: E402
from backend.qa import router as qa_router  # noqa: E402
from backend.reset import router as reset_router  # noqa: E402
from backend.search import router as search_router  # noqa: E402

@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Cognee's schema/table creation (Alembic relational migrations + the
    # graph/vector revision chain) only auto-runs from Cognee's OWN bundled
    # FastAPI server (cognee/api/client.py) or the first remember()/cognify()
    # call in an SDK process -- neither applies here, since this is our own
    # FastAPI app calling the library directly. Without this, a genuinely
    # fresh SQLite file (e.g. a Render disk with no snapshot restored) has
    # directories but no tables, and even a read-only call like
    # list_datasets() -> get_default_user() raises DatabaseNotCreatedError.
    # Idempotent and cheap after the first run (guarded by
    # cognee.modules.migrations.startup's per-process flag).
    await cognee.run_migrations()
    yield


app = FastAPI(lifespan=lifespan)

# Explicit origin allowlist — never a wildcard (T-02-01). The canonical
# frontend origins are baked in and always allowed: env vars set in the Render
# dashboard are not synced from render.yaml, so a stale CORS_ORIGINS there
# must never be able to lock the production frontend out. CORS_ORIGINS
# (comma-separated) *extends* the list rather than replacing it.
_BAKED_IN_ORIGINS = [
    "http://localhost:3000",
    "https://patchpilotapp.vercel.app",
]
_env_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
_cors_origins = list(dict.fromkeys(_BAKED_IN_ORIGINS + _env_origins))
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    # Vercel preview deployments of this project only (e.g.
    # patchpilotapp-git-<branch>-<team>.vercel.app) — scoped to the project
    # subdomain prefix, not a *.vercel.app wildcard.
    allow_origin_regex=r"^https://patchpilotapp-[a-z0-9-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

logger = logging.getLogger(__name__)

HEALTH_FIXTURE = "PatchPilot health canary: widget X fails on retry."
HEALTH_QUERY = "widget X"


@app.get("/health")
async def health():
    """Lightweight liveness probe for Render — no LLM calls."""
    return JSONResponse({"status": "ok"})


@app.get("/health/cognee")
async def health_cognee():
    """Exercise a real add -> cognify -> search -> forget round-trip.

    Proves the Cognee lifecycle works end-to-end in <30s (PLAT-01) using a
    single throwaway fixture in a per-request HEALTHCHECK dataset, then
    forgets it so it never accumulates in real memory. The dataset name is
    suffixed with a per-request unique id so concurrent health checks never
    collide on the same underlying dataset -- without this, one request's
    `forget()` in `finally` could delete the dataset while another
    concurrent request's add/cognify/search is still in flight.
    """
    dataset_name = f"{HEALTHCHECK}_{uuid.uuid4().hex}"
    try:
        await cognee.add(HEALTH_FIXTURE, dataset_name=dataset_name)
        await cognee.cognify(datasets=[dataset_name])
        results = await cognee.search(
            query_text=HEALTH_QUERY,
            query_type=SearchType.GRAPH_COMPLETION,
            datasets=[dataset_name],
        )
        return JSONResponse({"status": "ok", "results": len(results)})
    except Exception:  # noqa: BLE001 - health check must never raise
        logger.exception("Cognee health check failed")
        return JSONResponse({"status": "unhealthy"}, status_code=503)
    finally:
        # Clean up the throwaway fixture unconditionally so it never
        # pollutes real datasets, even if the round-trip above failed.
        try:
            await cognee.forget(dataset=dataset_name)
        except Exception:  # noqa: BLE001 - best-effort cleanup only
            logger.warning(
                "Failed to forget healthcheck dataset %s; may leak into memory",
                dataset_name,
                exc_info=True,
            )


app.include_router(search_router)
app.include_router(ingest_router)
app.include_router(github_ingest_router)
app.include_router(feedback_router)
app.include_router(datasets_router)
app.include_router(forget_router)
app.include_router(reset_router)
app.include_router(graph_router)
app.include_router(events_router)
app.include_router(qa_router)
