'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { buttonVariants } from '@landing/components/ui/button';
import { cn } from '@landing/lib/utils';

export default function SignUpError({
  error,
  retry,
}: Readonly<{
  error: Error & { digest?: string };
  retry: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-lg rounded-3xl border border-border/60 bg-surface-elevated/80 p-6 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-semibold tracking-[0.24em] text-destructive uppercase">
          Auth failed
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground">
          We could not load the sign-up screen.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Something in the auth flow failed to load. Try again, or head back to
          PatchPilot while we recover the session shell.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={retry}
            className={cn(
              buttonVariants({ size: 'default' }),
              'min-w-32 rounded-full',
            )}
          >
            Retry
          </button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'rounded-full',
            )}
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
