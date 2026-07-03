"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { acceptFeedback, type EvidenceSnippet, type SearchResponse } from "@/lib/api";
import { versionTagFromDataset } from "@/lib/version";

/** D-07: at most 3 evidence snippets shown, even if the backend ever sends more. */
const EVIDENCE_DISPLAY_LIMIT = 3;

/** Shared card padding token (UI-SPEC spacing scale `lg` = 24px). */
const CARD_SPACING = "[--card-spacing:1.5rem]";

type HealthState = "stable" | "aging" | "drifting";

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
      className="shrink-0 font-mono text-xs font-normal text-muted-foreground data-[health-state=aging]:border-drift-aging data-[health-state=aging]:text-drift-aging data-[health-state=drifting]:border-drift-drifting data-[health-state=drifting]:text-drift-drifting data-[health-state=stable]:border-drift-stable data-[health-state=stable]:text-drift-stable"
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

/** D-24 short human message for a failed Accept call. */
const ACCEPT_ERROR_FALLBACK = "Could not save feedback. Please try again.";

/**
 * Accept Fix / Dismiss controls (D-10/D-11/D-12/D-13) — apply to the whole
 * card only, never individual evidence items. Accept reinforces via
 * add_feedback()+improve() against the exact `source_dataset` the answer
 * came from, flips to a non-interactive "Reinforced ✓" state (D-11), and
 * invokes `onReSearch` (re-runs the SAME query so the accepted fix's
 * reordering is visible in the next card, D-12). Dismiss removes the card
 * client-side only — NO backend call (D-10) — by flipping local state, not
 * by calling any API.
 */
function AcceptDismissControls({
  response,
  onReSearch,
  onDismiss,
}: {
  response: SearchResponseOk;
  onReSearch?: () => void;
  onDismiss: () => void;
}) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feedback needs both qa_id and source_dataset — RESEARCH.md notes qa_id
  // resolution is best-effort and may be null; without it there is nothing
  // to reinforce, so Accept is disabled rather than silently failing.
  const canAccept = Boolean(response.qa_id) && Boolean(response.source_dataset);

  async function handleAccept() {
    if (!response.qa_id || !response.source_dataset) return;
    setIsAccepting(true);
    setError(null);
    const result = await acceptFeedback({
      session_id: response.session_id,
      qa_id: response.qa_id,
      source_dataset: response.source_dataset,
    });
    setIsAccepting(false);

    if (result.status === "reinforced") {
      setAccepted(true);
      onReSearch?.();
    } else {
      setError(result.message || ACCEPT_ERROR_FALLBACK);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-3">
        {accepted ? (
          <span
            aria-live="polite"
            className="inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-primary"
          >
            <Check className="size-4" aria-hidden="true" />
            Reinforced ✓
          </span>
        ) : (
          <Button
            type="button"
            onClick={() => void handleAccept()}
            disabled={isAccepting || !canAccept}
            className="font-sans text-sm font-semibold"
          >
            Accept Fix
          </Button>
        )}
        {!accepted ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onDismiss}
            className="font-sans text-sm font-semibold text-muted-foreground"
          >
            Dismiss
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="font-sans text-sm font-semibold text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

function DiagnosisCardOk({
  response,
  onReSearch,
}: {
  response: SearchResponseOk;
  onReSearch?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const evidence = response.evidence.slice(0, EVIDENCE_DISPLAY_LIMIT);

  // D-10: Dismiss is a silent, client-only removal of the whole card — no
  // API call, no confirmation. Rendering null here (rather than lifting
  // dismissal to the page) keeps Dismiss purely local and free of any
  // network side effect.
  if (dismissed) return null;

  return (
    <Card className={`${CARD_SPACING} gap-6`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <h2 className="font-display text-[28px] leading-[1.2] font-semibold text-foreground">
          {response.root_cause}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <VersionTagBadge
            dataset={response.source_dataset}
            healthState={response.drift_state ?? undefined}
          />
          {response.confidence != null ? (
            <Badge
              variant="outline"
              className="shrink-0 font-mono text-xs font-normal text-muted-foreground"
            >
              {Math.round(response.confidence * 100)}% confidence
            </Badge>
          ) : null}
        </div>
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
      <CardFooter>
        <AcceptDismissControls
          response={response}
          onReSearch={onReSearch}
          onDismiss={() => setDismissed(true)}
        />
      </CardFooter>
    </Card>
  );
}

/**
 * Renders the fused diagnosis (RECALL-03): root cause on top (D-06),
 * expandable evidence below (D-07/D-08), version tag (D-09) for status
 * "ok"; the explicit zero-result message (D-21) for "no_results"; a short
 * human error message (D-24, never raw exception text) for "error".
 *
 * `onReSearch` is provided by the page and re-runs the SAME query after a
 * successful Accept, so the reinforced fix's reordering is visible in the
 * next diagnosis card (D-12).
 */
export function DiagnosisCard({
  response,
  onReSearch,
}: {
  response: SearchResponse;
  onReSearch?: () => void;
}) {
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

  return <DiagnosisCardOk response={response} onReSearch={onReSearch} />;
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
