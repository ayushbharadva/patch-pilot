import Link from 'next/link';

import { AuthNavLinks } from '@landing/components/layouts/auth-nav-links';
import { ThemeToggle } from '@landing/components/layouts/theme-toggle';
import { LogoMark } from '@landing/components/layouts/wordmark';
import { SystemStatusBar } from '@landing/components/shared/system-status-bar';
import { buttonVariants } from '@landing/components/ui/button';
import { SITE_CONFIG } from '@landing/config/site';
import { cn } from '@landing/lib/utils';

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-gradient-start via-gradient-mid to-gradient-end text-primary-foreground transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
              <LogoMark className="size-4" />
            </span>
            {SITE_CONFIG.name}
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              <SystemStatusBar />
            </div>
            <ThemeToggle />
            <Link
              href={SITE_CONFIG.launchHref}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'lg' }),
                'hidden h-10 px-4 sm:inline-flex',
              )}
            >
              See how it works
            </Link>
            <AuthNavLinks />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 bg-surface-sunken/40">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-linear-to-br from-gradient-start via-gradient-mid to-gradient-end text-primary-foreground">
              <LogoMark className="size-3.5" />
            </span>
            <span className="font-medium text-foreground">
              {SITE_CONFIG.name}
            </span>
            <span aria-hidden>·</span>
            <span>{SITE_CONFIG.tagline}</span>
          </div>
          <p>
            © {new Date().getFullYear()} {SITE_CONFIG.name}. Built on Cognee.
          </p>
        </div>
      </footer>
    </div>
  );
}
