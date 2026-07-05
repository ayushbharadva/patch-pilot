'use client';

import Link from 'next/link';
import { useClerk, useUser } from '@clerk/nextjs';
import { ArrowLeft, LogOut, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Sidebar footer: signed-in user identity + Profile / Sign out / Back-to-site
 * actions. Rendered at the bottom of the desktop sidebar and the mobile
 * drawer (AppShell).
 */
export function SidebarUserCard({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const displayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    'Account';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  return (
    <div className="mt-auto flex flex-col gap-1 border-t border-border/60 p-3">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-9 items-center gap-2.5 rounded-xl px-3 font-sans text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to site
      </Link>

      <Link
        href="/app/profile"
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors',
          'hover:bg-foreground/[0.06]',
        )}
        aria-label="Open profile"
      >
        {isLoaded && user?.imageUrl ? (
          // Clerk avatars live on img.clerk.com — plain <img> avoids adding a
          // next/image remotePatterns entry for a 28px avatar.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.imageUrl}
            alt=""
            className="size-7 shrink-0 rounded-full border border-border/60"
          />
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <UserRound aria-hidden="true" className="size-4" />
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-sans text-sm font-semibold text-foreground">
            {displayName}
          </span>
          {email ? (
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {email}
            </span>
          ) : null}
        </span>
      </Link>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void signOut({ redirectUrl: '/' })}
        className="h-9 justify-start gap-2.5 rounded-xl px-3 font-sans text-sm font-normal text-muted-foreground hover:text-destructive"
      >
        <LogOut aria-hidden="true" className="size-4 cursor-pointer" />
        Sign out
      </Button>
    </div>
  );
}
