"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, History, Menu, MessageCircleQuestion, Search, Share2, X } from "lucide-react";

import { LogoCrystal } from "@landing/components/layouts/logo-crystal";
import { LifecycleStrip } from "@/components/LifecycleStrip";
import { ResetButton } from "@/components/ResetButton";
import { SidebarUserCard } from "@/components/SidebarUserCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useSearchSession } from "@/lib/search-session";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Diagnose", icon: Search },
  { href: "/app/memory", label: "Memory", icon: Database },
  { href: "/app/graph", label: "Graph", icon: Share2 },
  { href: "/app/ask", label: "Ask", icon: MessageCircleQuestion },
  { href: "/app/activity", label: "Activity", icon: History },
] as const;


function Wordmark() {
  return (
    <Link
      href="/app"
      className="group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <LogoCrystal className="size-9 transition-transform duration-200 group-hover:scale-105" />
      <span className="font-display text-lg font-semibold tracking-tight text-gradient">
        PatchPilot
      </span>
    </Link>
  );
}

/** Vertical nav list shared by the desktop sidebar and the mobile drawer. */
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1 p-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-2.5 rounded-xl px-3 font-sans text-sm font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Shared shell for every `/app/*` route: a persistent left sidebar with the
 * route nav (drawer on mobile), and a sticky glass topbar whose center slot
 * holds the Cognee lifecycle strip (remember → recall → improve → forget) —
 * the memory-lifecycle proof stays visible on every route. Mounted once in
 * the nested `app/(mvp)/app/layout.tsx` so it — and the
 * SearchSessionProvider beneath it — persist across route changes.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { resetSession } = useSearchSession();
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
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex min-h-svh flex-1">
      {/* Desktop sidebar — sticky full-height left rail. */}
      <aside className="glass-strong sticky top-0 z-20 hidden h-svh w-56 shrink-0 flex-col border-r border-border/60 lg:flex">
        <div className="flex h-14 items-center border-b border-border/60 px-5">
          <Wordmark />
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
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="glass-strong animate-rise-in absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border/60"
          >
            <div className="flex h-14 items-center justify-between border-b border-border/60 pr-2 pl-5">
              <Wordmark />
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
        {/* Topbar — 3-column grid keeps the lifecycle strip truly centered
            regardless of how wide the side groups are. */}
        <header className="glass-strong sticky top-0 z-20 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border/60 px-4 sm:px-6">
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
            <span className="lg:hidden">
              <Wordmark />
            </span>
          </div>

          <LifecycleStrip className="hidden md:flex" />

          <div className="flex items-center gap-1.5 justify-self-end">
            <ThemeToggle />
            <ResetButton onReset={resetSession} />
          </div>
        </header>

        {/* Compact lifecycle strip for phones — the topbar center slot is
            hidden below md, so surface the four-verb proof here instead. */}
        <div className="glass-strong flex justify-center overflow-x-auto border-b border-border/60 px-4 py-2 md:hidden">
          <LifecycleStrip className="flex" />
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
