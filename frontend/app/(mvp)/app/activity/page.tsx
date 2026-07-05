'use client';

import { IncidentTimeline } from '@/components/IncidentTimeline';
import { OpsFeed } from '@/components/OpsFeed';
import { RouteHeader } from '@/components/RouteHeader';

/** Activity route (STRETCH-03 + OPS-01): live memory-operations feed with
 * analytics tiles, then the chronological incident/release timeline. */
export default function ActivityPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <RouteHeader
        eyebrow="Timeline"
        title="Activity"
        description="Watch every remember, recall, improve, and forget as it happens, then trace the chronological incident baseline and release history below — see what's stable, aging, or drifting at a glance."
      />
      <section aria-label="Live memory operations">
        <OpsFeed />
      </section>
      <section aria-label="Incident timeline">
        <IncidentTimeline />
      </section>
    </main>
  );
}
