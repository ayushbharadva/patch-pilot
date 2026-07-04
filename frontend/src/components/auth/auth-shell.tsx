'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { Wordmark } from '@landing/components/layouts/wordmark';
import { buttonVariants } from '@landing/components/ui/button';
import { cn } from '@landing/lib/utils';
import { SignInForm } from '@landing/components/auth/sign-in-form';
import { SignUpForm } from '@landing/components/auth/sign-up-form';

const AuthOrbitScene = dynamic(
  () =>
    import('@landing/components/auth/auth-orbit-scene').then(
      (mod) => mod.AuthOrbitScene,
    ),
  { ssr: false, loading: () => null },
);

const leftPanelContent = {
  'sign-in': {
    badge: 'Welcome back',
    heading: 'Your incidents are still remembering.',
    taglines: [
      'Pick up right where your last diagnosis left off',
      'Recall proven fixes the moment a new bug lands',
      'See which workarounds drifted since your last release',
    ],
  },
  'sign-up': {
    badge: 'Get started',
    heading: 'Give every incident a living memory.',
    taglines: [
      'Ingest tickets, chats, and changelogs in minutes',
      'Diagnose new bugs from prior evidence instantly',
      'Forget stale workarounds automatically after each release',
    ],
  },
} as const;

interface AuthShellProps {
  mode: 'sign-in' | 'sign-up';
}

export function AuthShell({ mode }: AuthShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const isSignIn = mode === 'sign-in';
  const panel = leftPanelContent[mode];

  return (
    <main className="relative grid min-h-svh grid-cols-1 overflow-hidden bg-background lg:grid-cols-2">
      {/* ─── Left panel: 3D scene + transparent taglines ───
          Theme-aware: deep space in dark mode, soft white in light mode
          (matches the landing page's light theme). */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-background p-10 lg:flex xl:p-14">
        {/* 3D orbit scene fills the left panel */}
        {!prefersReducedMotion ? (
          <div className="pointer-events-none absolute inset-0">
            <AuthOrbitScene />
          </div>
        ) : (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(125,211,252,0.15),transparent_50%),radial-gradient(circle_at_60%_70%,rgba(167,139,250,0.12),transparent_50%)]"
          />
        )}

        {/* Gradient overlay for text legibility — adapts to theme.
            Dark mode: deep-space wash. Light mode: soft white wash. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.4)_50%,rgba(255,255,255,0.75))] dark:bg-[linear-gradient(135deg,rgba(5,8,22,0.55),rgba(5,8,22,0.25)_50%,rgba(5,8,22,0.6))]"
        />

        {/* Top: wordmark */}
        <div className="relative z-10">
          <Wordmark href="/" />
        </div>

        {/* Center: taglines */}
        <div className="relative z-10 max-w-md">
          <motion.span
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-md"
          >
            <Sparkles className="size-3.5 text-primary" />
            {panel.badge}
          </motion.span>

          <motion.h1
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 font-heading text-4xl font-bold tracking-tight text-balance text-foreground xl:text-5xl"
          >
            {panel.heading}
          </motion.h1>

          <motion.ul
            initial={prefersReducedMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 space-y-3"
          >
            {panel.taglines.map((tagline) => (
              <li
                key={tagline}
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--glow)]" />
                {tagline}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Bottom: subtle credit */}
        <div className="relative z-10 text-xs text-muted-foreground">
          Built on Cognee
        </div>
      </section>

      {/* ─── Right panel: auth form ─── */}
      <section className="relative flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        {/* Ambient gradient for the right panel */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.06),transparent_50%)]"
        />

        {/* Mobile-only wordmark + back link */}
        <div className="absolute left-4 top-4 z-20 sm:left-6 lg:hidden">
          <Wordmark href="/" />
        </div>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'absolute right-4 top-5 z-20 gap-1.5 text-muted-foreground hover:text-foreground sm:right-6 lg:hidden',
          )}
        >
          <ArrowLeft className="size-3.5" />
          Home
        </Link>

        {/* Desktop back link */}
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'absolute right-6 top-6 z-20 hidden gap-1.5 text-muted-foreground hover:text-foreground lg:flex',
          )}
        >
          <ArrowLeft className="size-3.5" />
          Home
        </Link>

        {/* Auth form */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-sm"
        >
          {/* Heading */}
          <div className="mb-8">
            <motion.h2
              initial={prefersReducedMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="font-heading text-3xl font-bold tracking-tight text-foreground"
            >
              {isSignIn ? 'Welcome back!' : 'Create your account'}
            </motion.h2>
            <motion.p
              initial={prefersReducedMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mt-2 text-sm text-muted-foreground"
            >
              {isSignIn
                ? 'Sign in to access your incident memory.'
                : 'Start remembering every fix.'}
            </motion.p>
          </div>

          {/* Custom auth form (built on Clerk's useSignIn / useSignUp hooks) */}
          {isSignIn ? <SignInForm /> : <SignUpForm />}

          {/* Footer switch link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignIn ? "Don't have an account? " : 'Already have an account? '}
            <Link
              href={isSignIn ? '/sign-up' : '/sign-in'}
              className="font-semibold text-primary transition-colors hover:text-primary/80"
            >
              {isSignIn ? 'Sign up' : 'Sign in'}
            </Link>
          </p>
        </motion.div>
      </section>
    </main>
  );
}
