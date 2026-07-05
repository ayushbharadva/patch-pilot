"""GET /graph — export the real Cognee-extracted knowledge graph as a
force-graph-ready `{nodes, links}` payload, aggregated across every live
dataset (GRAPH-01, D-06/D-07/D-08).

This exports the ACTUAL `cognify`-produced graph (via cognee's own
`get_graph_data()` + `aggregate_multi_user_graphs`), never a mock — proving
Cognee builds a real knowledge graph, not just a search index (the heavily
weighted "Best Use of Cognee" axis).

Import order follows the config-before-import keystone (see
backend/cognee_config.py's module docstring): backend.cognee_config, then
cognee, then backend.cognee_patches, before anything else touches Cognee.
"""

import logging

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: F401,E402
from fastapi import APIRouter  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.drift import compute_drift_states  # noqa: E402  same drift notion as /datasets
from backend.search import _active_search_datasets  # noqa: E402  reuse live-dataset discovery, don't re-derive

router = APIRouter()
logger = logging.getLogger(__name__)

# D-24 short human message — never leak raw exception text to the browser.
_MSG_ERROR = "Could not load memory graph. Please try again."

# Node label cap (RESEARCH.md to_force_graph_json) — keeps labels readable on
# a demo screen and bounds payload size.
_LABEL_MAX = 80


def _node_label(node_id: str, props: dict) -> str:
    """Human-readable label for a node, trimmed to a demo-readable length.

    CRITICAL (T-04-06 / RESEARCH.md "Trim large fields"): only name/type/id
    ever survive into the label — the raw DocumentChunk `text`/full-content
    properties are NEVER forwarded to the browser."""
    raw = props.get("name") or props.get("type") or node_id
    return str(raw)[:_LABEL_MAX]


@router.get("/graph")
async def get_memory_graph():
    """Aggregate the live datasets' per-dataset-isolated Cognee graphs into a
    single dense `{nodes, links}` view (RESEARCH.md Pattern 3). Reuses
    `_active_search_datasets()` so /graph and /search never disagree on which
    datasets are live."""
    try:
        # Reuse the exact same live-dataset discipline /search and /datasets
        # share — do not re-derive the list independently.
        names = await _active_search_datasets()
        if not names:
            return {"status": "ok", "nodes": [], "links": []}

        # Imported here (not at module top) to keep the config-before-cognee
        # import keystone intact and avoid paying the import cost unless the
        # endpoint is actually hit.
        from cognee.modules.users.methods import get_default_user
        from cognee.modules.data.methods import get_authorized_existing_datasets

        # aggregate_multi_user_graphs is NOT exported at cognee's top level;
        # import it via its full internal path exactly as the public
        # visualize_multi_user_graph wrapper does (sanctioned code path).
        from cognee.modules.visualization.cognee_network_visualization import aggregate_multi_user_graphs  # noqa: E501

        user = await get_default_user()
        datasets = await get_authorized_existing_datasets(names, "read", user)

        # GRAPH-02: same stable/aging/drifting notion as /datasets, so the
        # graph's node colors and the dataset rows never disagree.
        drift_states = compute_drift_states(names)

        # Aggregate ONE dataset per call (instead of one call for all pairs)
        # so every node carries its owning dataset — that attribution is what
        # lets the frontend color nodes by drift state and visibly drop the
        # 🔴 cluster after a forget. Datasets are isolated by design (B-01),
        # so cross-dataset node-id collisions don't occur; first-seen wins.
        out_nodes: dict[str, dict] = {}
        out_links: list[dict] = []
        seen_edges: set[tuple[str, str, str]] = set()
        for ds in datasets:
            nodes, edges = await aggregate_multi_user_graphs([(user, ds)])
            ds_name = ds.name
            for node_id, props in nodes:
                key = str(node_id)
                if key in out_nodes:
                    continue
                props = props if isinstance(props, dict) else {}
                # Only id/label/group/dataset/drift_state survive — raw chunk
                # text/body never crosses to the browser (T-04-06 / D-24).
                out_nodes[key] = {
                    "id": key,
                    "label": _node_label(key, props),
                    "group": props.get("type", "unknown"),
                    "dataset": ds_name,
                    "drift_state": drift_states.get(ds_name, "stable"),
                }
            for edge in edges:
                if len(edge) < 3:
                    continue
                # WR-01: coerce to string — frontend GraphLink.label is a
                # non-nullable string passed straight to react-force-graph-3d.
                label = str(edge[2]) if edge[2] is not None else ""
                edge_key = (str(edge[0]), str(edge[1]), label)
                if edge_key in seen_edges:
                    continue
                seen_edges.add(edge_key)
                out_links.append(
                    {"source": edge_key[0], "target": edge_key[1], "label": label}
                )

        return {
            # CR-02: explicit "ok" discriminant so the success shape can be
            # told apart from the error shape below without relying on HTTP
            # status (this endpoint always returns 200) -- matches every
            # sibling endpoint's response union (search.py, reset.py,
            # ingest.py, feedback.py).
            "status": "ok",
            "nodes": list(out_nodes.values()),
            "links": out_links,
            "drift_states": drift_states,
        }
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        logger.exception("graph export failed")
        return {"status": "error", "message": _MSG_ERROR}
