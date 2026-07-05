'use client';

import { AskRepo } from '@/components/AskRepo';
import { RouteHeader } from '@/components/RouteHeader';

/** Ask route (QA-01): conversational Q&A over incident memory + synced
 * GitHub issues, threaded through one Cognee session per conversation. */
export default function AskPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <RouteHeader
        eyebrow="Recall"
        title="Ask your repo"
        description="Conversational recall over your incident memory and synced GitHub issues — follow-ups remember the conversation."
      />
      <section aria-label="Ask your repo">
        <AskRepo />
      </section>
    </main>
  );
}
