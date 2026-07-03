"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Activity, Eraser, RotateCcw, ScanSearch, Upload } from "lucide-react";

interface FeedItem {
	id: number;
	action: "ingest" | "recall" | "drift" | "forget" | "re-search";
	label: string;
	detail: string;
	timestamp: string;
}

const SEQUENCE: readonly Omit<FeedItem, "id" | "timestamp">[] = [
	{
		action: "ingest",
		label: "Ingest",
		detail: "Stripe incidents → memory graph",
	},
	{
		action: "recall",
		label: "Recall",
		detail: "INC-1042 diagnosed · 94% confidence",
	},
	{
		action: "drift",
		label: "Drift",
		detail: "workarounds_v1_8 flagged 🔴 drifting",
	},
	{
		action: "forget",
		label: "Forget",
		detail: "workarounds_v1_8 pruned from memory",
	},
	{
		action: "re-search",
		label: "Re-search",
		detail: "`idempotency_guard` surfaces · 96%",
	},
];

const ICONS: Record<FeedItem["action"], typeof Upload> = {
	ingest: Upload,
	recall: ScanSearch,
	drift: Activity,
	forget: Eraser,
	"re-search": RotateCcw,
};

const COLORS: Record<FeedItem["action"], string> = {
	ingest: "text-primary",
	recall: "text-accent-violet",
	drift: "text-drift-aging",
	forget: "text-drift-aging",
	"re-search": "text-drift-stable",
};

function makeItem(id: number, index: number): FeedItem {
	const template = SEQUENCE[index % SEQUENCE.length];
	const now = new Date();
	return {
		id,
		...template,
		timestamp: now.toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		}),
	};
}

/**
 * Streaming activity feed showing the PatchPilot lifecycle playing in sequence.
 * Cycles through the fixed 5-step loop (ingest → recall → drift → forget → re-search)
 * so the feed always tells the real product story, not random noise.
 *
 * New items fade/slide in at the top; old items fade out at the bottom.
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
		// Seed initial items — show the first 3 steps immediately
		const initial = Array.from({ length: 3 }, (_, i) => makeItem(i, i));
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setItems(initial);

		let idCounter = 3;
		let seqIndex = 3;
		const interval = setInterval(
			() => {
				setItems((prev) => {
					const newItem = makeItem(idCounter++, seqIndex++);
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
			aria-label="PatchPilot lifecycle operations"
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
