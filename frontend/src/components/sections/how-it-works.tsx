import {
	Activity,
	Eraser,
	RotateCcw,
	ScanSearch,
	Upload,
	type LucideIcon,
} from "lucide-react";

import { Reveal } from "@/components/shared/reveal";

interface LifecycleStep {
	icon: LucideIcon;
	title: string;
	description: string;
}

const STEPS: readonly LifecycleStep[] = [
	{
		icon: Upload,
		title: "Ingest",
		description:
			"Feed tickets, postmortems, and changelogs in. PatchPilot links each incident to the fix and component it touched.",
	},
	{
		icon: ScanSearch,
		title: "Recall & diagnose",
		description:
			"A new 401 storm lands. PatchPilot recalls the matching past incidents and proposes the root cause with confidence.",
	},
	{
		icon: Activity,
		title: "Release & drift",
		description:
			"Ship release 1.9 and PatchPilot flags which remembered workarounds are now aging or drifting, with a reason.",
	},
	{
		icon: Eraser,
		title: "Forget",
		description:
			"Retire the stale workaround so the outdated fix stops resurfacing in future diagnoses.",
	},
	{
		icon: RotateCcw,
		title: "Re-search",
		description:
			"Recall the same bug again and the answer has moved on — the new fix replaces the forgotten workaround.",
	},
];

export function HowItWorks() {
	return (
		<section
			id="how-it-works"
			className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
		>
			<Reveal>
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
						Memory that lives with your codebase
					</h2>
					<p className="mt-4 text-lg text-muted-foreground text-pretty">
						The full loop — ingest, recall, drift, forget, re-search — runs as
						one continuous story from first incident to fresh fix.
					</p>
				</div>
			</Reveal>

			<ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{STEPS.map((step, index) => (
					<Reveal key={step.title} delay={index * 0.08}>
						<li className="group h-full rounded-2xl border border-border/60 bg-surface-elevated/60 p-6 transition-colors hover:border-primary/40">
							<div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<step.icon className="size-5" />
							</div>
							<h3 className="mt-4 flex items-center gap-2 font-heading text-lg font-semibold">
								<span className="font-mono text-sm text-muted-foreground">
									{String(index + 1).padStart(2, "0")}
								</span>
								{step.title}
							</h3>
							<p className="mt-2 text-sm text-muted-foreground text-pretty">
								{step.description}
							</p>
						</li>
					</Reveal>
				))}
			</ol>
		</section>
	);
}
