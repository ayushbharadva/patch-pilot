'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Per-file/per-dataset badge state (D-22) -- "uploading" is a purely
 * client-side transient state for the in-flight network request; the other
 * three mirror backend/ingest.py's IngestStatus. */
export type FileStatus = 'uploading' | 'processing' | 'ready' | 'failed';

const STATUS_LABEL: Record<FileStatus, string> = {
  uploading: 'Uploading',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
};

/** D-24 -- short human message for a post-acceptance cognify failure. */
const COGNIFY_FAILURE_MESSAGE =
  "Couldn't process this file. Retry, or upload it again.";

/** D-05/D-22 -- reassurance caption while cognify builds the graph (8-20s);
 * mirrors the D-24 failed-row caption pattern so a "Processing" badge doesn't
 * read as hung during the real cold-start. */
const PROCESSING_MESSAGE =
  'Building the knowledge graph — this can take a few seconds.';

/** Tiny CSS-animated brand crystal shown next to the Processing badge — a
 * lightweight SVG (not a WebGL canvas) so it scales to many rows without
 * GPU cost. Spins slowly while cognify runs; the `animate-[spin_3s]` is
 * a Tailwind arbitrary animation that degrades under reduced-motion via
 * the global `prefers-reduced-motion` guard in globals.css. */
function ProcessingCrystal() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      fill="none"
      className="size-4 shrink-0 animate-spin [animation-duration:3s] [animation-timing-function:linear]"
      style={{
        filter:
          'drop-shadow(0 0 6px color-mix(in oklch, var(--accent-violet) 60%, transparent))',
      }}
    >
      <polygon
        points="16,2.6 3.6,12.2 16,17.2"
        fill="#5eead4"
        fillOpacity="0.9"
      />
      <polygon
        points="16,2.6 28.4,12.2 16,17.2"
        fill="#38bdf8"
        fillOpacity="0.7"
      />
      <polygon
        points="16,29.4 3.6,12.2 16,17.2"
        fill="#6366f1"
        fillOpacity="0.5"
      />
      <polygon
        points="16,29.4 28.4,12.2 16,17.2"
        fill="#8b5cf6"
        fillOpacity="0.35"
      />
    </svg>
  );
}

interface FileStatusRowProps {
  filename: string;
  status: FileStatus;
  /** Present only when status is "failed" -- omit to hide the Retry button (D-23). */
  onRetry?: () => void;
}

/**
 * Per-file status row (D-22): Uploading -> Processing -> Ready/Failed, with
 * a 44px Retry hit target on Failed (D-23). Also reused as the D-05
 * processing badge -- one row component serves both roles per
 * 02-CONTEXT.md's "Claude's Discretion" unification.
 */
export function FileStatusRow({
  filename,
  status,
  onRetry,
}: FileStatusRowProps) {
  return (
    <div
      className={cn(
        'bg-card ring-1 ring-foreground/10 flex flex-col gap-1 rounded-xl border border-border/60 px-3.5 py-2.5 transition-colors',
        status === 'failed' && 'border-destructive/40',
        status === 'ready' && 'border-drift-stable/30',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
          {filename}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {status === 'processing' ? <ProcessingCrystal /> : null}
          <Badge
            variant={status === 'failed' ? 'destructive' : 'outline'}
            className={cn(
              'font-sans text-xs font-normal',
              // D-05: the Processing badge breathes while cognify runs (8-20s);
              // uploading/ready/failed badges stay static. (drift-pulse's
              // keyframe glow is tuned to the drifting-red hue, so processing
              // uses the neutral animate-pulse breathe instead.)
              status === 'processing' &&
                'animate-pulse border-accent-violet/40 text-accent-violet',
              status === 'ready' && 'border-drift-stable/40 text-drift-stable',
              status === 'failed' && '',
            )}
          >
            {STATUS_LABEL[status]}
          </Badge>
          {status === 'failed' && onRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-11 min-h-11 px-3 font-sans text-sm font-semibold text-destructive hover:border-destructive/50 hover:bg-destructive/10"
            >
              Retry
            </Button>
          ) : null}
        </div>
      </div>
      {status === 'failed' ? (
        <p className="font-sans text-sm text-muted-foreground">
          {COGNIFY_FAILURE_MESSAGE}
        </p>
      ) : null}
      {status === 'processing' ? (
        <p className="font-sans text-sm text-muted-foreground">
          {PROCESSING_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}
