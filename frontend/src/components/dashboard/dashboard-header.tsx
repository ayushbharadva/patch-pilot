"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { MobileNav } from "@/components/dashboard/dashboard-mobile-nav";
import { ThemeToggle } from "@/components/layouts/theme-toggle";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";

function useCurrentSection() {
	const pathname = usePathname();
	return (
		SITE_CONFIG.dashboardNav.find(
			(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
		) ?? SITE_CONFIG.dashboardNav[0]
	);
}

export function DashboardHeader() {
	const [mobileOpen, setMobileOpen] = useState(false);
	const section = useCurrentSection();

	return (
		<header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
			<Button
				variant="outline"
				size="icon"
				className="size-11 lg:hidden"
				aria-label="Open navigation"
				aria-expanded={mobileOpen}
				onClick={() => setMobileOpen(true)}
			>
				<Menu />
			</Button>
			<div className="flex min-w-0 flex-col">
				<p className="truncate font-heading text-base font-semibold text-foreground sm:text-lg">
					{section.label}
				</p>
				<p className="hidden truncate text-xs text-muted-foreground sm:block">
					{section.description}
				</p>
			</div>
			<div className="ml-auto flex items-center gap-2">
				<ThemeToggle className="size-11" />
			</div>
			<MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
		</header>
	);
}
