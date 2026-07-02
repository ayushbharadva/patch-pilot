import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";
import type { DriftState } from "@/types/domain";

interface DriftSample {
	state: DriftState;
	emoji: string;
	label: string;
	memory: string;
	reason: string;
	dot: string;
	badge: string;
}

const DRIFT_SAMPLES: readonly DriftSample[] = [
	{
		state: "stable",
		emoji: "🟢",
		label: "Stable",
		memory: "AUTH-207 · refresh grace window fix",
		reason:
			"Still referenced by the current auth service and confirmed working in release 1.9.",
		dot: "bg-drift-stable",
		badge: "border-drift-stable/40 text-drift-stable",
	},
	{
		state: "aging",
		emoji: "🟡",
		label: "Aging",
		memory: "PAY-114 · duplicate-charge retry guard",
		reason:
			"The payment retry path it patched was refactored in 1.9; the fix may no longer apply cleanly.",
		dot: "bg-drift-aging",
		badge: "border-drift-aging/40 text-drift-aging",
	},
	{
		state: "drifting",
		emoji: "🔴",
		label: "Drifting",
		memory: "CACHE-58 · manual Redis flush workaround",
		reason:
			"Redis was replaced by the managed cache in 1.9, so this workaround now points at code that is gone.",
		dot: "bg-drift-drifting",
		badge: "border-drift-drifting/40 text-drift-drifting",
	},
];

export function DriftPreview() {
	return (
		<section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
			<Reveal>
				<div className="max-w-2xl">
					<h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
						Drift you can read at a glance
					</h2>
					<p className="mt-4 text-lg text-muted-foreground text-pretty">
						After each release, PatchPilot grades every memory and always says
						why — never a bare score.
					</p>
				</div>
			</Reveal>

			<div className="mt-12 grid gap-5 md:grid-cols-3">
				{DRIFT_SAMPLES.map((sample, index) => (
					<Reveal key={sample.state} delay={index * 0.08}>
						<article className="h-full rounded-2xl border border-border/60 bg-surface-elevated/60 p-6">
							<div className="flex items-center justify-between">
								<span
									className={cn(
										"inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold",
										sample.badge,
									)}
								>
									<span aria-hidden>{sample.emoji}</span>
									{sample.label}
								</span>
								<span className={cn("size-2.5 rounded-full", sample.dot)} />
							</div>
							<p className="mt-4 font-mono text-sm font-medium text-foreground">
								{sample.memory}
							</p>
							<p className="mt-2 text-sm text-muted-foreground text-pretty">
								{sample.reason}
							</p>
						</article>
					</Reveal>
				))}
			</div>
		</section>
	);
}
