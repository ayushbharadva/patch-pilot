"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@landing/components/ui/button";
import { cn } from "@landing/lib/utils";

const MotionLink = motion.create(Link);

interface CtaButtonProps {
	href: string;
	children: ReactNode;
	variant?: VariantProps<typeof buttonVariants>["variant"];
	className?: string;
}

export function CtaButton({
	href,
	children,
	variant = "default",
	className,
}: CtaButtonProps) {
	const shouldReduceMotion = useReducedMotion();
	const isPrimary = variant === "default" || variant === undefined;

	return (
		<MotionLink
			href={href}
			className={cn(
				buttonVariants({ variant }),
				"group/cta relative h-12 min-w-11 gap-2 overflow-hidden px-6 text-base font-semibold",
				className,
			)}
			whileHover={shouldReduceMotion ? undefined : { scale: 1.03, y: -1 }}
			whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
			transition={{ type: "spring", stiffness: 600, damping: 20 }}
		>
			{/* Shimmer sweep on hover for primary buttons */}
			{isPrimary && !shouldReduceMotion && (
				<span
					aria-hidden
					className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover/cta:translate-x-full"
				/>
			)}
			<span className="relative flex items-center gap-2">{children}</span>
		</MotionLink>
	);
}
