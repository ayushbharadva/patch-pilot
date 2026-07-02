"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import type { GraphData, GraphNode } from "@/types";

interface GraphViewerProps {
	data: GraphData;
}

interface PositionedNode extends GraphNode {
	xPct: number;
	yPct: number;
}

const COLUMN_X: Record<GraphNode["kind"], number> = {
	fix: 16,
	incident: 50,
	component: 84,
};

const KIND_STYLES: Record<
	GraphNode["kind"],
	{ label: string; box: string; dot: string; swatch: string }
> = {
	incident: {
		label: "Incident",
		box: "border-drift-aging/50 bg-drift-aging/10 text-foreground",
		dot: "bg-drift-aging",
		swatch: "bg-drift-aging",
	},
	fix: {
		label: "Fix",
		box: "border-primary/50 bg-primary/10 text-foreground",
		dot: "bg-primary",
		swatch: "bg-primary",
	},
	component: {
		label: "Component",
		box: "border-border bg-surface-elevated text-muted-foreground",
		dot: "bg-muted-foreground",
		swatch: "bg-muted-foreground",
	},
};

function computeLayout(data: GraphData): PositionedNode[] {
	const kinds: GraphNode["kind"][] = ["fix", "incident", "component"];
	return kinds.flatMap((kind) => {
		const column = data.nodes.filter((node) => node.kind === kind);
		return column.map((node, index) => ({
			...node,
			xPct: COLUMN_X[kind],
			yPct: ((index + 1) / (column.length + 1)) * 100,
		}));
	});
}

export function GraphViewer({ data }: GraphViewerProps) {
	const shouldReduceMotion = useReducedMotion();
	const positioned = computeLayout(data);
	const positionById = new Map(positioned.map((node) => [node.id, node]));

	return (
		<figure className="flex flex-col gap-4">
			<figcaption className="flex flex-wrap gap-4">
				{(Object.keys(KIND_STYLES) as GraphNode["kind"][]).map((kind) => (
					<span
						key={kind}
						className="inline-flex items-center gap-2 text-sm text-muted-foreground"
					>
						<span
							aria-hidden
							className={cn("size-3 rounded-full", KIND_STYLES[kind].swatch)}
						/>
						{KIND_STYLES[kind].label}
					</span>
				))}
			</figcaption>

			<div
				role="img"
				aria-label={`Memory graph with ${positioned.length} nodes and ${data.links.length} relationships`}
				className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border/60 bg-surface-sunken/40 sm:aspect-video"
			>
				<svg
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
					className="absolute inset-0 size-full"
					aria-hidden
				>
					{data.links.map((link) => {
						const from = positionById.get(link.source);
						const to = positionById.get(link.target);
						if (!from || !to) {
							return null;
						}
						return (
							<motion.line
								key={`${link.source}-${link.target}`}
								x1={from.xPct}
								y1={from.yPct}
								x2={to.xPct}
								y2={to.yPct}
								className="stroke-border"
								strokeWidth={0.35}
								initial={shouldReduceMotion ? false : { opacity: 0 }}
								animate={{ opacity: 0.7 }}
								transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
							/>
						);
					})}
				</svg>

				{positioned.map((node, index) => {
					const style = KIND_STYLES[node.kind];
					return (
						<motion.div
							key={node.id}
							className="absolute -translate-x-1/2 -translate-y-1/2"
							style={{ left: `${node.xPct}%`, top: `${node.yPct}%` }}
							initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{
								duration: shouldReduceMotion ? 0 : 0.4,
								delay: shouldReduceMotion ? 0 : index * 0.04,
								ease: "easeOut",
							}}
						>
							<span
								title={`${style.label}: ${node.label}`}
								className={cn(
									"flex max-w-36 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm",
									style.box,
								)}
							>
								<span
									aria-hidden
									className={cn("size-2 shrink-0 rounded-full", style.dot)}
								/>
								<span className="truncate">{node.label}</span>
							</span>
						</motion.div>
					);
				})}
			</div>
		</figure>
	);
}
