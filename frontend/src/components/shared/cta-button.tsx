"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

	return (
		<MotionLink
			href={href}
			className={cn(
				buttonVariants({ variant }),
				"h-12 min-w-11 gap-2 px-6 text-base font-semibold",
				className,
			)}
			whileHover={shouldReduceMotion ? undefined : { scale: 1.05, y: -2 }}
			whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
			transition={{ type: "spring", stiffness: 400, damping: 25 }}
		>
			{children}
		</MotionLink>
	);
}
