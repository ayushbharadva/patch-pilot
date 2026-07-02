"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Database, FileText, UploadCloud } from "lucide-react";

import type { IngestRequest } from "@/types";
import { ACCEPTED_EXTENSIONS, validateIngestFile } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SampleDataset {
	id: string;
	label: string;
	description: string;
}

const SAMPLE_DATASETS: readonly SampleDataset[] = [
	{
		id: "auth-incidents-q4",
		label: "Auth incidents (Q4)",
		description:
			"38 login, token-refresh, and SSO postmortems from last quarter",
	},
	{
		id: "payments-incidents",
		label: "Payments incidents",
		description: "Checkout timeouts, webhook retries, and reconciliation fixes",
	},
	{
		id: "search-index-incidents",
		label: "Search/index incidents",
		description:
			"Reindex stalls, stale shards, and relevance-drift workarounds",
	},
] as const;

const REASON_MESSAGES: Record<"too-large" | "unsupported-format", string> = {
	"too-large": "That file is over the 10 MB limit and could not be ingested.",
	"unsupported-format": `Unsupported format. Ingest accepts ${ACCEPTED_EXTENSIONS.join(", ")} files only.`,
};

interface IngestDropzoneProps {
	onIngest: (request: IngestRequest, label: string) => void;
	disabled?: boolean;
}

export function IngestDropzone({ onIngest, disabled }: IngestDropzoneProps) {
	const shouldReduceMotion = useReducedMotion();
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	function handleFile(file: File) {
		const result = validateIngestFile({ name: file.name, size: file.size });
		if (!result.valid && result.reason) {
			setValidationError(REASON_MESSAGES[result.reason]);
			return;
		}
		setValidationError(null);
		onIngest({ fileName: file.name }, file.name);
	}

	function openPicker() {
		inputRef.current?.click();
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<motion.div
					role="button"
					tabIndex={disabled ? -1 : 0}
					aria-label="Upload an incident file"
					aria-disabled={disabled}
					onClick={disabled ? undefined : openPicker}
					onKeyDown={(event) => {
						if (disabled) return;
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							openPicker();
						}
					}}
					onDragOver={(event) => {
						event.preventDefault();
						if (!disabled) setIsDragging(true);
					}}
					onDragLeave={() => setIsDragging(false)}
					onDrop={(event) => {
						event.preventDefault();
						setIsDragging(false);
						if (disabled) return;
						const file = event.dataTransfer.files?.[0];
						if (file) handleFile(file);
					}}
					animate={
						shouldReduceMotion || !isDragging ? undefined : { scale: 1.01 }
					}
					transition={{ type: "spring", stiffness: 400, damping: 25 }}
					className={cn(
						"flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/40 p-8 text-center transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
						isDragging && "border-primary bg-primary/5",
						disabled && "cursor-not-allowed opacity-60",
					)}
				>
					<span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
						<UploadCloud className="size-6" />
					</span>
					<div className="flex flex-col gap-1">
						<p className="text-sm font-semibold text-foreground">
							Drag an incident file here, or click to browse
						</p>
						<p className="text-xs text-muted-foreground">
							{ACCEPTED_EXTENSIONS.join(", ")} up to 10 MB
						</p>
					</div>
					<input
						ref={inputRef}
						type="file"
						accept={ACCEPTED_EXTENSIONS.join(",")}
						className="sr-only"
						aria-hidden="true"
						tabIndex={-1}
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (file) handleFile(file);
							event.target.value = "";
						}}
					/>
				</motion.div>
				{validationError ? (
					<p role="alert" className="mt-3 text-sm font-medium text-destructive">
						{validationError}
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					<Database className="size-3.5" />
					Or ingest a bundled sample dataset
				</div>
				<div className="grid gap-3 sm:grid-cols-3">
					{SAMPLE_DATASETS.map((dataset) => (
						<motion.button
							key={dataset.id}
							type="button"
							disabled={disabled}
							onClick={() =>
								onIngest({ sampleDatasetId: dataset.id }, dataset.label)
							}
							whileHover={
								shouldReduceMotion || disabled ? undefined : { y: -3 }
							}
							whileTap={
								shouldReduceMotion || disabled ? undefined : { scale: 0.98 }
							}
							transition={{ type: "spring", stiffness: 400, damping: 25 }}
							className="flex min-h-24 flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
						>
							<span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<FileText className="size-4" />
							</span>
							<span className="text-sm font-semibold text-foreground">
								{dataset.label}
							</span>
							<span className="text-xs text-muted-foreground">
								{dataset.description}
							</span>
						</motion.button>
					))}
				</div>
			</div>
		</div>
	);
}
