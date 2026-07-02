"use client";

import { useCallback } from "react";
import { ScanSearch } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { useLifecycleAction } from "@/hooks/use-lifecycle-action";
import { recall } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { RecallResult } from "@/types";

interface RecallPreviewProps {
	bugId: string;
	query: string;
}

const PHASE_LABEL: Record<RecallResult["phase"], string> = {
	"pre-forget": "Before forget",
	"post-forget": "After forget",
};

const PHASE_STYLE: Record<RecallResult["phase"], string> = {
	"pre-forget": "border-drift-aging/40 text-drift-aging",
	"post-forget": "border-drift-stable/40 text-drift-stable",
};

export function RecallPreview({ bugId, query }: RecallPreviewProps) {
	const preview = useLifecycleAction<RecallResult>(
		useCallback(() => recall({ bugId, query }), [bugId, query]),
		{ action: "recall" },
	);

	return (
		<div className="rounded-xl border border-border/60 bg-surface-sunken/50 p-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-col">
					<p className="text-sm font-medium text-foreground">Recall preview</p>
					<p className="text-xs text-muted-foreground">
						See the diagnosis flip for{" "}
						<span className="font-mono">{bugId}</span> within this session.
					</p>
				</div>
				<Button
					variant="outline"
					onClick={preview.run}
					disabled={preview.status === "loading"}
					className="min-h-11 px-4"
				>
					<ScanSearch />
					Preview recall
				</Button>
			</div>

			{preview.status === "loading" ? (
				<div className="mt-4">
					<LoadingState label="Recalling diagnosis…" />
				</div>
			) : null}

			{preview.status === "error" && preview.error ? (
				<div className="mt-4">
					<ErrorState error={preview.error} onRetry={preview.run} />
				</div>
			) : null}

			{preview.status === "success" && preview.data ? (
				<div className="mt-4 flex flex-col gap-2">
					<span
						className={cn(
							"inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
							PHASE_STYLE[preview.data.phase],
						)}
					>
						{PHASE_LABEL[preview.data.phase]}
					</span>
					<p className="text-sm text-foreground text-pretty">
						{preview.data.diagnosis.rootCause}
					</p>
					<p className="text-sm text-muted-foreground text-pretty">
						<span className="font-medium text-foreground">
							Recommended fix:{" "}
						</span>
						{preview.data.diagnosis.recommendedFix}
					</p>
				</div>
			) : null}
		</div>
	);
}
