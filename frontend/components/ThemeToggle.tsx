'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const emptySubscribe = () => () => {};

/** Hydration-safe mounted flag (same pattern as the landing's theme-toggle) —
 * next-themes only knows the real theme on the client, so render a disabled
 * placeholder until mounted to avoid an icon flash. */
function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Light/dark switch for /app — flips the same next-themes class the marketing
 * site uses, so both worlds share one theme preference. Ports the animated
 * rotate/scale icon transition from the landing's
 * `src/components/layouts/theme-toggle.tsx` so the toggle feels identical
 * across the public site and the dashboard, while keeping the app's restyled
 * neural-dark `<Button>` primitive.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const mounted = useMounted();

  const isDark = resolvedTheme === 'dark';
  const Icon = isDark ? Moon : Sun;

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Toggle theme"
        disabled
        className={cn(
          'size-9 rounded-full p-0 text-muted-foreground',
          className,
        )}
      >
        <Sun aria-hidden="true" className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn('size-9 rounded-full p-0 text-muted-foreground', className)}
    >
      {shouldReduceMotion ? (
        <Icon aria-hidden="true" className="size-4" />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? 'moon' : 'sun'}
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center justify-center"
          >
            <Icon aria-hidden="true" className="size-4" />
          </motion.span>
        </AnimatePresence>
      )}
    </Button>
  );
}
