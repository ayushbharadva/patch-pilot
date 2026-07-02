'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

/**
 * SVG-based animated product lifecycle demo.
 * Auto-plays a scripted sequence showing the full PatchPilot loop:
 * Ingest → Recall → Drift → Forget → Re-search
 *
 * Uses SVG animations for the graph visualization (nodes lighting up,
 * connections drawing) and Framer Motion for text/state transitions.
 * Zero user input required — purely automatic, loops continuously.
 * Respects prefers-reduced-motion (shows final state statically).
 */

type Phase = 0 | 1 | 2 | 3 | 4;

const PHASES = [
  {
    label: 'Ingest',
    subtitle: 'Feeding incidents into memory',
    color: '#22d3ee',
  },
  {
    label: 'Recall',
    subtitle: 'Diagnosing from past evidence',
    color: '#a78bfa',
  },
  {
    label: 'Drift',
    subtitle: 'Flagging stale workarounds',
    color: '#fbbf24',
  },
  {
    label: 'Forget',
    subtitle: 'Pruning outdated memory',
    color: '#f87171',
  },
  {
    label: 'Re-search',
    subtitle: 'Confidence jumps to 96%',
    color: '#34d399',
  },
] as const;

const PHASE_DURATION = 2400;

// SVG node positions (in a 400x300 viewBox)
const NODES = [
  { id: 'fix', x: 80, y: 150, label: 'FIX', color: '#22d3ee' },
  { id: 'inc1', x: 200, y: 80, label: 'INC', color: '#fbbf24' },
  { id: 'inc2', x: 200, y: 150, label: 'INC', color: '#fbbf24' },
  { id: 'inc3', x: 200, y: 220, label: 'INC', color: '#fbbf24' },
  { id: 'comp1', x: 320, y: 100, label: 'SVC', color: '#94a3b8' },
  { id: 'comp2', x: 320, y: 200, label: 'API', color: '#94a3b8' },
];

const EDGES = [
  { from: 'fix', to: 'inc1' },
  { from: 'fix', to: 'inc2' },
  { from: 'fix', to: 'inc3' },
  { from: 'inc1', to: 'comp1' },
  { from: 'inc2', to: 'comp1' },
  { from: 'inc3', to: 'comp2' },
];

function getNode(id: string) {
  return NODES.find((n) => n.id === id)!;
}

