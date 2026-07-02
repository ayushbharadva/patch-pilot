"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import type { EvidenceSnippet, SearchResponse } from "@/lib/api";

/** D-07: at most 3 evidence snippets shown, even if the backend ever sends more. */
const EVIDENCE_DISPLAY_LIMIT = 3;

/** Shared card padding token (UI-SPEC spacing scale `lg` = 24px). */
const CARD_SPACING = "[--card-spacing:1.5rem]";

type HealthState = "stable" | "aging" | "drifting";

/**
 * Derive the D-09 dataset/version tag from `source_dataset` — e.g.
 * `workarounds_v1_8` -> "v1.8". `incidents` (and anything unrecognized)
 * gets a neutral label rather than a raw internal dataset name.
 */
export function versionTagFromDataset(datasetName: string | null): string {
  if (!datasetName) return "Unknown source";
  const match = /^workarounds_v(\d+)(?:_(\d+))?$/.exec(datasetName);
  if (match) {
    const [, major, minor] = match;
    return minor ? `v${major}.${minor}` : `v${major}`;
  }
  if (datasetName === "incidents") return "Incident record";
  return datasetName;
}

interface VersionTagBadgeProps {
  dataset: string | null;
  /**
   * Reserved for Phase 3's drift badges (🟢 stable / 🟡 aging / 🔴
   * drifting) — same visual slot, same DOM node. Phase 2 never sets this,
   * and the tag renders neutral/muted regardless of its value so Phase 3
   * can wire color without any layout change.
   */
  healthState?: HealthState;
}

function VersionTagBadge({ dataset, healthState }: VersionTagBadgeProps) {
  return (
    <Badge
      variant="outline"
      data-health-state={healthState ?? "neutral"}
      className="shrink-0 font-mono text-xs font-normal text-muted-foreground"
    >
      {versionTagFromDataset(dataset)}
    </Badge>
  );
}

function EvidenceItem({ snippet }: { snippet: EvidenceSnippet }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-md border border-border"
    >
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="flex-1 space-y-1">
          {snippet.source ? (
            <p className="font-sans text-sm font-semibold text-foreground">
              {snippet.source}
            </p>
          ) : null}
          <p className="font-sans text-base text-muted-foreground">
            {snippet.excerpt}
          </p>
        </div>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={open ? "Collapse full evidence" : "Expand full evidence"}
            aria-expanded={open}
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ChevronDown
              className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="border-t border-border px-3 pt-3 pb-3">
        <p className="font-sans text-base text-foreground">{snippet.full_text}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

type SearchResponseOk = Extract<SearchResponse, { status: "ok" }>;

function DiagnosisCardOk({ response }: { response: SearchResponseOk }) {
  const evidence = response.evidence.slice(0, EVIDENCE_DISPLAY_LIMIT);

  return (
    <Card className={`${CARD_SPACING} gap-6`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <h2 className="font-display text-[28px] leading-[1.2] font-semibold text-foreground">
          {response.root_cause}
        </h2>
        <VersionTagBadge dataset={response.source_dataset} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {evidence.length > 0 ? (
          evidence.map((snippet, index) => (
            <EvidenceItem
              key={`${snippet.source ?? "evidence"}-${index}`}
              snippet={snippet}
            />
          ))
        ) : (
          <p className="font-sans text-sm text-muted-foreground">
            No supporting evidence returned for this diagnosis.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Renders the fused diagnosis (RECALL-03): root cause on top (D-06),
 * expandable evidence below (D-07/D-08), version tag (D-09) for status
 * "ok"; the explicit zero-result message (D-21) for "no_results"; a short
 * human error message (D-24, never raw exception text) for "error".
 */
export function DiagnosisCard({ response }: { response: SearchResponse }) {
  if (response.status === "error") {
    return (
      <Card className={CARD_SPACING}>
        <CardContent>
          <p className="font-sans text-sm font-semibold text-destructive">
            {response.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (response.status === "no_results") {
    return (
      <Card className={CARD_SPACING}>
        <CardContent>
          <p className="font-sans text-base text-muted-foreground">
            No prior incidents found for this query
          </p>
        </CardContent>
      </Card>
    );
  }

  return <DiagnosisCardOk response={response} />;
}

/**
 * Loading placeholder (D-20) matching DiagnosisCard's real dimensions
 * (headline block + 2-3 evidence rows) so there is no layout shift when
 * real content arrives. Plan 01 measured fused-search latency at ~7.1s
 * (above the ~5s RESEARCH assumption), so a subtle "Searching memory…"
 * label is shown beneath the skeleton rather than a bare spinner.
 */
export function DiagnosisCardSkeleton() {
  return (
    <Card className={`${CARD_SPACING} gap-6`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
      </CardContent>
      <p className="px-(--card-spacing) font-sans text-sm text-muted-foreground">
        Searching memory…
      </p>
    </Card>
  );
}
