"use client";

import { ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { DriftIndicator } from "@/components/dashboard/drift-indicator";
import { EmptyState } from "@/components/shared/empty-state";
import type { DriftResult } from "@/types";

interface DriftPanelProps {
	affected: DriftResult[];
}

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.08, delayChildren: 0.05 },
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.4, ease: "easeOut" as const },
	},
};

export function DriftPanel({ affected }: DriftPanelProps) {
	const shouldReduceMotion = useReducedMotion();

	if (affected.length === 0) {
		return (
			<EmptyState
				icon={ShieldCheck}
				title="No memories flagged"
				message="No memories are currently flagged as Aging or Drifting. Every stored fix still aligns with the latest release."
			/>
		);
	}

	return (
		<motion.div
			className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
			variants={shouldReduceMotion ? undefined : containerVariants}
			initial={shouldReduceMotion ? false : "hidden"}
			animate={shouldReduceMotion ? undefined : "visible"}
		>
			{affected.map((result) => (
				<motion.div
					key={`${result.datasetName}-${result.memoryTitle}`}
					variants={shouldReduceMotion ? undefined : itemVariants}
				>
					<DriftIndicator result={result} />
				</motion.div>
			))}
		</motion.div>
	);
}
