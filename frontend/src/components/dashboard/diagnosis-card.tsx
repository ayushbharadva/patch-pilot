"use client";

import { FileText, Lightbulb, ScrollText } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import type { DiagnosisResult, EvidenceChunk, RecallResult } from "@/types";

interface DiagnosisCardProps {
	result: DiagnosisResult;
	phase?: RecallResult["phase"];
}

const PHASE_LABEL: Record<RecallResult["phase"], string> = {
	"pre-forget": "Pre-forget memory",
	"post-forget": "Post-forget memory",
};

export function DiagnosisCard({ result, phase }: DiagnosisCardProps) {
	const shouldReduceMotion = useReducedMotion();
	const confidence = Math.round(result.confidence);

	return (
		<div className="grid gap-6 rounded-2xl border border-border/60 bg-surface-elevated/60 p-6 shadow-lg backdrop-blur-sm lg:grid-cols-5 lg:p-8">
			<div className="lg:col-span-3">
				<div className="flex flex-wrap items-center gap-3">
					<span className="inline-flex items-center gap-2 text-primary">
						<Lightbulb className="size-5" />
						<span className="text-xs font-semibold tracking-wide uppercase">
							Recommended fix
						</span>
					</span>
					<span className="font-mono text-xs text-muted-foreground">
						{result.bugId}
					</span>
					{phase ? (
						<span className="rounded-full border border-primary/30 px-2.5 py-0.5 text-[0.7rem] font-medium text-primary">
							{PHASE_LABEL[phase]}
						</span>
					) : null}
				</div>

				<h3 className="mt-4 font-heading text-xl font-semibold text-pretty">
					{result.rootCause}
				</h3>
				<p className="mt-3 text-muted-foreground text-pretty">
					{result.recommendedFix}
				</p>

				<div className="mt-6">
					<div className="flex items-center justify-between text-sm">
						<span className="font-medium text-foreground">Confidence</span>
						<span className="font-mono text-primary">{confidence}%</span>
					</div>
					<div
						role="progressbar"
						aria-valuenow={confidence}
						aria-valuemin={0}
						aria-valuemax={100}
						className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
					>
						<motion.div
							className="h-full rounded-full bg-primary"
							initial={shouldReduceMotion ? false : { width: 0 }}
							animate={{ width: `${confidence}%` }}
							transition={
								shouldReduceMotion
									? undefined
									: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
							}
						/>
					</div>
				</div>
			</div>

			<div className="lg:col-span-2">
				<p className="flex items-center gap-2 text-sm font-medium">
					<FileText className="size-4 text-muted-foreground" />
					Reconstructed from
				</p>
				<motion.ul
					className="mt-3 space-y-3"
					initial={shouldReduceMotion ? false : "hidden"}
					animate={shouldReduceMotion ? undefined : "visible"}
					variants={
						shouldReduceMotion
							? undefined
							: { visible: { transition: { staggerChildren: 0.08 } } }
					}
				>
					{result.evidence.map((chunk, index) => (
						<EvidenceItem
							key={`${chunk.incidentId}-${index}`}
							chunk={chunk}
							reduceMotion={Boolean(shouldReduceMotion)}
						/>
					))}
				</motion.ul>
			</div>
		</div>
	);
}

interface EvidenceItemProps {
	chunk: EvidenceChunk;
	reduceMotion: boolean;
}

function EvidenceItem({ chunk, reduceMotion }: EvidenceItemProps) {
	const relevance = Math.round(chunk.relevance * 100);

	return (
		<motion.li
			data-testid="evidence-item"
			className="rounded-xl border border-border/50 bg-background/40 p-3"
			variants={
				reduceMotion
					? undefined
					: { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }
			}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="font-mono text-xs font-semibold text-primary">
					{chunk.incidentId}
				</span>
				<span className="inline-flex items-center gap-1 font-mono text-[0.7rem] text-muted-foreground">
					<ScrollText className="size-3" />
					{relevance}%
				</span>
			</div>
			<p className="mt-1 text-sm text-muted-foreground text-pretty">
				{chunk.excerpt}
			</p>
		</motion.li>
	);
}
