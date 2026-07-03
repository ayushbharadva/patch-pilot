"""POST /reset — restore the fresh demo snapshot for a one-click, zero-cost
repeatable demo reset (DEMO-01 / D-03).

Mirrors backend/forget.py's config-before-cognee import order and D-24
error-handling shape (never leak raw exception text). The core mechanism
comes from 04-RESEARCH.md Pattern 4 ("Windows-safe file-handle release"):
cognee caches its graph/vector engine adapters behind `closing_lru_cache`
factories and its relational (SQLite) engine behind a plain `lru_cache`.
`cognee.prune.prune_system()`'s own cache-clear side effects only cover the
graph/vector engines -- the relational engine's SQLAlchemy `AsyncEngine`
must be explicitly disposed first, or `shutil.rmtree()` in
scripts/snapshot_memory.py::restore() raises a Windows `PermissionError`
(WinError 32) against still-open sqlite.db/-shm/-wal handles.

Import order follows the config-before-import keystone (see
backend/cognee_config.py's module docstring): backend.cognee_config, then
cognee, then backend.cognee_patches, before anything else touches Cognee.
"""

import logging

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: F401,E402  (imported for side effects consistent with sibling routers; not called directly here)
from fastapi import APIRouter  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)

router = APIRouter()
logger = logging.getLogger(__name__)

# D-24 short human message -- never raw exception/validation detail. Must
# match frontend/lib/api.ts's resetMemory() fallback message verbatim.
_MSG_ERROR = "Could not reset memory. Please try again."


@router.post("/reset")
async def reset_memory():
    """Release every open Cognee engine file handle (Windows-safe order:
    relational dispose -> relational cache_clear -> vector cache_clear ->
    graph cache_clear), then delegate the filesystem swap to the unmodified
    scripts/snapshot_memory module's restore function -- restoring the
    enriched, pre-flip snapshot captured in Plan 01 (D-03: reset = snapshot
    restore, not prune+reseed)."""
    try:
        # Imported inside the function body (per RESEARCH.md's verified
        # skeleton) so this import cost -- and any private-API surface
        # risk -- is paid only on an actual reset, not on module load.
        from cognee.infrastructure.databases.graph.get_graph_engine import (
            _create_graph_engine,
        )
        from cognee.infrastructure.databases.relational import get_relational_engine
        from cognee.infrastructure.databases.relational.create_relational_engine import (
            create_relational_engine,
        )
        from cognee.infrastructure.databases.vector.create_vector_engine import (
            _create_vector_engine,
        )

        db_engine = get_relational_engine()
        await db_engine.engine.dispose()  # releases sqlite.db/-shm/-wal handles
        create_relational_engine.cache_clear()  # plain lru_cache -- drops the stale reference
        _create_vector_engine.cache_clear()  # closing_lru_cache -- evicts + closes every cached LanceDB adapter
        _create_graph_engine.cache_clear()  # closing_lru_cache -- evicts + closes every cached Kuzu/Ladybug adapter

        from scripts import snapshot_memory

        snapshot_memory.restore()
        return {"status": "reset"}
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        logger.exception("reset failed")
        return {"status": "error", "message": _MSG_ERROR}
