"use client";

import { DatasetList } from "@/components/DatasetList";
import { HealthDashboard } from "@/components/HealthDashboard";
import { UploadPanel } from "@/components/UploadPanel";
import { useSearchSession } from "@/lib/search-session";

/**
 * Memory route: upload/ingest controls, the dataset list (with the
 * per-dataset Forget action), and the memory-health rollup. Forgetting a
 * drifting dataset re-runs the last search via the navigation-surviving
 * session so the flipped diagnosis is ready as soon as the user returns to
 * /app. The richer cross-route "View diagnosis" action-toast lands in the
 * depth-kit pass.
 */
export default function MemoryPage() {
  const session = useSearchSession();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-10">
      <section aria-label="Upload incident memory" className="animate-rise-in">
        <UploadPanel />
      </section>

      <section aria-label="Datasets" className="animate-rise-in">
        <DatasetList onForgotten={() => void session.reSearch("forget")} />
      </section>

      <section aria-label="Memory health" className="animate-rise-in">
        <HealthDashboard />
      </section>
    </main>
  );
}
