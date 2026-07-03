"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type DatasetInfo, type DriftState, forgetDataset, listDatasets } from "@/lib/api";

/**
 * Shared React Query key -- exported so UploadPanel can invalidate this
 * query after a successful upload/release/sample-load, keeping the list
 * live without prop-drilling a refetch callback through page.tsx.
 */
export const DATASETS_QUERY_KEY = ["datasets"] as const;

/** Drift-state -> dot color + text label + glow (03-UI-SPEC.md Copywriting
 * Contract). Color is never the only signal -- every dot pairs with the
 * literal text label. */
const DRIFT_BADGE: Record<DriftState, { dot: string; glow: string; label: string }> = {
  stable: { dot: "bg-drift-stable", glow: "glow-drift-stable", label: "🟢 Stable" },
  aging: { dot: "bg-drift-aging", glow: "glow-drift-aging", label: "🟡 Aging" },
  drifting: { dot: "bg-drift-drifting", glow: "glow-drift-drifting", label: "🔴 Drifting" },
};

/** D-24 short human message for a failed Forget call -- must match
 * backend/forget.py's `_MSG_ERROR` exactly. */
const FORGET_ERROR_FALLBACK = "Could not forget dataset. Please try again.";

/**
 * Forget button + two-step inline confirm (FORGET-01/02, UI-SPEC
 * Interaction Contract point 3) -- rendered only on 🔴 drifting rows.
 * Mirrors DiagnosisCard.tsx's AcceptDismissControls local-state/mutation
 * pattern: `confirming`/`isForgetting`/`error` flags gate which buttons
 * render, no modal component.
 */
function ForgetButton({
  datasetName,
  onForgotten,
}: {
  datasetName: string;
  onForgotten?: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [isForgetting, setIsForgetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleForget() {
    setIsForgetting(true);
    setError(null);
    const result = await forgetDataset({ dataset: datasetName });
    setIsForgetting(false);

    if (result.status === "forgotten") {
      await queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
      toast.success("Forgotten — updating results…");
      onForgotten?.();
    } else {
      setError(result.message || FORGET_ERROR_FALLBACK);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {confirming ? (
          <>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isForgetting}
              onClick={() => void handleForget()}
              className="font-sans text-sm font-semibold shadow-[0_0_14px_-4px_color-mix(in_oklch,var(--color-destructive)_70%,transparent)]"
            >
              Confirm forget?
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isForgetting}
              onClick={() => setConfirming(false)}
              className="font-sans text-sm font-semibold text-muted-foreground"
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
            className="gap-1 font-sans text-sm font-semibold text-destructive hover:border-destructive/50 hover:bg-destructive/10"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Forget
          </Button>
        )}
      </div>
      {error ? (
        <p className="font-sans text-sm font-semibold text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

function DatasetRow({
  dataset,
  onForgotten,
}: {
  dataset: DatasetInfo;
  onForgotten?: () => void;
}) {
  const badge = DRIFT_BADGE[dataset.drift_state];
  const isDrifting = dataset.drift_state === "drifting";

  return (
    <div
      className={cn(
        "glass flex flex-col gap-1 rounded-xl border border-border/60 px-3.5 py-2.5 transition-colors",
        isDrifting && "border-drift-drifting/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            badge.dot,
            badge.glow,
            isDrifting && "animate-drift-pulse",
          )}
          aria-hidden="true"
        />
        <span className="font-mono text-sm font-medium text-foreground">
          {dataset.name} <span className="text-muted-foreground">· {dataset.doc_count} docs</span>
        </span>
        <span
          className={cn(
            "font-sans text-sm font-semibold",
            isDrifting ? "text-drift-drifting" : "text-foreground",
          )}
        >
          {badge.label}
        </span>
        {isDrifting ? (
          <ForgetButton datasetName={dataset.name} onForgotten={onForgotten} />
        ) : null}
      </div>
      {isDrifting && dataset.drift_reason ? (
        <p className="mt-1 border-l-2 border-drift-drifting/40 pl-2.5 font-sans text-sm leading-[1.4] font-normal text-muted-foreground">
          {dataset.drift_reason}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Dataset list (RELEASE-01, D-15, DRIFT-01/02/03, FORGET-01/02): name + live
 * document count per display dataset, mono `name · N docs`, plus a
 * 🟢/🟡/🔴 health badge with its text label, a generated reason caption on
 * drifting rows, and (drifting rows only) a guarded Forget button.
 *
 * `onForgotten` is provided by the page and re-runs the last search after a
 * successful forget, mirroring D-12's Accept→auto-re-search pattern so the
 * before/after memory change is visible without a manual re-search.
 */
export function DatasetList({ onForgotten }: { onForgotten?: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: DATASETS_QUERY_KEY,
    queryFn: listDatasets,
  });

  return (
    <Card className="glow-soft gap-4 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-xl font-semibold text-gradient">Datasets</h2>
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
            <DatasetRow key={dataset.name} dataset={dataset} onForgotten={onForgotten} />
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
