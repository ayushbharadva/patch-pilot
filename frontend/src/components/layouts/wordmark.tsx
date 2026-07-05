import Link from "next/link";

import { LogoCrystal } from "@landing/components/layouts/logo-crystal";
import { SITE_CONFIG } from "@landing/config/site";
import { cn } from "@landing/lib/utils";

interface WordmarkProps {
	href?: string;
	className?: string;
}


export function LogoMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 32 32"
			fill="none"
			className={className}
			aria-hidden="true"
		>
			{/* Facets (upper-left lit → lower-right in shadow) */}
			<polygon points="16,2.6 3.6,12.2 16,17.2" fill="currentColor" fillOpacity="0.92" />
			<polygon points="16,2.6 28.4,12.2 16,17.2" fill="currentColor" fillOpacity="0.66" />
			<polygon points="16,29.4 3.6,12.2 16,17.2" fill="currentColor" fillOpacity="0.4" />
			<polygon points="16,29.4 28.4,12.2 16,17.2" fill="currentColor" fillOpacity="0.26" />

			{/* Crisp faceted edges — silhouette + internal ridges */}
			<g
				stroke="currentColor"
				strokeWidth="0.9"
				strokeLinejoin="round"
				strokeLinecap="round"
				fill="none"
			>
				<polygon points="16,2.6 28.4,12.2 16,29.4 3.6,12.2" strokeOpacity="0.95" />
				<line x1="16" y1="2.6" x2="16" y2="29.4" strokeOpacity="0.55" />
				<line x1="3.6" y1="12.2" x2="16" y2="17.2" strokeOpacity="0.55" />
				<line x1="28.4" y1="12.2" x2="16" y2="17.2" strokeOpacity="0.55" />
			</g>
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
			<LogoCrystal className="size-10 drop-shadow-[0_0_14px_var(--glow)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95" />
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
