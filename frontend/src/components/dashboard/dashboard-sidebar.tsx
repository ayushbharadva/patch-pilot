import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { Wordmark } from '@/components/layouts/wordmark';
import { SITE_CONFIG } from '@/config/site';

export function DashboardSidebar() {
  return (
    <aside className="relative hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      {/* Neural grid texture */}
      <div className="pointer-events-none absolute inset-0 bg-neural-grid opacity-30" />

      <div className="relative flex h-16 items-center border-b border-sidebar-border px-5">
        <Wordmark />
      </div>
      <div className="relative flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
        <DashboardNav idPrefix="sidebar" />
      </div>
      <div className="relative border-t border-sidebar-border px-5 py-4">
        <LifecycleProgress />
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          {SITE_CONFIG.tagline}
        </p>
      </div>
    </aside>
  );
}

function LifecycleProgress() {
  const steps = ['Ingest', 'Recall', 'Graph', 'Drift', 'Forget'];
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div className="size-1.5 rounded-full bg-primary/30" title={step} />
          {i < steps.length - 1 && <div className="h-px w-3 bg-border" />}
        </div>
      ))}
    </div>
  );
}
