"use client";

import { useCallback, useState } from "react";
import { Brain, Search } from "lucide-react";

import { DiagnosisCard } from "@/components/dashboard/diagnosis-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
import { useLifecycleAction } from "@/hooks/use-lifecycle-action";
import { recall } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { RecallResult } from "@/types";

interface DemoBug {
	bugId: string;
	label: string;
	query: string;
}

const DEMO_BUGS: readonly DemoBug[] = [
	{
		bugId: "BUG-2043",
		label: "Users logged out mid-session",
		query: "users are getting logged out after ~15 minutes",
	},
	{
		bugId: "BUG-1876",
		label: "Customers charged twice",
		query: "duplicate charges on checkout retries",
	},
	{
		bugId: "BUG-3120",
		label: "New products missing from search",
		query: "imported SKUs not searchable",
	},
];

export default function RecallPage() {
	const [selected, setSelected] = useState<DemoBug>(DEMO_BUGS[0]);

	const fn = useCallback(
		(): Promise<RecallResult> =>
			recall({ bugId: selected.bugId, query: selected.query }),
		[selected],
	);

	const { data, status, error, run } = useLifecycleAction<RecallResult>(fn, {
		action: "recall",
	});

	return (
		<div className="flex flex-col gap-8">
			<Reveal>
				<header className="flex flex-col gap-3">
					<h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
						Recall &amp; diagnosis
					</h1>
					<p className="max-w-2xl text-base text-muted-foreground text-pretty">
						Ask PatchPilot to reconstruct a root cause from prior incidents. The
						recommendation appears beside the memories it was rebuilt from.
					</p>
				</header>
			</Reveal>

			<section className="flex flex-col gap-4">
				<h2 className="text-sm font-semibold text-foreground">
					Choose an incident to diagnose
				</h2>
				<div className="grid gap-3 sm:grid-cols-3">
					{DEMO_BUGS.map((bug) => {
						const active = bug.bugId === selected.bugId;
						return (
							<button
								key={bug.bugId}
								type="button"
								onClick={() => setSelected(bug)}
								aria-pressed={active}
								className={cn(
									"flex min-h-[88px] flex-col gap-1 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
									active
										? "border-primary/60 bg-primary/5"
										: "border-border/60 bg-surface-elevated/40 hover:border-primary/40",
								)}
							>
								<span className="font-mono text-xs font-semibold text-primary">
									{bug.bugId}
								</span>
								<span className="text-sm font-medium text-foreground text-pretty">
									{bug.label}
								</span>
							</button>
						);
					})}
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm text-muted-foreground text-pretty">
						<span className="text-foreground">Query:</span> &ldquo;
						{selected.query}&rdquo;
					</p>
					<Button
						size="lg"
						onClick={run}
						disabled={status === "loading"}
						className="min-h-11 px-4"
					>
						<Search />
						{status === "loading" ? "Recalling…" : "Run recall"}
					</Button>
				</div>
			</section>

			<section aria-live="polite" className="min-h-40">
				{status === "idle" ? (
					<EmptyState
						icon={Brain}
						title="No diagnosis yet"
						message="Pick an incident above and run a recall to reconstruct its root cause from memory."
					/>
				) : null}
				{status === "loading" ? (
					<LoadingState label="Reconstructing root cause from memory…" />
				) : null}
				{status === "error" && error ? (
					<ErrorState error={error} onRetry={run} />
				) : null}
				{status === "success" && data ? (
					<DiagnosisCard result={data.diagnosis} phase={data.phase} />
				) : null}
			</section>
		</div>
	);
}