export function LifecycleDemo() {
  const [phase, setPhase] = useState<Phase>(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setPhase((p) => ((p + 1) % 5) as Phase);
    }, PHASE_DURATION);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  const currentPhase = PHASES[phase];
  const confidence =
    phase === 4
      ? 96
      : phase === 1
        ? 55
        : phase === 0
          ? 0
          : phase === 3
            ? 55
            : 94;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface-elevated/80 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-drift-drifting" />
          <span className="size-2.5 rounded-full bg-drift-aging" />
          <span className="size-2.5 rounded-full bg-drift-stable" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            patchpilot — lifecycle demo
          </span>
        </div>
        {/* Phase progress dots */}
        <div className="flex items-center gap-1.5">
          {PHASES.map((p, i) => (
            <span
              key={i}
              className="size-1.5 rounded-full transition-colors duration-300"
              style={{
                backgroundColor: i === phase ? p.color : 'var(--border)',
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-[1fr_240px]">
        {/* SVG Graph Visualization */}
        <div className="relative min-h-70 p-4">
          <svg viewBox="0 0 400 300" className="size-full" aria-hidden="true">
            {/* Edges */}
            {EDGES.map((edge, i) => {
              const from = getNode(edge.from);
              const to = getNode(edge.to);
              const isActive = phase >= 1 && phase !== 3;
              const isForgotten = phase === 3 && edge.from === 'fix';
              return (
                <motion.line
                  key={i}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={
                    isForgotten ? '#f87171' : isActive ? '#22d3ee' : '#334155'
                  }
                  strokeWidth={1.5}
                  strokeOpacity={isForgotten ? 0.3 : isActive ? 0.6 : 0.3}
                  strokeDasharray={isForgotten ? '4 4' : '0'}
                  initial={false}
                  animate={{
                    strokeOpacity: isForgotten ? 0.2 : isActive ? 0.6 : 0.25,
                  }}
                  transition={{ duration: 0.5 }}
                />
              );
            })}

            {/* Nodes */}
            {NODES.map((node) => {
              const isFixNode = node.id === 'fix';
              const isForgotten = phase === 3 && isFixNode;
              const isReSearched = phase === 4 && isFixNode;
              const nodeColor = isForgotten
                ? '#f87171'
                : isReSearched
                  ? '#34d399'
                  : node.color;
              const nodeOpacity = isForgotten ? 0.3 : 1;

              return (
                <g key={node.id}>
                  {/* Glow */}
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={18}
                    fill={nodeColor}
                    opacity={0.1}
                    initial={{ r: 18, opacity: 0.1 }}
                    animate={{
                      opacity: isForgotten ? 0 : [0.05, 0.15, 0.05],
                      r: isForgotten ? 12 : [16, 20, 16],
                    }}
                    transition={{
                      duration: 2,
                      repeat: prefersReducedMotion ? 0 : Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  {/* Node circle */}
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={10}
                    fill={nodeColor}
                    fillOpacity={0.2}
                    stroke={nodeColor}
                    strokeWidth={2}
                    animate={{
                      fillOpacity: isForgotten ? 0.05 : 0.25,
                      opacity: nodeOpacity,
                    }}
                    transition={{ duration: 0.4 }}
                  />
                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + 3}
                    textAnchor="middle"
                    className="font-mono text-[8px] font-bold"
                    fill={nodeColor}
                    opacity={nodeOpacity}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}

            {/* Animated pulse traveling along edges during recall */}
            {phase === 1 && !prefersReducedMotion && (
              <>
                {EDGES.map((edge, i) => {
                  const from = getNode(edge.from);
                  const to = getNode(edge.to);
                  return (
                    <circle key={i} r={3} fill="#a78bfa" opacity="0.8">
                      <animateMotion
                        dur="1.5s"
                        repeatCount="indefinite"
                        begin={`${i * 0.2}s`}
                        path={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                      />
                    </circle>
                  );
                })}
              </>
            )}
          </svg>
        </div>

        {/* Side panel: phase info + confidence + terminal */}
        <div className="flex flex-col border-t border-border/60 p-4 md:border-l md:border-t-0">
          {/* Phase timeline — vertical stepper */}
          <div className="mb-4 flex items-center gap-1">
            {PHASES.map((p, i) => (
              <div key={i} className="flex flex-1 items-center gap-1">
                <div
                  className="relative flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[0.6rem] font-bold transition-all duration-300"
                  style={{
                    borderColor:
                      i === phase
                        ? p.color
                        : i < phase
                          ? p.color
                          : 'var(--border)',
                    backgroundColor:
                      i < phase
                        ? p.color
                        : i === phase
                          ? 'transparent'
                          : 'transparent',
                    color:
                      i < phase
                        ? 'var(--background)'
                        : i === phase
                          ? p.color
                          : 'var(--muted-foreground)',
                  }}
                >
                  {i < phase ? '✓' : i + 1}
                  {i === phase && !prefersReducedMotion && (
                    <motion.span
                      className="absolute inset-0 rounded-full"
                      style={{ borderColor: p.color, borderWidth: 2 }}
                      animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                    />
                  )}
                </div>
                {i < PHASES.length - 1 && (
                  <div
                    className="h-px flex-1 transition-colors duration-300"
                    style={{
                      backgroundColor: i < phase ? p.color : 'var(--border)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Phase label + subtitle */}
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: currentPhase.color }}
                />
                <p
                  className="text-xs font-semibold tracking-wide uppercase"
                  style={{ color: currentPhase.color }}
                >
                  {currentPhase.label}
                </p>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {currentPhase.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Circular confidence ring */}
          <div className="my-4 flex items-center gap-3">
            <div className="relative flex size-14 shrink-0 items-center justify-center">
              <svg
                className="size-14 -rotate-90"
                viewBox="0 0 56 56"
                aria-hidden
              >
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke={currentPhase.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 24}
                  initial={false}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 24 * (1 - confidence / 100),
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </svg>
              <span
                className="absolute font-mono text-xs font-bold"
                style={{
                  color: currentPhase.color,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {confidence}%
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-medium text-muted-foreground">
                Confidence
              </p>
              <p className="text-[0.65rem] text-muted-foreground/70">
                {phase === 0
                  ? 'Building memory…'
                  : phase === 4
                    ? 'Post-forget result'
                    : 'Pre-forget result'}
              </p>
            </div>
          </div>

          {/* Terminal output */}
          <div className="mt-auto space-y-1 rounded-lg border border-border/40 bg-background/40 p-2.5 font-mono text-[0.65rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={prefersReducedMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1"
              >
                <p className="text-muted-foreground">
                  <span style={{ color: currentPhase.color }}>$</span>{' '}
                  {phase === 0 && 'patchpilot ingest --source auth-gateway'}
                  {phase === 1 && 'patchpilot recall --bug AUTH-401'}
                  {phase === 2 && 'patchpilot drift --release 1.9'}
                  {phase === 3 &&
                    'patchpilot forget --dataset workarounds_v1_7'}
                  {phase === 4 && 'patchpilot recall --bug AUTH-401'}
                </p>
                <p style={{ color: currentPhase.color }}>
                  → {phase === 0 && '42 incidents linked to 3 fixes'}
                  {phase === 1 && 'root cause: token rotation race'}
                  {phase === 2 && '2 drifting · 1 aging'}
                  {phase === 3 && 'stale workaround pruned'}
                  {phase === 4 && 'new fix: server-side rotation'}
                </p>
              </motion.div>
            </AnimatePresence>
            {!prefersReducedMotion && (
              <span
                className="inline-block h-3 w-1.5 animate-pulse"
                style={{ backgroundColor: currentPhase.color }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
