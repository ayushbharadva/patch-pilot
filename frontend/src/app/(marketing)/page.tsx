import { Hero } from '@/components/sections/hero-3d';
import { HowItWorks } from '@/components/sections/how-it-works';
import { LifecycleDemo } from '@/components/sections/lifecycle-demo';
import { DiagnosisPreview } from '@/components/sections/diagnosis-preview';
import { DriftPreview } from '@/components/sections/drift-preview';
import { FinalCta } from '@/components/sections/final-cta';
import { ActivityFeed } from '@/components/shared/activity-feed';
import { SourceMarquee } from '@/components/shared/source-marquee';
import { Reveal } from '@/components/shared/reveal';

export default function LandingPage() {
  return (
    <div className="relative overflow-x-hidden bg-background">
      {/* Full-screen 3D scroll-driven hero */}
      <Hero />

      {/* Data source marquee — continuous ingestion feel */}
      <section className="relative z-10 border-y border-border/40 bg-surface-sunken py-6">
        <div className="mx-auto max-w-7xl px-4">
          <p className="mb-4 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Ingests from your existing stack
          </p>
          <SourceMarquee />
        </div>
      </section>

      {/* Automated lifecycle demo — SVG-animated product showcase */}
      <section className="relative z-10 bg-background mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Watch it work
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              The full lifecycle, playing live
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              Ingest, recall, drift, forget, re-search — the entire PatchPilot
              loop runs automatically. Watch the confidence flip when the stale
              workaround is pruned.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mx-auto mt-12 max-w-4xl">
            <LifecycleDemo />
          </div>
        </Reveal>
      </section>

      <HowItWorks />

      {/* Live activity feed — always-running system feel */}
      <section className="relative z-10 bg-background mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                Live system
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Memory operations, streaming in real time
              </h2>
              <p className="mt-4 text-lg text-muted-foreground text-pretty">
                Every ingest, recall, drift check, and forget flows through the
                memory layer continuously. This is what your AI&apos;s memory
                looks like when it never sleeps.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-surface-elevated p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  activity.log
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[0.65rem] text-drift-stable">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-drift-stable opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-drift-stable" />
                  </span>
                  STREAMING
                </span>
              </div>
              <ActivityFeed />
            </div>
          </div>
        </Reveal>
      </section>

      <DiagnosisPreview />
      <DriftPreview />
      <FinalCta />
    </div>
  );
}
