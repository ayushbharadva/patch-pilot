"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Wordmark } from "@/components/layouts/wordmark";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
	const shouldReduceMotion = useReducedMotion();

	useEffect(() => {
		if (!open) {
			return;
		}
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onOpenChange(false);
			}
		};
		document.addEventListener("keydown", handleKey);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", handleKey);
			document.body.style.overflow = "";
		};
	}, [open, onOpenChange]);

	return (
		<AnimatePresence>
			{open ? (
				<motion.div
					className="fixed inset-0 z-50 lg:hidden"
					initial={shouldReduceMotion ? false : { opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={shouldReduceMotion ? undefined : { opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					<button
						type="button"
						aria-label="Close navigation"
						className="absolute inset-0 bg-background/70 backdrop-blur-sm"
						onClick={() => onOpenChange(false)}
					/>
					<motion.div
						role="dialog"
						aria-modal="true"
						aria-label="Dashboard navigation"
						className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar shadow-xl"
						initial={shouldReduceMotion ? false : { x: "-100%" }}
						animate={{ x: 0 }}
						exit={shouldReduceMotion ? undefined : { x: "-100%" }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { type: "spring", stiffness: 360, damping: 34 }
						}
					>
						<div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
							<Wordmark />
							<Button
								variant="ghost"
								size="icon"
								className="size-11"
								aria-label="Close navigation"
								onClick={() => onOpenChange(false)}
							>
								<X />
							</Button>
						</div>
						<div className="flex-1 overflow-y-auto px-3 py-5">
							<DashboardNav
								idPrefix="mobile"
								onNavigate={() => onOpenChange(false)}
							/>
						</div>
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
