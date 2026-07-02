"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import type { LifecycleError } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
	error: LifecycleError | Error | string;
	onRetry: () => void;
	className?: string;
}

function resolveMessage(error: LifecycleError | Error | string): string {
	if (typeof error === "string") {
		return error;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return error.message;
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
	const message = resolveMessage(error);

	return (
		<div
			role="alert"
			className={cn(
				"flex flex-col items-start gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6",
				className,
			)}
		>
			<div className="flex items-center gap-3">
				<span className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
					<AlertTriangle className="size-5" />
				</span>
				<div className="flex flex-col">
					<p className="text-sm font-semibold text-foreground">
						Something went wrong
					</p>
					<p className="text-sm text-muted-foreground">{message}</p>
				</div>
			</div>
			<Button variant="outline" size="sm" onClick={onRetry}>
				<RotateCcw />
				Retry
			</Button>
		</div>
	);
}
