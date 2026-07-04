'use client';

import {
  Ticket,
  FileText,
  GitBranch,
  MessageSquare,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';

interface SourceItem {
  icon: typeof Ticket;
  label: string;
}

const SOURCES: SourceItem[] = [
  { icon: Ticket, label: 'Tickets' },
  { icon: MessageSquare, label: 'Chats' },
  { icon: GitBranch, label: 'Changelogs' },
  { icon: FileText, label: 'Release notes' },
  { icon: AlertTriangle, label: 'Postmortems' },
  { icon: BookOpen, label: 'Runbooks' },
];

/**
 * Slow infinite-scroll marquee of data source types.
 * 40s loop, pauses on hover. Creates a sense of continuous data ingestion.
 * Respects prefers-reduced-motion (static grid, no scroll).
 */
export function SourceMarquee() {
  const prefersReducedMotion = useReducedMotion();
  const items = [...SOURCES, ...SOURCES];

  if (prefersReducedMotion) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4">
        {SOURCES.map((source) => (
          <SourceBadge key={source.label} source={source} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="group relative flex overflow-hidden"
      style={{
        maskImage:
          'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
      }}
    >
      <div className="flex shrink-0 animate-[marquee_40s_linear_infinite] items-center gap-4 group-hover:paused">
        {items.map((source, i) => (
          <SourceBadge key={`${source.label}-${i}`} source={source} />
        ))}
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: SourceItem }) {
  const Icon = source.icon;
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/40 bg-surface-elevated/40 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm">
      <Icon className="size-4 text-primary" aria-hidden />
      {source.label}
    </span>
  );
}
