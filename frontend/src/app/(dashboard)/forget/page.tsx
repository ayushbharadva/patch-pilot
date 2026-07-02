import type { Metadata } from "next";

import { ForgetPanel } from "@/components/dashboard/forget-panel";
import { ResetPanel } from "@/components/dashboard/reset-panel";
import { Reveal } from "@/components/shared/reveal";

export const metadata: Metadata = {
	title: "Forget & Reset",
	description:
		"Retire outdated workarounds so recalls return the updated fix, and reset the PatchPilot demo to its starting state.",
};

export default function ForgetPage() {
	return (
		<div className="flex flex-col gap-8">
			<Reveal>
				<header className="flex flex-col gap-3">
					<h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
						Forget &amp; demo reset
					</h1>
					<p className="max-w-2xl text-base text-muted-foreground text-pretty">
						When a release makes a workaround obsolete, forget it so PatchPilot
						stops recommending the stale fix and future recalls return the
						updated diagnosis. Reset the demo any time to replay the full story
						from the beginning.
					</p>
				</header>
			</Reveal>

			<div className="grid gap-6 lg:grid-cols-2">
				<ForgetPanel />
				<ResetPanel />
			</div>
		</div>
	);
}
