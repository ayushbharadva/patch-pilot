"""PatchPilot FastAPI backend — GET /health/cognee, POST /search,
POST /ingest, GET /ingest/status, POST /sample/load.

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
import sys  # noqa: E402
import uuid  # noqa: E402
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
from backend.ingest import router as ingest_router  # noqa: E402
from backend.search import router as search_router  # noqa: E402

app = FastAPI()

# Explicit single-origin allowlist — never a wildcard (T-02-01). Next.js dev
# server only; add the deployed frontend origin here when one exists.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)

HEALTH_FIXTURE = "PatchPilot health canary: widget X fails on retry."
HEALTH_QUERY = "widget X"


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
