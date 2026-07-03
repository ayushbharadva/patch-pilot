"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useMounted(): boolean {
	return useSyncExternalStore(
		emptySubscribe,
		() => true,
		() => false,
	);
}

interface ThemeToggleProps {
	className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
	const { resolvedTheme, setTheme } = useTheme();
	const shouldReduceMotion = useReducedMotion();
	const mounted = useMounted();

	const isDark = resolvedTheme === "dark";
	const Icon = isDark ? Moon : Sun;

	if (!mounted) {
		return (
			<Button
				variant="ghost"
				size="icon"
				aria-label="Toggle theme"
				className={cn(className)}
				disabled
			>
				<Sun />
			</Button>
		);
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			aria-label="Toggle theme"
			className={cn(className)}
			onClick={() => setTheme(isDark ? "light" : "dark")}
		>
			{shouldReduceMotion ? (
				<Icon />
			) : (
				<AnimatePresence mode="wait" initial={false}>
					<motion.span
						key={isDark ? "moon" : "sun"}
						initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
						animate={{ opacity: 1, rotate: 0, scale: 1 }}
						exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
						className="flex items-center justify-center"
					>
						<Icon />
					</motion.span>
				</AnimatePresence>
			)}
		</Button>
	);
}
