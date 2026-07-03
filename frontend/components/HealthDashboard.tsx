"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DATASETS_QUERY_KEY } from "@/components/DatasetList";
import { type DriftState, listDatasets } from "@/lib/api";

/** Drift-state -> text label (03-UI-SPEC.md Copywriting Contract). Duplicated
 * from DatasetList.tsx's DRIFT_BADGE map rather than imported, since only the
 * label (not the dot color) is needed here. */
const DRIFT_LABEL: Record<DriftState, string> = {
  stable: "🟢 Stable",
  aging: "🟡 Aging",
  drifting: "🔴 Drifting",
};

/**
 * Memory health dashboard (STRETCH-02): pure client-side aggregation of the
 * live `GET /datasets` response (RESEARCH.md Architectural Responsibility
 * Map — no new backend endpoint). Shares DATASETS_QUERY_KEY with DatasetList
 * so counts always agree with the list and no redundant fetch fires.
 */
export function HealthDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: DATASETS_QUERY_KEY,
    queryFn: listDatasets,
  });

  const counts: Record<DriftState, number> = { stable: 0, aging: 0, drifting: 0 };
  for (const dataset of data ?? []) {
    counts[dataset.drift_state] += 1;
  }

  return (
    <Card className="gap-4 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-xl font-semibold text-foreground">Memory Health</h2>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 p-0">
        {isLoading ? (
          <p className="font-sans text-sm text-muted-foreground">Loading memory health…</p>
        ) : isError ? (
          <p className="font-sans text-sm font-semibold text-destructive">
            Could not load memory health. Please try again.
          </p>
        ) : (
          (Object.keys(counts) as DriftState[]).map((state) => (
            <span key={state} className="font-sans text-sm font-semibold text-foreground">
              {DRIFT_LABEL[state]}: {counts[state]}
            </span>
          ))
        )}
      </CardContent>
    </Card>
  );
}
