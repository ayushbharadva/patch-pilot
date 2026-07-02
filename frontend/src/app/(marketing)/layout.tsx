import Link from "next/link";

import { ThemeToggle } from "@/components/layouts/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";
import { cn } from "@/lib/utils";

export default function MarketingLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<div className="flex min-h-dvh flex-col">
			<header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
				<div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
					<Link
						href="/"
						className="flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight"
					>
						<span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-gradient-start via-gradient-mid to-gradient-end text-sm font-bold text-primary-foreground">
							P
						</span>
						{SITE_CONFIG.name}
					</Link>

					<nav
						aria-label="Primary"
						className="hidden items-center gap-1 md:flex"
					>
						{SITE_CONFIG.dashboardNav.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
							>
								{item.label}
							</Link>
						))}
					</nav>

					<div className="flex items-center gap-2">
						<ThemeToggle />
						<Link
							href={SITE_CONFIG.launchHref}
							className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}
						>
							Launch app
						</Link>
					</div>
				</div>
			</header>

			<main className="flex-1">{children}</main>

			<footer className="border-t border-border/60 bg-surface-sunken/40">
				<div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
					<div className="flex items-center gap-2.5">
						<span className="flex size-6 items-center justify-center rounded-md bg-linear-to-br from-gradient-start via-gradient-mid to-gradient-end text-xs font-bold text-primary-foreground">
							P
						</span>
						<span className="font-medium text-foreground">
							{SITE_CONFIG.name}
						</span>
						<span aria-hidden>·</span>
						<span>{SITE_CONFIG.tagline}</span>
					</div>
					<p>
						© {new Date().getFullYear()} {SITE_CONFIG.name}. Built on Cognee.
					</p>
				</div>
			</footer>
		</div>
	);
}
