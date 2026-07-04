"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getMemoryGraph, type GraphNode } from "@/lib/api";

/**
 * GRAPH-02: node color now MEANS something — it encodes the drift state of
 * the node's owning dataset, using the same 🟢/🟡/🔴 language as
 * DatasetList/HealthDashboard, so forgetting a drifting dataset visibly
 * removes the red cluster. Hexes are precomputed sRGB equivalents of the
 * drift tokens in app/(mvp)/globals.css (three.js cannot parse oklch() —
 * keep in sync if the tokens change). The durable `incidents` dataset gets
 * the accent cyan so ground truth reads distinctly from versioned
 * workarounds.
 */
const DRIFT_NODE_COLORS: Record<string, string> = {
  stable: "#43c07a", // drift-stable — oklch(0.72 0.15 155)
  aging: "#edb345", // drift-aging — oklch(0.8 0.14 80)
  drifting: "#e9555a", // drift-drifting — oklch(0.68 0.19 15)
};
const INCIDENTS_NODE_COLOR = "#28c2be"; // accent-cyan — oklch(0.74 0.12 192)
const FALLBACK_NODE_COLOR = "#927eec"; // accent-violet — oklch(0.66 0.16 290)

function nodeColorFor(node: Pick<GraphNode, "dataset" | "drift_state">): string {
  if (node.dataset === "incidents") return INCIDENTS_NODE_COLOR;
  return DRIFT_NODE_COLORS[node.drift_state] ?? FALLBACK_NODE_COLOR;
}

/** Legend chips mirroring DatasetList's color+label pairing (color is never
 * the sole signal — a11y). */
const LEGEND = [
  { label: "Incidents (durable)", color: INCIDENTS_NODE_COLOR },
  { label: "🟢 Stable", color: DRIFT_NODE_COLORS.stable },
  { label: "🟡 Aging", color: DRIFT_NODE_COLORS.aging },
  { label: "🔴 Drifting", color: DRIFT_NODE_COLORS.drifting },
] as const;

/** Render cap — beyond this a Cognee graph becomes an illegible hairball and
 * the force sim burns frames. Nodes keep backend order; links are filtered
 * to surviving endpoints. */
const MAX_RENDERED_NODES = 300;

/**
 * Client-only 3D memory graph (GRAPH-01, D-06/D-07/D-08 + STRETCH-04
 * click-to-explore). Renders the REAL Cognee cognify-produced knowledge
 * graph exported by backend/graph.py's GET /graph — incidents, fixes, and
 * the entities/relationships Cognee extracted between them.
 *
 * The `dynamic(..., { ssr: false })` call MUST live inside this "use client"
 * file: react-force-graph / three reference `window`/WebGL at module-eval
 * time, and Next 16 only honors `ssr: false` from a Client Component
 * (node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md; RESEARCH.md
 * Pitfall 3). Importing this component normally from the already-client
 * page.tsx keeps that boundary intact.
 */
const ForceGraph3D = dynamic(
  // Import the standalone 3D-only wrapper, NOT the umbrella "react-force-graph":
  // the umbrella bundles the VR/AR builds, which reference a global `AFRAME` at
  // module-eval time and throw `AFRAME is not defined` in a plain web app.
  // react-force-graph-3d wraps only 3d-force-graph (→ three) and default-exports
  // the ForceGraph3D component.
  () => import("react-force-graph-3d").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <p className="font-sans text-sm text-muted-foreground">Loading 3D graph…</p>
    ),
  },
);

/** Shared react-query key for the memory graph fetch. */
export const GRAPH_QUERY_KEY = ["graph"] as const;

/** Fixed viewport height for the 3D canvas — keeps the graph contained in
 * the page flow (rather than filling the whole window) and labels readable
 * on a demo screen (D-07). */
const GRAPH_HEIGHT = 520;

