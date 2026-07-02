import Link from "next/link";
import { Radar } from "lucide-react";

import { SITE_CONFIG } from "@/config/site";
import { cn } from "@/lib/utils";

interface WordmarkProps {
	href?: string;
	className?: string;
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
			<span className="relative flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-gradient-start via-gradient-mid to-gradient-end text-primary-foreground shadow-[0_0_20px_-4px_var(--glow)]">
				<Radar className="size-5" aria-hidden />
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
