"use client";

import { useCallback, useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";

import type { IngestRequest, IngestResult } from "@/types";
import { ingest } from "@/lib/api";
import { useLifecycleAction } from "@/hooks/use-lifecycle-action";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { IngestDropzone } from "@/components/dashboard/ingest-dropzone";
import { IngestResultCard } from "@/components/dashboard/ingest-result-card";
import { ScenarioSwitch } from "@/components/dashboard/scenario-switch";
import { Reveal } from "@/components/shared/reveal";

interface Selection {
	request: IngestRequest;
	label: string;
}

export default function IngestPage() {
	const [selection, setSelection] = useState<Selection | null>(null);

	const action = useCallback(() => {
		if (!selection) {
			return Promise.reject(new Error("No selection to ingest."));
		}
		return ingest(selection.request);
	}, [selection]);

	const { data, status, error, run } = useLifecycleAction<IngestResult>(
		action,
		{
			action: "ingest",
		},
	);

	useEffect(() => {
		if (selection) {
			run();
		}
	}, [selection, run]);

	const handleIngest = useCallback((request: IngestRequest, label: string) => {
		setSelection({ request, label });
	}, []);

	return (
		<div className="flex flex-col gap-8">
			<Reveal>
				<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex max-w-2xl flex-col gap-2">
						<h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
							Ingest incident memory
						</h1>
						<p className="text-base text-muted-foreground text-pretty">
							Feed postmortems, tickets, and fixes into PatchPilot. Drop a file
							or pick a bundled dataset to start writing incidents into memory.
						</p>
					</div>
					<ScenarioSwitch action="ingest" />
				</header>
			</Reveal>

			<IngestDropzone onIngest={handleIngest} disabled={status === "loading"} />

			<section aria-live="polite" className="min-h-24">
				{status === "loading" ? (
					<LoadingState
						label={`Ingesting ${selection?.label ?? "selection"}…`}
					/>
				) : null}
				{status === "error" && error ? (
					<ErrorState error={error} onRetry={run} />
				) : null}
				{status === "success" && data ? (
					<IngestResultCard result={data} label={selection?.label ?? ""} />
				) : null}
				{status === "idle" ? (
					<EmptyState
						icon={UploadCloud}
						title="Nothing ingested yet"
						message="Select a file or a sample dataset above to see PatchPilot start processing it into memory."
					/>
				) : null}
			</section>
		</div>
	);
}
