'use client';

import dynamic from 'next/dynamic';

import { MemoryGraphView } from '@/components/MemoryGraphView';
import { RouteHeader } from '@/components/RouteHeader';

const GraphParticleField = dynamic(
  () =>
    import('@/components/GraphParticleField').then((m) => m.GraphParticleField),
  { ssr: false, loading: () => null },
);

/** Graph route (GRAPH-01): the live Cognee memory graph, full-page. */
export default function GraphPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      {/* Faint 3D particle field behind the graph card — gives the route a
          sense of depth without competing with the interactive force-graph.
          Fixed, pointer-events-none, reduced-motion safe (renders null). */}
      <GraphParticleField className="fixed inset-0 -z-5" />
      <RouteHeader
        eyebrow="Explore"
        title="Memory Graph"
        description="The live Cognee knowledge graph — incidents, fixes, and the entities it connected. Click a node to explore it."
      />
      <MemoryGraphView />
    </main>
  );
}