export function MemoryGraphView() {
  const { data, isLoading, isError } = useQuery({
    queryKey: GRAPH_QUERY_KEY,
    queryFn: getMemoryGraph,
  });

  // STRETCH-04 click-to-explore: the last node the operator clicked.
  const [selected, setSelected] = useState<GraphNode | null>(null);

  // GRAPH-02 render cap: memoized so the sliced arrays keep a stable identity
  // across re-renders (react-force-graph re-heats the sim on new graphData).
  const renderData = useMemo(() => {
    if (!data) return null;
    if (data.nodes.length <= MAX_RENDERED_NODES) {
      return { nodes: data.nodes, links: data.links, total: data.nodes.length };
    }
    const nodes = data.nodes.slice(0, MAX_RENDERED_NODES);
    const kept = new Set(nodes.map((n) => n.id));
    const links = data.links.filter((l) => kept.has(l.source) && kept.has(l.target));
    return { nodes, links, total: data.nodes.length };
  }, [data]);

  // react-force-graph defaults to window dimensions; measure the container
  // instead so the canvas fits the card width and resizes with it.
  const [width, setWidth] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);

  // Callback ref (NOT a useEffect with [] deps): the measured container lives
  // behind the isLoading branch, so it only mounts AFTER the graph data
  // arrives. A mount-time effect would run while the container is still absent,
  // leave width at 0, and the `width > 0` gate below would render the canvas as
  // null forever (empty box = "no graph visible"). A callback ref fires exactly
  // when the node attaches/detaches, and a ResizeObserver keeps it in sync.
  const setContainer = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    roRef.current = ro;
  }, []);

  return (
    <Card className="glow-soft animate-rise-in gap-4 border-border/60 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-2xl font-semibold text-gradient sm:text-3xl">
          Memory Graph
        </h2>
        <p className="font-sans text-sm text-muted-foreground">
          The live Cognee knowledge graph — incidents, fixes, and the entities
          it connected. Click a node to explore it.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-0">
        {isLoading ? (
          <p className="font-sans text-sm text-muted-foreground">
            Loading memory graph…
          </p>
        ) : isError ? (
          <p className="font-sans text-sm font-semibold text-destructive">
            Could not load memory graph. Please try again.
          </p>
        ) : renderData && renderData.nodes.length > 0 ? (
          <>
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1"
              aria-label="Graph color legend"
            >
              {LEGEND.map((entry) => (
                <span
                  key={entry.label}
                  className="flex items-center gap-1.5 font-sans text-xs text-muted-foreground"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                    aria-hidden="true"
                  />
                  {entry.label}
                </span>
              ))}
            </div>
            <div
              ref={setContainer}
              className="glow-primary relative overflow-hidden rounded-2xl border border-accent-indigo/25 bg-background/60"
              style={{ height: GRAPH_HEIGHT }}
            >
              {width > 0 ? (
                <ForceGraph3D
                  graphData={renderData}
                  width={width}
                  height={GRAPH_HEIGHT}
                  cooldownTicks={200}
                  nodeLabel="label"
                  nodeColor={(node) => nodeColorFor(node as GraphNode)}
                  nodeOpacity={0.95}
                  linkLabel="label"
                  linkColor={() => "rgba(146, 126, 236, 0.55)"}
                  linkOpacity={0.6}
                  linkWidth={1.1}
                  linkDirectionalParticles={1}
                  linkDirectionalParticleWidth={1.6}
                  linkDirectionalParticleColor={() => "#28c2be"}
                  backgroundColor="rgba(10, 16, 23, 0.55)"
                  onNodeClick={(node) => {
                    const n = node as Partial<GraphNode> & {
                      id?: string | number;
                    };
                    setSelected({
                      id: String(n.id ?? ""),
                      label: String(n.label ?? n.id ?? ""),
                      group: String(n.group ?? "unknown"),
                      dataset: String(n.dataset ?? ""),
                      drift_state: n.drift_state ?? "stable",
                    });
                  }}
                />
              ) : null}
            </div>
            {selected ? (
              <div className="glass animate-rise-in flex flex-col gap-1 rounded-xl border border-border/60 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: nodeColorFor(selected) }}
                    aria-hidden="true"
                  />
                  <span className="font-sans text-sm font-semibold text-foreground">
                    {selected.label}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {selected.group} · {selected.dataset || "unknown dataset"} ·{" "}
                  {selected.drift_state}
                </span>
              </div>
            ) : (
              <p className="font-mono text-xs tracking-wide text-accent-cyan/80">
                {renderData.total > renderData.nodes.length
                  ? `Showing ${renderData.nodes.length} of ${renderData.total} nodes · ${renderData.links.length} links`
                  : `${renderData.nodes.length} nodes · ${renderData.links.length} links`}
              </p>
            )}
          </>
        ) : (
          <p className="font-sans text-sm text-muted-foreground">
            No memory graph yet. Load sample data or upload incidents to build
            the graph.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
