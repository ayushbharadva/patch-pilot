import { ArchiveX } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DriftResult, DriftState } from "@/types";

interface DriftStateConfig {
	emoji: string;
	label: string;
	badge: string;
	dot: string;
}

const DRIFT_CONFIG: Record<DriftState, DriftStateConfig> = {
	stable: {
		emoji: "🟢",
		label: "Stable",
		badge: "border-drift-stable/40 bg-drift-stable/10 text-drift-stable",
		dot: "bg-drift-stable",
	},
	aging: {
		emoji: "🟡",
		label: "Aging",
		badge: "border-drift-aging/40 bg-drift-aging/10 text-drift-aging",
		dot: "bg-drift-aging",
	},
	drifting: {
		emoji: "🔴",
		label: "Drifting",
		badge: "border-drift-drifting/40 bg-drift-drifting/10 text-drift-drifting",
		dot: "bg-drift-drifting",
	},
};

interface DriftIndicatorProps {
	result: DriftResult;
	className?: string;
}

export function DriftIndicator({ result, className }: DriftIndicatorProps) {
	const config = DRIFT_CONFIG[result.state];

	return (
		<article
			data-testid="drift-indicator"
			data-state={result.state}
			aria-label={`${config.label} drift state for ${result.memoryTitle}`}
			className={cn(
				"flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-surface-elevated/60 p-5",
				className,
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<span
					data-testid="drift-state"
					className={cn(
						"inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold",
						config.badge,
					)}
				>
					<span aria-hidden>{config.emoji}</span>
					{config.label}
				</span>
				<span
					aria-hidden
					className={cn("mt-2 size-2.5 shrink-0 rounded-full", config.dot)}
				/>
			</div>

			<div className="flex flex-col gap-1">
				<p className="font-mono text-sm font-medium text-foreground">
					{result.memoryTitle}
				</p>
				<p className="font-mono text-xs text-muted-foreground">
					{result.datasetName}
				</p>
			</div>

			<p
				data-testid="drift-reason"
				className="text-sm text-muted-foreground text-pretty"
			>
				{result.reason}
			</p>

			{result.recommendForget ? (
				<span className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-drift-drifting">
					<ArchiveX className="size-3.5" aria-hidden />
					Recommended to forget
				</span>
			) : null}
		</article>
	);
}
