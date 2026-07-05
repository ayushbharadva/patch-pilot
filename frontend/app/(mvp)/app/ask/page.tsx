"use client";

import { AskRepo } from "@/components/AskRepo";

/** Ask route (QA-01): conversational Q&A over incident memory + synced
 * GitHub issues, threaded through one Cognee session per conversation. */
export default function AskPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-10">
      <section aria-label="Ask your repo" className="animate-rise-in">
        <AskRepo />
      </section>
    </main>
  );
}
