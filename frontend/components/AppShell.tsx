'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Database,
  History,
  Menu,
  MessageCircleQuestion,
  Search,
  Share2,
  X,
} from 'lucide-react';

import { Wordmark } from '@landing/components/layouts/wordmark';
import { LifecycleStrip } from '@/components/LifecycleStrip';
import { PageTitle } from '@/components/PageTitle';
import { SidebarUserCard } from '@/components/SidebarUserCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/app', label: 'Diagnose', icon: Search },
  { href: '/app/memory', label: 'Memory', icon: Database },
  { href: '/app/graph', label: 'Graph', icon: Share2 },
  { href: '/app/ask', label: 'Ask', icon: MessageCircleQuestion },
  { href: '/app/activity', label: 'Activity', icon: History },
] as const;

/** Vertical nav list shared by the desktop sidebar and the mobile drawer. */
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1 p-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === '/app' ? pathname === '/app' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
            className={cn(
              'flex h-10 items-center gap-2.5 rounded-lg px-3 font-sans text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                'size-4 shrink-0',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Shared shell for every `/app/*` route. Mirrors the landing page's header
 * treatment exactly: `bg-background/70 backdrop-blur-xl border-b border-border/60`
 * — a semi-transparent surface with blur, NOT a custom `.glass-strong` class.
 * The sidebar uses the same treatment on its right border. The active nav row
 * uses `bg-primary/10 text-primary` (subtle tinted) matching the landing's
 * button/link language. No 3D in persistent chrome — the landing keeps its
 * 3D in dedicated full-viewport sections, and so does /app.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on route change (covers back/forward, not just link
  // clicks). Adjust-during-render instead of an effect per
  // react-hooks/set-state-in-effect.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setDrawerOpen(false);
  }

  // Close on Escape while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex min-h-svh flex-1">
      {/* Desktop sidebar — matches the landing header's surface treatment. */}
      <aside className="sticky top-0 z-20 hidden h-svh w-60 shrink-0 flex-col border-r border-border/60 bg-background/70 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <Wordmark href="/app" />
        </div>
        <NavLinks />
        <SidebarUserCard />
      </aside>

      {/* Mobile drawer + backdrop. */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-pointer bg-background/60 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border/60 bg-background/95 backdrop-blur-xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-border/60 pr-2 pl-5">
              <Wordmark href="/app" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Close navigation"
                onClick={() => setDrawerOpen(false)}
                className="size-9 rounded-full p-0 text-muted-foreground"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
            <SidebarUserCard onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar — identical surface treatment to the landing header. */}
        <header className="sticky top-0 z-20 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3 justify-self-start">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className="size-9 rounded-full p-0 text-muted-foreground lg:hidden"
            >
              <Menu aria-hidden="true" className="size-4" />
            </Button>
            <PageTitle />
            <span className="lg:hidden">
              <Wordmark href="/app" />
            </span>
          </div>

          <LifecycleStrip className="hidden md:flex" />

          <div className="flex items-center gap-1.5 justify-self-end">
            <ThemeToggle />
          </div>
        </header>

        {/* Compact lifecycle strip for phones — the topbar center slot is
            hidden below md, so surface the four-verb proof here instead. */}
        <div className="flex justify-center overflow-x-auto border-b border-border/60 bg-background/70 px-4 py-2 backdrop-blur-xl md:hidden">
          <LifecycleStrip className="flex" />
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
