'use client';

import { UserProfile } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

import { RouteHeader } from '@/components/RouteHeader';

/**
 * /app/profile — Clerk-managed account page (profile details, connected
 * GitHub/Google accounts, sessions, security). Clerk's dark base theme is
 * applied only when the app resolves dark, so the panel follows the same
 * next-themes toggle as everything else.
 *
 * The Clerk `appearance` variables map to the same primary/border/radius
 * tokens the rest of the app uses, so the Clerk panel reads as a native
 * extension of the dashboard rather than a foreign widget.
 */
export default function ProfilePage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <RouteHeader
        eyebrow="Account"
        title="Profile"
        description="Manage your account, connected GitHub/Google logins, and sessions."
      />
      <div className="flex justify-center">
        <UserProfile
          routing="hash"
          appearance={{
            theme: isDark ? dark : undefined,
            variables: {
              colorPrimary: isDark ? '#22d3ee' : '#4f46e5',
              colorBackground: isDark ? '#232336' : '#ffffff',
              borderRadius: '0.75rem',
              fontFamily: 'Inter, sans-serif',
            },
            elements: {
              rootBox: 'w-full max-w-3xl',
              cardBox:
                'w-full shadow-none bg-card ring-1 ring-foreground/10 rounded-xl',
              headerTitle: 'font-heading font-bold',
              headerSubtitle: 'text-muted-foreground',
              profileSectionTitle: 'font-heading font-semibold',
              navbarButton: 'font-medium transition-colors hover:bg-muted',
              button: 'font-medium transition-colors',
            },
          }}
        />
      </div>
    </main>
  );
}
