import Link from "next/link";

import { SITE_CONFIG } from "@/config/site";
import { cn } from "@/lib/utils";

interface WordmarkProps {
	href?: string;
	className?: string;
}

/**
 * PatchPilot logo mark — a custom SVG representing a memory graph:
 * a central node connected to three orbiting nodes, symbolizing
 * the incident→fix→component memory structure.
 */
export function LogoMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 36 36"
			fill="none"
			className={className}
			aria-hidden="true"
		>
			{/* Connection lines */}
			<line x1="18" y1="18" x2="8" y2="9" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
			<line x1="18" y1="18" x2="28" y2="9" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
			<line x1="18" y1="18" x2="18" y2="30" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />

			{/* Outer nodes */}
			<circle cx="8" cy="9" r="3" fill="currentColor" fillOpacity="0.7" />
			<circle cx="28" cy="9" r="3" fill="currentColor" fillOpacity="0.7" />
			<circle cx="18" cy="30" r="3" fill="currentColor" fillOpacity="0.7" />

			{/* Central node — larger, brighter */}
			<circle cx="18" cy="18" r="5" fill="currentColor" />
			<circle cx="18" cy="18" r="7" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
		</svg>
	);
}

export function Wordmark({ href = "/", className }: WordmarkProps) {
	return (
		<Link
			href={href}
			className={cn(
				"group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
				className,
			)}
		>
			<span className="relative flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-gradient-start via-gradient-mid to-gradient-end text-primary-foreground shadow-[0_0_20px_-4px_var(--glow)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
				<LogoMark className="size-5" />
			</span>
			<span className="flex flex-col leading-none">
				<span className="font-heading text-base font-bold tracking-tight text-foreground">
					{SITE_CONFIG.name}
				</span>
				<span className="mt-1 text-[0.65rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
					Incident memory
				</span>
			</span>
		</Link>
	);
}
