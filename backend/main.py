"""PatchPilot FastAPI backend — Phase 1 exit-gate: GET /health/cognee.

Run with (single worker — Kuzu is file-locked; bind to localhost only):

    cd backend && ../.venv/bin/uvicorn main:app --workers 1 --host 127.0.0.1

No CORS middleware is added in Phase 1 (no browser origin exists yet — the
Next.js frontend lands in Phase 2). If CORS is ever added, never allow a
wildcard origin (breaks `allow_credentials=True` and is a real security
risk); pin an explicit origin list instead.

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

import sys  # noqa: E402
from pathlib import Path  # noqa: E402

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from cognee import SearchType  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import HEALTHCHECK  # noqa: E402

app = FastAPI()

HEALTH_FIXTURE = "PatchPilot health canary: widget X fails on retry."
HEALTH_QUERY = "widget X"


@app.get("/health/cognee")
async def health_cognee():
    """Exercise a real add -> cognify -> search -> forget round-trip.

    Proves the Cognee lifecycle works end-to-end in <30s (PLAT-01) using a
    single throwaway fixture in the HEALTHCHECK dataset, then forgets it so
    it never accumulates in real memory.
    """
    try:
        await cognee.add(HEALTH_FIXTURE, dataset_name=HEALTHCHECK)
        await cognee.cognify(datasets=[HEALTHCHECK])
        results = await cognee.search(
            query_text=HEALTH_QUERY,
            query_type=SearchType.GRAPH_COMPLETION,
            datasets=[HEALTHCHECK],
        )
        return JSONResponse({"status": "ok", "results": len(results)})
    except Exception as e:  # noqa: BLE001 - health check must never raise
        return JSONResponse({"status": "unhealthy", "error": str(e)}, status_code=503)
    finally:
        # Clean up the throwaway fixture unconditionally so it never
        # pollutes real datasets, even if the round-trip above failed.
        try:
            await cognee.forget(dataset=HEALTHCHECK)
        except Exception:  # noqa: BLE001 - best-effort cleanup only
            pass
