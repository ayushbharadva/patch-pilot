"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getMemoryGraph, type GraphNode } from "@/lib/api";

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
    <Card className="gap-4 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-xl font-semibold text-foreground">
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
        ) : data && data.nodes.length > 0 ? (
          <>
            <div
              ref={setContainer}
              className="overflow-hidden rounded-md border border-border bg-background"
              style={{ height: GRAPH_HEIGHT }}
            >
              {width > 0 ? (
                <ForceGraph3D
                  graphData={data}
                  width={width}
                  height={GRAPH_HEIGHT}
                  nodeLabel="label"
                  nodeAutoColorBy="group"
                  linkLabel="label"
                  backgroundColor="#0b0b0f"
                  onNodeClick={(node: { id?: unknown; label?: unknown; group?: unknown }) =>
                    setSelected({
                      id: String(node.id ?? ""),
                      label: String(node.label ?? node.id ?? ""),
                      group: String(node.group ?? "unknown"),
                    })
                  }
                />
              ) : null}
            </div>
            {selected ? (
              <div className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
                <span className="font-sans text-sm font-semibold text-foreground">
                  {selected.label}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {selected.group} · {selected.id}
                </span>
              </div>
            ) : (
              <p className="font-sans text-sm text-muted-foreground">
                {data.nodes.length} nodes · {data.links.length} links
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
