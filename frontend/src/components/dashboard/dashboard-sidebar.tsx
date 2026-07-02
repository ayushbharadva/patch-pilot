import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Wordmark } from "@/components/layouts/wordmark";
import { SITE_CONFIG } from "@/config/site";

export function DashboardSidebar() {
	return (
		<aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
			<div className="flex h-16 items-center border-b border-sidebar-border px-5">
				<Wordmark />
			</div>
			<div className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
				<DashboardNav idPrefix="sidebar" />
			</div>
			<div className="border-t border-sidebar-border px-5 py-4">
				<p className="font-mono text-xs text-muted-foreground">
					{SITE_CONFIG.tagline}
				</p>
			</div>
		</aside>
	);
}
