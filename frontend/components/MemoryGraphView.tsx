'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

import { Share2 } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { getMemoryGraph, type GraphNode } from '@/lib/api';

/**
 * GRAPH-02: node color now MEANS something — it encodes the drift state of
 * the node's owning dataset, using the same 🟢/🟡/🔴 language as
 * DatasetList/HealthDashboard, so forgetting a drifting dataset visibly
 * removes the red cluster. Hexes are precomputed sRGB equivalents of the
 * drift tokens in app/(mvp)/globals.css per theme (three.js cannot parse
 * oklch() or CSS vars — keep in sync if the tokens change). The durable
 * `incidents` dataset gets the accent cyan so ground truth reads distinctly
 * from versioned workarounds.
 */
interface GraphPalette {
  drift: Record<string, string>;
  incidents: string;
  fallback: string;
  background: string;
  link: string;
  particle: string;
}

const DARK_PALETTE: GraphPalette = {
  drift: {
    stable: '#43c07a', // drift-stable — oklch(0.72 0.15 155)
    aging: '#edb345', // drift-aging — oklch(0.8 0.14 80)
    drifting: '#e9555a', // drift-drifting — oklch(0.68 0.19 15)
  },
  incidents: '#28c2be', // accent-cyan — oklch(0.74 0.12 192)
  fallback: '#927eec', // accent-violet — oklch(0.66 0.16 290)
  background: 'rgba(10, 16, 23, 0.55)',
  link: 'rgba(146, 126, 236, 0.55)',
  particle: '#28c2be',
};

const LIGHT_PALETTE: GraphPalette = {
  drift: {
    stable: '#109659', // drift-stable — oklch(0.6 0.14 155)
    aging: '#cf9b1d', // drift-aging — oklch(0.75 0.15 75)
    drifting: '#cc3944', // drift-drifting — oklch(0.58 0.2 15)
  },
  incidents: '#0e8fa5', // accent-cyan — oklch(0.56 0.12 195)
  fallback: '#6e57da', // accent-violet — oklch(0.55 0.16 285)
  background: 'rgba(246, 249, 252, 0.92)',
  link: 'rgba(110, 87, 218, 0.4)',
  particle: '#0e8fa5',
};

function nodeColorFor(
  palette: GraphPalette,
  node: Pick<GraphNode, 'dataset' | 'drift_state'>,
): string {
  if (node.dataset === 'incidents') return palette.incidents;
  return palette.drift[node.drift_state] ?? palette.fallback;
}

/** Legend chips mirroring DatasetList's color+label pairing (color is never
 * the sole signal — a11y). */
function legendFor(palette: GraphPalette) {
  return [
    { label: 'Incidents (durable)', color: palette.incidents },
    { label: 'Stable', color: palette.drift.stable },
    { label: 'Aging', color: palette.drift.aging },
    { label: 'Drifting', color: palette.drift.drifting },
  ] as const;
}

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
  () => import('react-force-graph-3d').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <p className="font-sans text-sm text-muted-foreground">
        Loading 3D graph…
      </p>
    ),
  },
);

/** Shared react-query key for the memory graph fetch. */
export const GRAPH_QUERY_KEY = ['graph'] as const;

/** Fixed viewport height for the 3D canvas — keeps the graph contained in
 * the page flow (rather than filling the whole window) and labels readable
 * on a demo screen (D-07). */
const GRAPH_HEIGHT = 520;

export function MemoryGraphView() {
  const { data, isLoading, isError } = useQuery({
    queryKey: GRAPH_QUERY_KEY,
    queryFn: getMemoryGraph,
  });

  // three.js needs concrete colors (no CSS vars), so pick the palette from
  // the resolved next-themes value. Defaults to dark pre-hydration — matches
  // defaultTheme="dark".
  const { resolvedTheme } = useTheme();
  const palette = resolvedTheme === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
  const legend = legendFor(palette);

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
    const links = data.links.filter(
      (l) => kept.has(l.source) && kept.has(l.target),
    );
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
    <Card className="gap-4 border-border/60 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Memory Graph
        </h2>
        <p className="font-sans text-sm text-muted-foreground">
          The live Cognee knowledge graph — incidents, fixes, and the entities
          it connected. Click a node to explore it.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-0">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-28" />
              ))}
            </div>
            <div
              className="relative overflow-hidden rounded-2xl border border-accent-indigo/25"
              style={{ height: GRAPH_HEIGHT }}
            >
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          </div>
        ) : isError ? (
          <ErrorState message="Could not load memory graph. Please try again." />
        ) : renderData && renderData.nodes.length > 0 ? (
          <>
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1"
              aria-label="Graph color legend"
            >
              {legend.map((entry) => (
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
              className="relative overflow-hidden rounded-2xl border border-accent-indigo/25 bg-background/60"
              style={{ height: GRAPH_HEIGHT }}
            >
              {width > 0 ? (
                <ForceGraph3D
                  graphData={renderData}
                  width={width}
                  height={GRAPH_HEIGHT}
                  cooldownTicks={200}
                  nodeLabel="label"
                  nodeColor={(node) => nodeColorFor(palette, node as GraphNode)}
                  nodeOpacity={0.95}
                  linkLabel="label"
                  linkColor={() => palette.link}
                  linkOpacity={0.6}
                  linkWidth={1.1}
                  linkDirectionalParticles={1}
                  linkDirectionalParticleWidth={1.6}
                  linkDirectionalParticleColor={() => palette.particle}
                  backgroundColor={palette.background}
                  onNodeClick={(node) => {
                    const n = node as Partial<GraphNode> & {
                      id?: string | number;
                    };
                    setSelected({
                      id: String(n.id ?? ''),
                      label: String(n.label ?? n.id ?? ''),
                      group: String(n.group ?? 'unknown'),
                      dataset: String(n.dataset ?? ''),
                      drift_state: n.drift_state ?? 'stable',
                    });
                  }}
                />
              ) : null}
            </div>
            {selected ? (
              <div className="bg-card ring-1 ring-foreground/10 flex flex-col gap-1 rounded-xl border border-border/60 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: nodeColorFor(palette, selected) }}
                    aria-hidden="true"
                  />
                  <span className="font-sans text-sm font-semibold text-foreground">
                    {selected.label}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {selected.group} · {selected.dataset || 'unknown dataset'} ·{' '}
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
          <EmptyState
            icon={Share2}
            title="No memory graph yet"
            hint="Load sample data or upload incidents to build the graph."
          />
        )}
      </CardContent>
    </Card>
  );
}
