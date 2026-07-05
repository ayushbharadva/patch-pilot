"use client";

import { IncidentTimeline } from "@/components/IncidentTimeline";
import { OpsFeed } from "@/components/OpsFeed";

/** Activity route (STRETCH-03 + OPS-01): live memory-operations feed with
 * analytics tiles, then the chronological incident/release timeline. */
export default function ActivityPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-10">
      <section aria-label="Live memory operations" className="animate-rise-in">
        <OpsFeed />
      </section>
      <section aria-label="Incident timeline" className="animate-rise-in">
        <IncidentTimeline />
      </section>
    </main>
  );
}
