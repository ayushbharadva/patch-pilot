"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Eraser, ScanSearch, Upload, Waypoints } from "lucide-react";

interface FeedItem {
	id: number;
	action: "ingest" | "recall" | "graph" | "forget";
	label: string;
	detail: string;
	timestamp: string;
}

const ACTIONS: FeedItem["action"][] = ["ingest", "recall", "graph", "forget"];

const TEMPLATES: Record<FeedItem["action"], { label: string; detail: string }> =
	{
		ingest: {
			label: "Ingest",
			detail: "auth-gateway incidents → memory graph",
		},
		recall: {
			label: "Recall",
			detail: "BUG-2043 diagnosed · 94% confidence",
		},
		graph: {
			label: "Graph",
			detail: "14 nodes · 15 edges traversed",
		},
		forget: {
			label: "Forget",
			detail: "workarounds_v1_7 pruned from memory",
		},
	};

const ICONS: Record<FeedItem["action"], typeof Upload> = {
	ingest: Upload,
	recall: ScanSearch,
	graph: Waypoints,
	forget: Eraser,
};

const COLORS: Record<FeedItem["action"], string> = {
	ingest: "text-primary",
	recall: "text-accent-violet",
	graph: "text-drift-stable",
	forget: "text-drift-aging",
};

function makeItem(id: number): FeedItem {
	const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
	const template = TEMPLATES[action];
	const now = new Date();
	return {
		id,
		action,
		label: template.label,
		detail: template.detail,
		timestamp: now.toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		}),
	};
}

/**
 * Streaming activity feed showing memory operations appearing in real-time.
 * New items fade/slide in at the top; old items fade out at the bottom.
 *
 * Layout stability: the container has a fixed height computed from maxItems,
 * so adding/removing entries never shifts surrounding content. Items animate
 * opacity and transform only (no height changes, no layout reflow).
 *
 * Respects prefers-reduced-motion (items appear instantly, no animation).
 */
export function ActivityFeed({ maxItems = 5 }: { maxItems?: number }) {
	const [items, setItems] = useState<FeedItem[]>([]);
	const prefersReducedMotion = useReducedMotion();

	useEffect(() => {
		// Seed initial items
		const initial = Array.from({ length: 3 }, (_, i) => makeItem(i));
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setItems(initial);

		let idCounter = 3;
		const interval = setInterval(
			() => {
				setItems((prev) => {
					const newItem = makeItem(idCounter++);
					return [newItem, ...prev].slice(0, maxItems);
				});
			},
			prefersReducedMotion ? 999999 : 3500,
		);

		return () => clearInterval(interval);
	}, [maxItems, prefersReducedMotion]);

	// Fixed height: each row is ~40px (py-2 + content) + 6px gap
	const rowHeight = 46;
	const containerHeight = maxItems * rowHeight;

	return (
		<div
			className="relative overflow-hidden"
			style={{ height: `${containerHeight}px` }}
			aria-label="Live memory operations"
		>
			<AnimatePresence initial={false}>
				{items.map((item, index) => {
					const Icon = ICONS[item.action];
					return (
						<motion.div
							key={item.id}
							initial={
								prefersReducedMotion ? undefined : { opacity: 0, y: -rowHeight }
							}
							animate={{ opacity: 1, y: index * rowHeight }}
							exit={
								prefersReducedMotion
									? undefined
									: { opacity: 0, y: maxItems * rowHeight }
							}
							transition={{
								duration: 0.4,
								ease: [0.22, 1, 0.36, 1],
							}}
							className="absolute inset-x-0 flex items-center gap-3 rounded-lg border border-border/40 bg-surface-elevated/40 px-3 py-2 backdrop-blur-sm"
						>
							<Icon
								className={`size-3.5 shrink-0 ${COLORS[item.action]}`}
								aria-hidden
							/>
							<span
								className={`font-mono text-xs font-semibold ${COLORS[item.action]}`}
							>
								{item.label}
							</span>
							<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
								{item.detail}
							</span>
							<span
								className="shrink-0 font-mono text-[0.65rem] text-muted-foreground/60"
								style={{ fontVariantNumeric: "tabular-nums" }}
							>
								{item.timestamp}
							</span>
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>
	);
}
