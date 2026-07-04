"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, History, Search, Share2 } from "lucide-react";

import { LifecycleStrip } from "@/components/LifecycleStrip";
import { ResetButton } from "@/components/ResetButton";
import { useSearchSession } from "@/lib/search-session";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Diagnose", icon: Search },
  { href: "/app/memory", label: "Memory", icon: Database },
  { href: "/app/graph", label: "Graph", icon: Share2 },
  { href: "/app/activity", label: "Activity", icon: History },
] as const;

/**
 * Shared shell for every `/app/*` route (D-08's retired in-page tablist is
 * now real navigation): sticky glass topbar with the wordmark, a Link-based
 * glass-pill nav, and the demo reset control. Mounted once in the nested
 * `app/(mvp)/app/layout.tsx` so it — and the SearchSessionProvider beneath
 * it — persist across route changes.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { resetSession } = useSearchSession();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="glass-strong sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border/60 px-6">
        <span className="font-display text-lg font-semibold tracking-tight text-gradient">
          PatchPilot
        </span>

        <div className="flex items-center gap-3">
          <nav
            aria-label="Primary"
            className="glass flex items-center gap-1 rounded-full p-1"
          >
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/app" ? pathname === "/app" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full px-3 font-sans text-sm font-semibold transition-colors sm:px-4",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <LifecycleStrip className="hidden lg:flex" />

          <ResetButton onReset={resetSession} />
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
