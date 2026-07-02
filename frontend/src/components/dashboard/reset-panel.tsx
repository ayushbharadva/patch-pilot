"use client";

import { RotateCcw } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SuccessIndicator } from "@/components/shared/success-indicator";
import { Button } from "@/components/ui/button";
import { useLifecycleAction } from "@/hooks/use-lifecycle-action";
import { demoReset } from "@/lib/api";
import type { DemoResetResult } from "@/types";

export function ResetPanel() {
	const resetAction = useLifecycleAction<DemoResetResult>(demoReset, {
		action: "demoReset",
	});

	return (
		<section
			aria-labelledby="reset-heading"
			className="flex flex-col rounded-2xl border border-border/60 bg-surface-elevated/60 p-6"
		>
			<div className="flex items-center gap-3">
				<span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<RotateCcw className="size-5" />
				</span>
				<div>
					<h2 id="reset-heading" className="font-heading text-xl font-bold">
						Reset the demo
					</h2>
					<p className="text-sm text-muted-foreground text-pretty">
						Restore every workaround to its pre-forget state so you can replay
						the story from the start.
					</p>
				</div>
			</div>

			<div className="mt-6 flex flex-col gap-4">
				{resetAction.status === "loading" ? (
					<LoadingState label="Resetting demo…" />
				) : null}

				{resetAction.status === "error" && resetAction.error ? (
					<ErrorState error={resetAction.error} onRetry={resetAction.run} />
				) : null}

				{resetAction.status === "success" && resetAction.data ? (
					<SuccessIndicator
						tone="reset"
						icon={RotateCcw}
						title="Demo reset"
						message="Demo reset — all workarounds restored to pre-forget."
					/>
				) : null}

				<Button
					variant="secondary"
					onClick={resetAction.run}
					disabled={resetAction.status === "loading"}
					className="min-h-11 self-start px-5"
				>
					<RotateCcw />
					Reset demo
				</Button>
			</div>
		</section>
	);
}
