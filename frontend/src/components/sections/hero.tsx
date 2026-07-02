import { ArrowRight, Sparkles } from "lucide-react";

import { CtaButton } from "@/components/shared/cta-button";
import { Reveal } from "@/components/shared/reveal";
import { SITE_CONFIG } from "@/config/site";

const HEADLINE = "Your incidents, remembered — and diagnosed";
const SUPPORTING =
	"PatchPilot turns past incidents into living memory that recalls proven fixes, diagnoses new bugs, and forgets stale workarounds after each release.";

export function Hero() {
	return (
		<section className="relative overflow-hidden">
			<div
				aria-hidden
				className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-144 w-144 -translate-x-1/2 rounded-full bg-glow blur-3xl"
			/>
			<div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:py-32">
				<Reveal>
					<div className="flex flex-col items-start gap-6">
						<span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-elevated/60 px-3 py-1 text-xs font-medium text-muted-foreground">
							<Sparkles className="size-3.5 text-primary" />
							Living incident memory on Cognee
						</span>
						<h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
							{HEADLINE}
						</h1>
						<p className="max-w-xl text-lg text-muted-foreground text-pretty">
							{SUPPORTING}
						</p>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<CtaButton href={SITE_CONFIG.launchHref}>
								Launch PatchPilot
								<ArrowRight className="size-4" />
							</CtaButton>
							<CtaButton href="#how-it-works" variant="outline">
								See how it works
							</CtaButton>
						</div>
					</div>
				</Reveal>

				<Reveal delay={0.15}>
					<ConsoleMock />
				</Reveal>
			</div>
		</section>
	);
}

function ConsoleMock() {
	return (
		<div className="rounded-2xl border border-border/60 bg-surface-elevated/80 shadow-xl backdrop-blur-sm">
			<div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
				<span className="size-2.5 rounded-full bg-drift-drifting" />
				<span className="size-2.5 rounded-full bg-drift-aging" />
				<span className="size-2.5 rounded-full bg-drift-stable" />
				<span className="ml-2 font-mono text-xs text-muted-foreground">
					patchpilot recall — AUTH-401
				</span>
			</div>
			<div className="space-y-4 p-5 font-mono text-sm">
				<p className="text-muted-foreground">
					<span className="text-primary">$</span> patchpilot recall --bug
					AUTH-401 &quot;users hit 401 after token refresh&quot;
				</p>
				<div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
					<p className="text-xs font-semibold tracking-wide text-primary uppercase">
						Root cause · 94% confidence
					</p>
					<p className="mt-1.5 font-sans text-foreground">
						Refresh token rotation races the access-token clock skew, so a
						renewed token is rejected as expired.
					</p>
				</div>
				<div className="space-y-1.5 text-xs text-muted-foreground">
					<p className="font-sans font-medium text-foreground">
						Reconstructed from 3 prior incidents
					</p>
					<p>· AUTH-207 — clock-skew logout storm, Mar 2026</p>
					<p>· AUTH-318 — refresh loop after SSO migration</p>
					<p>· CHG-92 — token TTL lowered in release 1.8</p>
				</div>
			</div>
		</div>
	);
}
