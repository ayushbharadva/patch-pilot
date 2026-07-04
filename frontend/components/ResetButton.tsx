"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resetMemory } from "@/lib/api";

/** D-24 short human message for a failed Reset call -- must match
 * backend/reset.py's `_MSG_ERROR` exactly. */
const RESET_ERROR_FALLBACK = "Could not reset memory. Please try again.";

/**
 * One-click, modal-guarded demo reset (DEMO-01, D-03/D-04/D-05). Unlike
 * DatasetList.tsx's ForgetButton (an inline two-step confirm), Reset uses a
 * shadcn Dialog modal -- the first modal primitive in this codebase -- since
 * a full memory reset is a heavier, less-frequent action than forgetting a
 * single dataset.
 *
 * While a reset request is in flight, both dialog buttons are disabled and
 * the confirm button shows a visible "Resetting…" state (D-04's animation
 * requirement, and T-04-03's DoS mitigation -- no repeat-click spam while a
 * request is pending). On success, ALL react-query caches are invalidated
 * (not just DATASETS_QUERY_KEY) since a reset changes every dataset/graph
 * state at once.
 */
export function ResetButton({ onReset }: { onReset?: () => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setIsResetting(true);
    setError(null);
    const result = await resetMemory();
    setIsResetting(false);

    if (result.status === "reset") {
      setOpen(false);
      await queryClient.invalidateQueries();
      toast.success("Memory reset to demo-ready state");
      onReset?.();
    } else {
      setError(result.message || RESET_ERROR_FALLBACK);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isResetting) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-9 gap-1.5 rounded-full border-destructive/30 px-4 font-sans backdrop-blur hover:shadow-[0_0_20px_-6px_color-mix(in_oklch,var(--destructive)_70%,transparent)]"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Reset Demo
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Reset memory to demo-ready state?
          </DialogTitle>
        </DialogHeader>
        <p className="font-sans text-sm text-muted-foreground">
          This restores the clean demo snapshot, undoing any uploads, forgets,
          or feedback made during this session.
        </p>
        {error ? (
          <p className="font-sans text-sm font-semibold text-destructive">{error}</p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleReset()}
            disabled={isResetting}
          >
            {isResetting ? "Resetting…" : "Confirm Reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
