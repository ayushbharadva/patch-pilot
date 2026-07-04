"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

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

/** Light/dark switch for /app — flips the same next-themes class the
 * marketing site uses, so both worlds share one theme preference. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = resolvedTheme === "dark";
  const Icon = !mounted || isDark ? Moon : Sun;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Toggle theme"
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`size-9 rounded-full p-0 text-muted-foreground ${className ?? ""}`}
    >
      <Icon aria-hidden="true" className="size-4" />
    </Button>
  );
}
