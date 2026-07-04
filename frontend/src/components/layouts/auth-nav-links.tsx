'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

import { buttonVariants } from '@landing/components/ui/button';
import { SITE_CONFIG } from '@landing/config/site';
import { cn } from '@landing/lib/utils';

export function AuthNavLinks() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="h-10 w-24 animate-pulse rounded-lg bg-muted/50" />;
  }

  if (isSignedIn) {
    return (
      <Link
        href={SITE_CONFIG.appHref}
        className={cn(buttonVariants({ size: 'lg' }), 'h-10 px-4')}
      >
        Launch app
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/sign-in"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'lg' }),
          'h-10 px-4',
        )}
      >
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className={cn(buttonVariants({ size: 'lg' }), 'h-10 px-4')}
      >
        Sign up
      </Link>
    </>
  );
}
