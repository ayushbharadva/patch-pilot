"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
	title: string;
	message: string;
	icon?: LucideIcon;
	action?: React.ReactNode;
	className?: string;
}

export function EmptyState({
	title,
	message,
	icon: Icon = Inbox,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center",
				className,
			)}
		>
			<span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
				<Icon className="size-6" />
			</span>
			<div className="flex flex-col gap-1">
				<h3 className="text-base font-semibold text-foreground">{title}</h3>
				<p className="max-w-sm text-sm text-muted-foreground">{message}</p>
			</div>
			{action}
		</div>
	);
}
