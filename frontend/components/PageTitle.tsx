'use client';

import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

/**
 * Route-aware page title for the AppShell topbar. Reads the current pathname
 * and renders a compact, mono-style label so the user always knows which
 * `/app/*` route they're on — especially valuable on mobile where the
 * sidebar is hidden behind a drawer. The lifecycle strip stays centered in
 * the topbar's middle slot; this sits in the left slot next to the mobile
 * menu button.
 *
 * Kept deliberately small (text-sm, mono, muted) so it reads as orientation,
 * not a duplicate of the rich `RouteHeader` hero that lives in each page's
 * content area.
 */

interface RouteMeta {
  /** Compact label shown in the topbar. */
  label: string;
  /** One-line description for the title attribute (hover tooltip). */
  hint: string;
}

const ROUTES: Record<string, RouteMeta> = {
  '/app': { label: 'Diagnose', hint: 'Search incident memory for a diagnosis' },
  '/app/memory': {
    label: 'Memory',
    hint: 'Upload, manage, and forget datasets',
  },
  '/app/graph': {
    label: 'Graph',
    hint: 'Explore the live Cognee knowledge graph',
  },
  '/app/ask': {
    label: 'Ask',
    hint: 'Conversational recall over your incident memory',
  },
  '/app/activity': {
    label: 'Activity',
    hint: 'Chronological incident and release timeline',
  },
  '/app/profile': {
    label: 'Profile',
    hint: 'Manage your account and sessions',
  },
};

function resolveRoute(pathname: string): RouteMeta {
  // Try exact match first (e.g. /app), then prefix match for nested routes.
  if (ROUTES[pathname]) return ROUTES[pathname];
  const match = Object.keys(ROUTES)
    .filter((key) => key !== '/app' && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  return match
    ? ROUTES[match]
    : { label: 'PatchPilot', hint: 'Incident memory' };
}

export function PageTitle({ className }: { className?: string }) {
  const pathname = usePathname();
  const route = resolveRoute(pathname);

  return (
    <span
      title={route.hint}
      className={cn(
        'hidden items-center gap-2 font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase sm:inline-flex',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-accent-cyan shadow-[0_0_8px_var(--glow)]"
      />
      {route.label}
    </span>
  );
}
