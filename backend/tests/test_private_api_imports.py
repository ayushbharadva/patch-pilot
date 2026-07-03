"""Collection-time smoke test for the private/internal Cognee APIs
backend/graph.py and backend/reset.py depend on (WR-02).

Both modules deliberately reach into non-public cognee internals -- there
is no public wrapper for cross-user graph aggregation or for the
individual engine-cache-clear handles the Windows-safe reset sequence
needs. That is a documented, researched trade-off (see graph.py's and
reset.py's module docstrings), but it means a future cognee dependency
bump (even a patch release) can silently rename or remove any of these
symbols with zero CI signal -- otherwise only discoverable live during a
demo rehearsal.

This test imports each private symbol exactly the way graph.py/reset.py
do and asserts it is callable. It intentionally does NOT call any of
them (no live Cognee engine, no network, no LLM cost) -- it only proves
the import path is still valid, so an API rename fails fast in CI
instead of at demo time."""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: F401,E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)


def test_graph_py_private_imports_still_resolve():
    """backend/graph.py's exact import set (GRAPH-01)."""
    from cognee.modules.users.methods import get_default_user
    from cognee.modules.data.methods import get_authorized_existing_datasets
    from cognee.modules.visualization.cognee_network_visualization import (
        aggregate_multi_user_graphs,
    )

    assert callable(get_default_user)
    assert callable(get_authorized_existing_datasets)
    assert callable(aggregate_multi_user_graphs)


def test_reset_py_private_imports_still_resolve():
    """backend/reset.py's exact import set (DEMO-01 / D-03)."""
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

    assert callable(close_cache_engine)
    assert callable(get_relational_engine)
    assert callable(create_relational_engine)
    assert callable(_create_vector_engine)
    assert callable(_create_graph_engine)
    # cache_clear() is what reset.py actually calls on these two --
    # confirm the closing_lru_cache/lru_cache wrapping is still present.
    assert hasattr(create_relational_engine, "cache_clear")
    assert hasattr(_create_vector_engine, "cache_clear")
    assert hasattr(_create_graph_engine, "cache_clear")
