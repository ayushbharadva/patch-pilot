import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import { SearchSessionProvider } from "@/lib/search-session";

/**
 * Nested SERVER layout hosting the navigation-surviving search session.
 * Next persists nested layouts across child-page navigation, so mounting
 * `SearchSessionProvider` here (rather than in any individual page) keeps
 * diagnosis state, lifecycle stats, and reinforcement info alive while the
 * user moves between /app, /app/memory, /app/graph, and /app/activity. This
 * layout renders inside the existing `(mvp)` root layout's `Providers`
 * (react-query), so `useQuery`/`useMutation` keep working unchanged.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SearchSessionProvider>
      <AppShell>{children}</AppShell>
    </SearchSessionProvider>
  );
}
