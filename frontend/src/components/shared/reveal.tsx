"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@landing/lib/utils";

interface RevealProps {
	children: ReactNode;
	className?: string;
	delay?: number;
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return <div className={cn(className)}>{children}</div>;
	}

	return (
		<motion.div
			className={cn(className)}
			initial={{ opacity: 0, y: 24 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-100px" }}
			transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
		>
			{children}
		</motion.div>
	);
}
