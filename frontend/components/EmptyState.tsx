"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Shared empty-state treatment for in-card empties (DatasetList, Timeline,
 * Graph, Diagnosis no-results) so every "nothing here yet" moment reads the
 * same: dim icon, one-line title, muted hint, optional action.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-border/70 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <p className="font-sans text-sm font-semibold text-foreground">{title}</p>
      {hint ? (
        <p className="max-w-sm font-sans text-sm text-muted-foreground">{hint}</p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
