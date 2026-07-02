"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

interface LoadingStateProps {
	label?: string;
	className?: string;
}

export function LoadingState({ label, className }: LoadingStateProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<div
			role="status"
			aria-live="polite"
			aria-busy="true"
			className={cn("flex flex-col gap-3", className)}
		>
			{label ? (
				<span className="text-sm text-muted-foreground">{label}</span>
			) : (
				<span className="sr-only">Loading</span>
			)}
			<div className="flex flex-col gap-3">
				{[0, 1, 2].map((row) => (
					<motion.div
						key={row}
						className="h-4 rounded-md bg-muted"
						style={{ width: `${100 - row * 15}%` }}
						animate={
							shouldReduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }
						}
						transition={
							shouldReduceMotion
								? undefined
								: {
										duration: 1.5,
										repeat: Infinity,
										ease: "easeInOut",
										delay: row * 0.15,
									}
						}
					/>
				))}
			</div>
		</div>
	);
}
