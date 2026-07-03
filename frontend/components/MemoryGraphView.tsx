"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getMemoryGraph, type GraphNode } from "@/lib/api";

/**
 * Neural-dark node palette (260703-vga fan-out): pulled directly from
 * DESIGN-SYSTEM.md's accent ramp + drift palette hex values (no new
 * arbitrary colors). `hashGroupColor` deterministically maps each Cognee
 * entity `group` string to one of these — same group always renders the
 * same hue, distinct groups fan out across the ramp, purely a presentation
 * concern layered on the existing `group` field (no new data fetched).
 */
const NODE_COLOR_RAMP = [
  "#6366f1", // accent-indigo
  "#8b5cf6", // accent-violet
  "#22d3ee", // accent-cyan
  "#4ade80", // drift-stable
  "#fbbf24", // drift-aging
] as const;

function hashGroupColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return NODE_COLOR_RAMP[Math.abs(hash) % NODE_COLOR_RAMP.length];
}

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
        ) : data && data.nodes.length > 0 ? (
          <>
            <div
              ref={setContainer}
              className="glow-primary relative overflow-hidden rounded-2xl border border-accent-indigo/25 bg-background/60"
              style={{ height: GRAPH_HEIGHT }}
            >
              {width > 0 ? (
                <ForceGraph3D
                  graphData={data}
                  width={width}
                  height={GRAPH_HEIGHT}
                  nodeLabel="label"
                  nodeColor={(node) =>
                    hashGroupColor(
                      String((node as { group?: unknown }).group ?? "unknown"),
                    )
                  }
                  nodeOpacity={0.95}
                  linkLabel="label"
                  linkColor={() => "rgba(139, 92, 246, 0.55)"}
                  linkOpacity={0.6}
                  linkWidth={1.1}
                  linkDirectionalParticles={1}
                  linkDirectionalParticleWidth={1.6}
                  linkDirectionalParticleColor={() => "#22d3ee"}
                  backgroundColor="rgba(7, 6, 15, 0.55)"
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
              <div className="glass animate-rise-in flex flex-col gap-1 rounded-xl border border-border/60 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: hashGroupColor(selected.group) }}
                    aria-hidden="true"
                  />
                  <span className="font-sans text-sm font-semibold text-foreground">
                    {selected.label}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {selected.group} · {selected.id}
                </span>
              </div>
            ) : (
              <p className="font-mono text-xs tracking-wide text-accent-cyan/80">
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
