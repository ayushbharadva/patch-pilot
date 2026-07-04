import Link from 'next/link';
import { Compass, House } from 'lucide-react';

import { Wordmark } from '@landing/components/layouts/wordmark';
import { buttonVariants } from '@landing/components/ui/button';
import { SITE_CONFIG } from '@landing/config/site';
import { cn } from '@landing/lib/utils';

export default function NotFound() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-neural-grid opacity-30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--glow),transparent)] opacity-40"
      />
      <div className="mb-8">
        <Wordmark />
      </div>
      <p className="font-mono text-sm font-medium tracking-[0.3em] text-primary uppercase">
        Error 404
      </p>
      <h1 className="mt-4 max-w-xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        This memory was never recorded
      </h1>
      <p className="mt-4 max-w-md text-base text-muted-foreground">
        The page you are looking for has drifted out of context. Let&apos;s get
        you back to a trace PatchPilot remembers.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className={cn(buttonVariants({ size: 'lg' }), 'min-h-11 px-5')}
        >
          <House />
          Back home
        </Link>
        <Link
          href={SITE_CONFIG.launchHref}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'min-h-11 px-5',
          )}
        >
          <Compass />
          See how it works
        </Link>
      </div>
    </div>
  );
}
