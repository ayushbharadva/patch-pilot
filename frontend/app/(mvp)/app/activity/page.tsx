'use client';

import { IncidentTimeline } from '@/components/IncidentTimeline';
import { RouteHeader } from '@/components/RouteHeader';

/** Activity route (STRETCH-03): chronological incident/release timeline. */
export default function ActivityPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <RouteHeader
        eyebrow="Timeline"
        title="Activity"
        description="A chronological view of your incident baseline and every release workaround — see what's stable, aging, or drifting at a glance."
      />
      <section aria-label="Incident timeline">
        <IncidentTimeline />
      </section>
    </main>
  );
}
