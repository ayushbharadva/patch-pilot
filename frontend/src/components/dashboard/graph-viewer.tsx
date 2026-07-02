'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';
import type { GraphData, GraphNode } from '@/types';

interface GraphViewerProps {
  data: GraphData;
}

interface PositionedNode extends GraphNode {
  xPct: number;
  yPct: number;
}

const COLUMN_X: Record<GraphNode['kind'], number> = {
  fix: 16,
  incident: 50,
  component: 84,
};

const KIND_STYLES: Record<
  GraphNode['kind'],
  { label: string; box: string; dot: string; swatch: string; glow: string }
> = {
  incident: {
    label: 'Incident',
    box: 'border-drift-aging/50 bg-drift-aging/10 text-foreground',
    dot: 'bg-drift-aging',
    swatch: 'bg-drift-aging',
    glow: 'var(--drift-aging)',
  },
  fix: {
    label: 'Fix',
    box: 'border-primary/50 bg-primary/10 text-foreground',
    dot: 'bg-primary',
    swatch: 'bg-primary',
    glow: 'var(--primary)',
  },
  component: {
    label: 'Component',
    box: 'border-border bg-surface-elevated text-muted-foreground',
    dot: 'bg-muted-foreground',
    swatch: 'bg-muted-foreground',
    glow: 'var(--muted-foreground)',
  },
};

function computeLayout(data: GraphData): PositionedNode[] {
  const kinds: GraphNode['kind'][] = ['fix', 'incident', 'component'];
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Compute connected node IDs for hover highlight
  const connectedIds = new Set<string>();
  if (hoveredNode) {
    connectedIds.add(hoveredNode);
    for (const link of data.links) {
      if (link.source === hoveredNode) connectedIds.add(link.target);
      if (link.target === hoveredNode) connectedIds.add(link.source);
    }
  }

  return (
    <figure className="flex flex-col gap-4">
      <figcaption className="flex flex-wrap items-center gap-4">
        {(Object.keys(KIND_STYLES) as GraphNode['kind'][]).map((kind) => (
          <span
            key={kind}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span
              aria-hidden
              className={cn('size-3 rounded-full', KIND_STYLES[kind].swatch)}
            />
            {KIND_STYLES[kind].label}
          </span>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {positioned.length} nodes · {data.links.length} edges
        </span>
      </figcaption>

      <div
        role="img"
        aria-label={`Memory graph with ${positioned.length} nodes and ${data.links.length} relationships`}
        className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border/60 bg-surface-sunken/40 sm:aspect-video"
      >
        {/* Neural grid texture */}
        <div className="pointer-events-none absolute inset-0 bg-neural-grid opacity-20" />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          aria-hidden
        >
          <defs>
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {data.links.map((link) => {
            const from = positionById.get(link.source);
            const to = positionById.get(link.target);
            if (!from || !to) return null;

            const isHighlighted =
              hoveredNode &&
              (link.source === hoveredNode || link.target === hoveredNode);
            const isDimmed = hoveredNode && !isHighlighted;

            return (
              <g key={`${link.source}-${link.target}`}>
                <motion.line
                  x1={from.xPct}
                  y1={from.yPct}
                  x2={to.xPct}
                  y2={to.yPct}
                  className={cn(
                    'transition-opacity',
                    isHighlighted ? 'stroke-primary' : 'stroke-border',
                  )}
                  strokeWidth={isHighlighted ? 0.5 : 0.35}
                  strokeOpacity={isDimmed ? 0.15 : isHighlighted ? 0.8 : 0.5}
                  initial={shouldReduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
                />
                {/* Flowing particle along edge */}
                {!shouldReduceMotion && (
                  <circle
                    r="0.4"
                    fill="var(--primary)"
                    opacity={isDimmed ? 0 : 0.6}
                  >
                    <animateMotion
                      dur="3s"
                      repeatCount="indefinite"
                      path={`M ${from.xPct} ${from.yPct} L ${to.xPct} ${to.yPct}`}
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {positioned.map((node, index) => {
          const style = KIND_STYLES[node.kind];
          const isHovered = hoveredNode === node.id;
          const isDimmed = hoveredNode && !connectedIds.has(node.id);

          return (
            <motion.div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.xPct}%`, top: `${node.yPct}%` }}
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{
                opacity: isDimmed ? 0.3 : 1,
                scale: isHovered ? 1.1 : 1,
              }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.3,
                delay: shouldReduceMotion ? 0 : index * 0.04,
                ease: 'easeOut',
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <span
                title={`${style.label}: ${node.label}`}
                className={cn(
                  'flex max-w-36 cursor-default items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-colors',
                  style.box,
                  isHovered && 'shadow-lg ring-2 ring-primary/40',
                )}
              >
                <span
                  aria-hidden
                  className={cn('size-2 shrink-0 rounded-full', style.dot)}
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
