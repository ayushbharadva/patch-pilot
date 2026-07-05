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

NINTH DEVIATION (found live-testing 04-04's timing harness, Rule 1 bug --
a real reset-endpoint regression predating this plan, not something the
harness itself introduces): even after the relational/vector/graph
handle-release above, `shutil.rmtree()` still raised the identical Windows
`PermissionError` (WinError 32), this time against
`.patchpilot_memory/databases/cache.db` -- a SEPARATE SQLite database
cognee's session/feedback cache layer (`CACHING=true`, see
backend/cognee_config.py) opens via its own
`cognee.infrastructure.databases.cache.get_cache_engine` factory, which
04-RESEARCH.md's Pattern 4 audit never enumerated (that cache engine did
not exist -- or wasn't yet held open by any code path this app exercises --
when Plan 02 was researched/built). Cognee ships a purpose-built,
already-Windows-safe release helper for exactly this handle:
`close_cache_engine()` (awaits the adapter's own `engine.dispose(close=True)`
then clears its `lru_cache`, the identical shape as the relational engine
release two lines below). Fixed by awaiting it alongside the other three
releases, in the same Windows-safe order (most cognee lifecycle helpers in
this codebase release handles narrowest-first): cache -> relational ->
relational cache-clear -> vector cache-clear -> graph cache-clear.

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
        from cognee.infrastructure.databases.cache.get_cache_engine import (
            close_cache_engine,
        )
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

        # NINTH DEVIATION above: cache.db is a distinct SQLite handle from
        # the relational engine's own sqlite.db -- must be released first
        # via cognee's own close_cache_engine() (awaits the adapter's
        # engine.dispose(close=True), then clears its lru_cache) or
        # shutil.rmtree() raises WinError 32 against it.
        await close_cache_engine()
        db_engine = get_relational_engine()
        await db_engine.engine.dispose()  # releases sqlite.db/-shm/-wal handles
        create_relational_engine.cache_clear()  # plain lru_cache -- drops the stale reference
        _create_vector_engine.cache_clear()  # closing_lru_cache -- evicts + closes every cached LanceDB adapter
        _create_graph_engine.cache_clear()  # closing_lru_cache -- evicts + closes every cached Kuzu/Ladybug adapter

        from scripts import snapshot_memory

        snapshot_memory.restore()

        # OPS-01: wipe the ops feed too, so it narrates the restored
        # snapshot's timeline rather than pre-reset history.
        from backend.events import clear_events

        clear_events()
        return {"status": "reset"}
    except (Exception, SystemExit):  # noqa: BLE001 - D-24: never leak raw exception
        # text. snapshot_memory.restore() now raises FileNotFoundError (a normal
        # Exception) instead of calling sys.exit() directly (CR-01), but SystemExit
        # is caught here too as defense-in-depth: SystemExit is a BaseException that
        # asyncio's task machinery deliberately does NOT swallow, so any future
        # CLI-style sys.exit() reintroduced anywhere in this call chain would
        # otherwise kill the entire running uvicorn worker instead of degrading to
        # this graceful error response.
        logger.exception("reset failed")
        return {"status": "error", "message": _MSG_ERROR}
