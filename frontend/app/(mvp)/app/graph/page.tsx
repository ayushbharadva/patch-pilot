"use client";

import { MemoryGraphView } from "@/components/MemoryGraphView";

/** Graph route (GRAPH-01): the live Cognee memory graph, full-page. */
export default function GraphPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
      <MemoryGraphView />
    </main>
  );
}
