"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { type DatasetInfo, type DriftState, listDatasets } from "@/lib/api";

/**
 * Shared React Query key -- exported so UploadPanel can invalidate this
 * query after a successful upload/release/sample-load, keeping the list
 * live without prop-drilling a refetch callback through page.tsx.
 */
export const DATASETS_QUERY_KEY = ["datasets"] as const;

/** Drift-state -> dot color + text label (03-UI-SPEC.md Copywriting
 * Contract). Color is never the only signal -- every dot pairs with the
 * literal text label. */
const DRIFT_BADGE: Record<DriftState, { dot: string; label: string }> = {
  stable: { dot: "bg-drift-stable", label: "🟢 Stable" },
  aging: { dot: "bg-drift-aging", label: "🟡 Aging" },
  drifting: { dot: "bg-drift-drifting", label: "🔴 Drifting" },
};

function DatasetRow({ dataset }: { dataset: DatasetInfo }) {
  const badge = DRIFT_BADGE[dataset.drift_state];
  const isDrifting = dataset.drift_state === "drifting";

  return (
    <div className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`size-2 shrink-0 rounded-full ${badge.dot}`} aria-hidden="true" />
        <span className="font-mono text-sm text-foreground">
          {dataset.name} · {dataset.doc_count} docs
        </span>
        <span className="font-sans text-sm font-semibold text-foreground">{badge.label}</span>
      </div>
      {isDrifting && dataset.drift_reason ? (
        <p className="mt-1 font-sans text-sm leading-[1.4] font-normal text-muted-foreground">
          {dataset.drift_reason}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Dataset list (RELEASE-01, D-15, DRIFT-01/02/03): name + live document
 * count per display dataset, mono `name · N docs`, plus a 🟢/🟡/🔴 health
 * badge with its text label and (drifting rows only) a generated reason
 * caption beneath the row.
 */
export function DatasetList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: DATASETS_QUERY_KEY,
    queryFn: listDatasets,
  });

  return (
    <Card className="gap-4 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-xl font-semibold text-foreground">Datasets</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-0">
        {isLoading ? (
          <p className="font-sans text-sm text-muted-foreground">Loading datasets…</p>
        ) : isError ? (
          <p className="font-sans text-sm font-semibold text-destructive">
            Could not load datasets. Please try again.
          </p>
        ) : data && data.length > 0 ? (
          data.map((dataset) => <DatasetRow key={dataset.name} dataset={dataset} />)
        ) : (
          <p className="font-sans text-sm text-muted-foreground">
            No datasets yet. Upload files or load sample data to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
