"use client";

import { useCallback, useState } from "react";
import { Eraser } from "lucide-react";

import { RecallPreview } from "@/components/dashboard/recall-preview";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SuccessIndicator } from "@/components/shared/success-indicator";
import { Button } from "@/components/ui/button";
import { useLifecycleAction } from "@/hooks/use-lifecycle-action";
import { forget } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ForgetResult } from "@/types";

interface DemoWorkaround {
	bugId: string;
	datasetName: string;
	label: string;
	query: string;
}

const DEMO_WORKAROUNDS: readonly DemoWorkaround[] = [
	{
		bugId: "BUG-2043",
		datasetName: "workarounds_v1_7",
		label: "Retry-once 401 workaround (auth)",
		query: "Users are logged out mid-session with intermittent 401s",
	},
	{
		bugId: "BUG-1876",
		datasetName: "workarounds_v1_6",
		label: "Cron refund of duplicate charges (payments)",
		query: "Customers are charged twice when checkout is slow",
	},
	{
		bugId: "BUG-3120",
		datasetName: "workarounds_v1_8",
		label: "15-minute full reindex (search)",
		query: "Newly imported documents are missing from search",
	},
];

export function ForgetPanel() {
	const [selected, setSelected] = useState<DemoWorkaround>(DEMO_WORKAROUNDS[0]);

	const forgetAction = useLifecycleAction<ForgetResult>(
		useCallback(
			() =>
				forget({ bugId: selected.bugId, datasetName: selected.datasetName }),
			[selected],
		),
		{ action: "forget" },
	);

	return (
		<section
			aria-labelledby="forget-heading"
			className="flex flex-col rounded-2xl border border-border/60 bg-surface-elevated/60 p-6"
		>
			<div className="flex items-center gap-3">
				<span className="flex size-10 items-center justify-center rounded-lg bg-drift-stable/10 text-drift-stable">
					<Eraser className="size-5" />
				</span>
				<div>
					<h2 id="forget-heading" className="font-heading text-xl font-bold">
						Forget an outdated workaround
					</h2>
					<p className="text-sm text-muted-foreground text-pretty">
						Retire a stale per-release fix so future recalls return the updated
						diagnosis.
					</p>
				</div>
			</div>

			<fieldset className="mt-6">
				<legend className="text-sm font-medium text-foreground">
					Choose a workaround
				</legend>
				<div
					role="radiogroup"
					aria-label="Demo workarounds"
					className="mt-3 flex flex-col gap-2"
				>
					{DEMO_WORKAROUNDS.map((item) => {
						const isSelected = item.bugId === selected.bugId;
						return (
							<button
								key={item.bugId}
								type="button"
								role="radio"
								aria-checked={isSelected}
								onClick={() => setSelected(item)}
								className={cn(
									"flex min-h-11 items-center gap-3 rounded-lg border px-4 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
									isSelected
										? "border-drift-stable/50 bg-drift-stable/5"
										: "border-border/60 hover:bg-muted/50",
								)}
							>
								<span
									aria-hidden
									className={cn(
										"size-2.5 shrink-0 rounded-full",
										isSelected ? "bg-drift-stable" : "bg-muted-foreground/40",
									)}
								/>
								<span className="font-mono text-xs text-muted-foreground">
									{item.bugId}
								</span>
								<span className="text-foreground">{item.label}</span>
							</button>
						);
					})}
				</div>
			</fieldset>

			<div className="mt-6">
				<RecallPreview bugId={selected.bugId} query={selected.query} />
			</div>

			<div className="mt-6 flex flex-col gap-4">
				{forgetAction.status === "loading" ? (
					<LoadingState label={`Forgetting ${selected.datasetName}…`} />
				) : null}

				{forgetAction.status === "error" && forgetAction.error ? (
					<ErrorState error={forgetAction.error} onRetry={forgetAction.run} />
				) : null}

				{forgetAction.status === "success" && forgetAction.data ? (
					<SuccessIndicator
						tone="forget"
						icon={Eraser}
						title="Workaround forgotten"
						message={`Forgotten ${forgetAction.data.datasetName} — future recalls will return the updated fix.`}
					/>
				) : null}

				<Button
					onClick={forgetAction.run}
					disabled={forgetAction.status === "loading"}
					className="min-h-11 self-start px-5"
				>
					<Eraser />
					Forget this workaround
				</Button>
			</div>
		</section>
	);
}
