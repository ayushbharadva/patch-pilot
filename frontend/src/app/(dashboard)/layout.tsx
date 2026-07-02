import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-svh w-full overflow-x-hidden bg-background">
			<DashboardSidebar />
			<div className="flex min-w-0 flex-1 flex-col">
				<DashboardHeader />
				<main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
					<div className="mx-auto w-full max-w-6xl">{children}</div>
				</main>
			</div>
		</div>
	);
}
