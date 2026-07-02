"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

import { SITE_CONFIG } from "@/config/site";
import { cn } from "@/lib/utils";

interface DashboardNavProps {
	idPrefix?: string;
	onNavigate?: () => void;
	className?: string;
}

function isActive(pathname: string, href: string): boolean {
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({
	idPrefix = "nav",
	onNavigate,
	className,
}: DashboardNavProps) {
	const pathname = usePathname();
	const shouldReduceMotion = useReducedMotion();

	return (
		<nav
			aria-label="Dashboard sections"
			className={cn("flex flex-col gap-1", className)}
		>
			{SITE_CONFIG.dashboardNav.map((item) => {
				const active = isActive(pathname, item.href);
				const Icon = item.icon;

				return (
					<Link
						key={item.href}
						href={item.href}
						onClick={onNavigate}
						aria-current={active ? "page" : undefined}
						className={cn(
							"group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50",
							active
								? "text-sidebar-accent-foreground"
								: "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
						)}
					>
						{active ? (
							<motion.span
								layoutId={`${idPrefix}-active`}
								aria-hidden
								className="absolute inset-0 -z-10 rounded-lg bg-sidebar-accent"
								transition={
									shouldReduceMotion
										? { duration: 0 }
										: { type: "spring", stiffness: 400, damping: 32 }
								}
							/>
						) : null}
						<Icon className="size-4 shrink-0" aria-hidden />
						<span className="truncate">{item.label}</span>
					</Link>
				);
			})}
		</nav>
	);
}
