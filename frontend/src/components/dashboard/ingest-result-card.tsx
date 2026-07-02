"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

import type { IngestResult } from "@/types";

interface IngestResultCardProps {
	result: IngestResult;
	label: string;
}

export function IngestResultCard({ result, label }: IngestResultCardProps) {
	return (
		<div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6">
			<div className="flex items-center gap-3">
				<span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<CheckCircle2 className="size-5" />
				</span>
				<div className="flex flex-col">
					<p className="text-sm font-semibold text-foreground">
						Ingest accepted
					</p>
					<p className="text-sm text-muted-foreground">
						{label} is being written to memory
					</p>
				</div>
			</div>
			<p className="font-heading text-lg font-semibold text-foreground">
				Processing {result.acceptedItems} items into dataset{" "}
				<span className="text-primary">{result.datasetName}</span>
			</p>
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<Loader2 className="size-3.5 animate-spin" />
				Status: {result.status}
			</div>
		</div>
	);
}
