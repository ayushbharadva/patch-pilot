"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DatasetList } from "@/components/DatasetList";
import { HealthDashboard } from "@/components/HealthDashboard";
import { UploadPanel } from "@/components/UploadPanel";
import { useSearchSession } from "@/lib/search-session";

/**
 * Memory route: upload/ingest controls, the dataset list (with the
 * per-dataset Forget action), and the memory-health rollup. Forgetting a
 * drifting dataset records the "forget" lifecycle event, re-runs the last
 * search via the navigation-surviving session, then surfaces a
 * "View diagnosis" action-toast so the flipped diagnosis is one click away
 * back on /app — a toast-with-action over an auto-navigate so it doesn't
 * yank the presenter mid-narration. ForgetButton's own immediate "Forgotten
 * — updating results…" toast (DatasetList.tsx) stays as-is; this is the
 * second, action-bearing toast that fires once the re-search resolves.
 */
export default function MemoryPage() {
  const session = useSearchSession();
  const router = useRouter();

  async function handleForgotten() {
    session.recordLifecycleEvent("forget");
    if (!session.lastQuery) return;
    await session.reSearch("forget");
    toast.success("Diagnosis updated with current memory", {
      action: {
        label: "View diagnosis",
        onClick: () => router.push("/app"),
      },
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-10">
      <section aria-label="Upload incident memory" className="animate-rise-in">
        <UploadPanel />
      </section>

      <section aria-label="Datasets" className="animate-rise-in">
        <DatasetList onForgotten={() => void handleForgotten()} />
      </section>

      <section aria-label="Memory health" className="animate-rise-in">
        <HealthDashboard />
      </section>
    </main>
  );
}
