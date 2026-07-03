"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shared progressive loading indicator for the LLM-bound (5–20s) search
 * waits. Supersedes the old static "Searching memory…" label (extends D-20's
 * skeleton decision and Plan 01's measured ~7.1s fused-search latency): a
 * single frozen line reads as hung during the real first-search cold-start
 * (Mistral free tier) and the 8–20s cognify, so we stage the copy to the
 * actual pipeline and add a reassurance line once the wait gets long.
 *
 * Reused by BOTH call sites — DiagnosisCardSkeleton (initial search) and
 * page.tsx's isReSearching indicator (Accept/Forget re-search). Both render
 * inside page.tsx's `aria-live="polite"` results section, so the CYCLING
 * visual text is aria-hidden and only a single fixed sr-only label lives in
 * the accessibility tree — cycling text in a live region would spam screen
 * readers with a new announcement every ~4s.
 */

/**
 * Staged messages mapped to the real recall → analyze → evidence pipeline.
 * Module-level so its identity is stable across renders — Effect A depends on
 * `messages`, so an unstable (inline) array would restart the interval every
 * render. Callers must NOT pass an inline array literal as `messages`.
 */
const SEARCH_PROGRESS_MESSAGES = [
  "Searching incident memory…",
  "Analyzing root cause…",
  "Gathering supporting evidence…",
] as const;

/** Advance the visible message every ~4s. */
const SEARCH_PROGRESS_INTERVAL_MS = 4000;

/** Reveal the persistent reassurance line once the wait passes ~12s. */
const SEARCH_PROGRESS_REASSURANCE_DELAY_MS = 12000;

/** Persistent reassurance — the first search warms the memory graph (real cold-start on the Mistral free tier). */
const SEARCH_PROGRESS_REASSURANCE =
  "Still working — the first search warms up the memory graph.";

/** One stable screen-reader sentence (never cycled) so the aria-live region announces once. */
const DEFAULT_SR_LABEL =
  "Searching incident memory. This can take up to 20 seconds.";

interface SearchProgressProps {
  /**
   * Ordered staged messages. Defaults to a module-level constant with a
   * stable identity — do NOT pass an inline array literal here or Effect A
   * will restart its interval every render.
   */
  messages?: readonly string[];
  intervalMs?: number;
  reassuranceDelayMs?: number;
  reassuranceMessage?: string;
  srLabel?: string;
  showSpinner?: boolean;
  className?: string;
}

export function SearchProgress({
  messages = SEARCH_PROGRESS_MESSAGES,
  intervalMs = SEARCH_PROGRESS_INTERVAL_MS,
  reassuranceDelayMs = SEARCH_PROGRESS_REASSURANCE_DELAY_MS,
  reassuranceMessage = SEARCH_PROGRESS_REASSURANCE,
  srLabel = DEFAULT_SR_LABEL,
  showSpinner = false,
  className,
}: SearchProgressProps) {
  const [index, setIndex] = useState(0);
  const [showReassurance, setShowReassurance] = useState(false);

  // Effect A — advance the visible message, clamping on the last one so the
  // copy does not loop back to "Searching…" after reaching "evidence". Cleared
  // on unmount (the component mounts only while pending, so no state-set-after-
  // unmount and no leaked interval). T-uvm-02.
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => Math.min(prev + 1, messages.length - 1));
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, messages]);

  // Effect B — reveal the persistent reassurance line after the delay, then
  // leave it up. Timeout cleared on unmount (T-uvm-02).
  useEffect(() => {
    const id = setTimeout(() => setShowReassurance(true), reassuranceDelayMs);
    return () => clearTimeout(id);
  }, [reassuranceDelayMs]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 font-sans text-sm text-muted-foreground",
        className,
      )}
    >
      {showSpinner ? (
        <span
          aria-hidden="true"
          className="glow-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
        >
          <Loader2 className="size-4 animate-spin text-accent-indigo" />
        </span>
      ) : (
        // Decorative pulsing brand orb for the no-spinner (skeleton) call site —
        // aria-hidden, motion behind the reduced-motion-safe .animate-float guard.
        <span
          aria-hidden="true"
          className="glow-primary animate-float mt-1 size-3 shrink-0 rounded-full"
          style={{ backgroundImage: "var(--gradient-brand)" }}
        />
      )}
      <div className="flex flex-col gap-1">
        {/* Single stable announcement — the only node in the a11y tree. */}
        <span className="sr-only">{srLabel}</span>
        {/* Cycling + reassurance copy is aria-hidden (see docblock). */}
        <span
          aria-hidden="true"
          className="text-gradient font-display text-base font-semibold tracking-tight"
        >
          {messages[index]}
        </span>
        {showReassurance ? (
          <span aria-hidden="true" className="text-xs italic text-muted-foreground/80">
            {reassuranceMessage}
          </span>
        ) : null}
      </div>
    </div>
  );
}
