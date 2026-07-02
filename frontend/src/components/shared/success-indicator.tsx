"use client";

import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

type SuccessTone = "forget" | "reset";

interface SuccessIndicatorProps {
	icon: LucideIcon;
	title: string;
	message: string;
	tone: SuccessTone;
	className?: string;
}

const TONE_STYLES: Record<SuccessTone, string> = {
	forget: "border-drift-stable/40 bg-drift-stable/10 text-drift-stable",
	reset: "border-primary/40 bg-primary/10 text-primary",
};

export function SuccessIndicator({
	icon: Icon,
	title,
	message,
	tone,
	className,
}: SuccessIndicatorProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.div
			role="status"
			aria-live="polite"
			data-tone={tone}
			initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
			animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
			transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
			className={cn(
				"flex items-start gap-3 rounded-xl border p-4",
				TONE_STYLES[tone],
				className,
			)}
		>
			<motion.span
				aria-hidden
				className="mt-0.5"
				initial={shouldReduceMotion ? false : { scale: 0.6, opacity: 0 }}
				animate={shouldReduceMotion ? {} : { scale: 1, opacity: 1 }}
				transition={
					shouldReduceMotion
						? undefined
						: { type: "spring", stiffness: 400, damping: 18, delay: 0.1 }
				}
			>
				<Icon className="size-5" />
			</motion.span>
			<div className="flex flex-col gap-0.5">
				<p className="text-sm font-semibold text-foreground">{title}</p>
				<p className="text-sm text-muted-foreground">{message}</p>
			</div>
		</motion.div>
	);
}
