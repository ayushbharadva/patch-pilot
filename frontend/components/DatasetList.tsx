"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { listDatasets } from "@/lib/api";

/**
 * Shared React Query key -- exported so UploadPanel can invalidate this
 * query after a successful upload/release/sample-load, keeping the list
 * live without prop-drilling a refetch callback through page.tsx.
 */
export const DATASETS_QUERY_KEY = ["datasets"] as const;

/**
 * Dataset list (RELEASE-01, D-15): name + live document count per display
 * dataset, mono `name · N docs`. Leaves a leading slot reserved for Phase
 * 3's health badge -- no badge rendered yet, but the row shape already
 * accommodates one without layout change.
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
          data.map((dataset) => (
            <div
              key={dataset.name}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
            >
              {/* Reserved slot: Phase 3's 🟢/🟡/🔴 drift badge lands here,
                  same row, no layout change. */}
              <span className="size-2 shrink-0 rounded-full bg-transparent" aria-hidden="true" />
              <span className="font-mono text-sm text-foreground">
                {dataset.name} · {dataset.doc_count} docs
              </span>
            </div>
          ))
        ) : (
          <p className="font-sans text-sm text-muted-foreground">
            No datasets yet. Upload files or load sample data to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
