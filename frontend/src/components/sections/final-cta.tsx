import { ArrowRight } from "lucide-react";

import { CtaButton } from "@/components/shared/cta-button";
import { Reveal } from "@/components/shared/reveal";
import { SITE_CONFIG } from "@/config/site";

export function FinalCta() {
	return (
		<section className="mx-auto w-full max-w-7xl px-4 pt-8 pb-24 sm:px-6 lg:px-8">
			<Reveal>
				<div className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface-elevated/70 px-6 py-16 text-center sm:px-12">
					<div
						aria-hidden
						className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-lg -translate-x-1/2 rounded-full bg-glow blur-3xl"
					/>
					<h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
						Run the full search, drift, forget, re-search loop
					</h2>
					<p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground text-pretty">
						Start with a sample incident set and watch a recall answer change
						the moment you forget the outdated workaround.
					</p>
					<div className="mt-8 flex justify-center">
						<CtaButton href={SITE_CONFIG.launchHref}>
							Launch PatchPilot
							<ArrowRight className="size-4" />
						</CtaButton>
					</div>
				</div>
			</Reveal>
		</section>
	);
}
