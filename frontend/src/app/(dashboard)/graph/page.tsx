"use client";

import { Share2 } from "lucide-react";

import { GraphViewer } from "@/components/dashboard/graph-viewer";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Reveal } from "@/components/shared/reveal";
import { useLifecycleAction } from "@/hooks/use-lifecycle-action";
import { graph } from "@/lib/api";
import type { GraphData } from "@/types";

const loadGraph = (): Promise<GraphData> => graph({});

export default function GraphPage() {
	const { data, status, error, run } = useLifecycleAction<GraphData>(
		loadGraph,
		{ immediate: true, action: "graph" },
	);

	return (
		<div className="flex flex-col gap-8">
			<Reveal>
				<header className="flex flex-col gap-3">
					<span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
						<Share2 className="size-4" aria-hidden />
						Memory Graph
					</span>
					<h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
						How incidents, fixes, and components connect
					</h1>
					<p className="max-w-2xl text-base text-muted-foreground text-pretty">
						PatchPilot links every incident to the fix that resolved it and the
						component it touched. The graph is the shared memory engineers reach
						for when a familiar problem resurfaces.
					</p>
				</header>
			</Reveal>

			{status === "loading" ? (
				<LoadingState label="Loading the memory graph" />
			) : null}

			{status === "error" && error ? (
				<ErrorState error={error} onRetry={run} />
			) : null}

			{status === "success" && data ? (
				<section aria-label="Memory graph">
					<GraphViewer data={data} />
				</section>
			) : null}
		</div>
	);
}
