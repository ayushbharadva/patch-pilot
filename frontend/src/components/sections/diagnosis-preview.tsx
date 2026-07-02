import { FileText, Lightbulb } from 'lucide-react';

import { Reveal } from '@/components/shared/reveal';

interface PriorIncident {
  id: string;
  summary: string;
}

const PRIOR_INCIDENTS: readonly PriorIncident[] = [
  {
    id: 'AUTH-207',
    summary:
      'Clock-skew logout storm — access tokens rejected minutes after issue during a leap-second sync.',
  },
  {
    id: 'AUTH-318',
    summary:
      'Refresh loop after the SSO migration left two token issuers signing with different TTLs.',
  },
  {
    id: 'CHG-92',
    summary:
      'Release 1.8 lowered token TTL to 5 minutes without extending the refresh grace window.',
  },
];

export function DiagnosisPreview() {
  return (
    <section className="relative z-10 bg-background mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <Reveal>
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            A diagnosis, beside its evidence
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Every recommendation shows the prior incidents it was reconstructed
            from, so engineers trust the answer instead of guessing.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-12 grid gap-6 rounded-2xl border border-border/60 bg-surface-elevated/60 p-6 lg:grid-cols-5 lg:p-8">
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 text-primary">
              <Lightbulb className="size-5" />
              <span className="text-xs font-semibold tracking-wide uppercase">
                Recommended fix · 94% confidence
              </span>
            </div>
            <h3 className="mt-3 font-heading text-xl font-semibold">
              Widen the refresh grace window and pin one token issuer
            </h3>
            <p className="mt-3 text-muted-foreground text-pretty">
              Re-issue access tokens through a single signer and add a 60-second
              overlap so a rotated refresh token is never validated against a
              stale expiry. This resolved AUTH-207 and AUTH-318 without a
              client-side retry hack.
            </p>
          </div>

          <div className="lg:col-span-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4 text-muted-foreground" />
              Reconstructed from
            </p>
            <ul className="mt-3 space-y-3">
              {PRIOR_INCIDENTS.map((incident) => (
                <li
                  key={incident.id}
                  className="rounded-xl border border-border/50 bg-background/40 p-3"
                >
                  <p className="font-mono text-xs font-semibold text-primary">
                    {incident.id}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">
                    {incident.summary}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
