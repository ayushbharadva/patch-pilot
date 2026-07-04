"use client";

import { IncidentTimeline } from "@/components/IncidentTimeline";

/** Activity route (STRETCH-03): chronological incident/release timeline. */
export default function ActivityPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">
      <section aria-label="Incident timeline" className="animate-rise-in">
        <IncidentTimeline />
      </section>
    </main>
  );
}
