/**
 * AuroraBackground — the global "living incident brain" atmosphere
 * (260703-vga neural-dark redesign).
 *
 * A fixed, pointer-events-none, behind-everything layer (negative z-index)
 * mounted once in app/layout.tsx. Do NOT mount it again in a page/component.
 *
 * Three drifting aurora/nebula blobs (indigo / violet / cyan) plus a faint
 * drifting constellation field (an SVG of dim nodes + links echoing the
 * knowledge graph) over a deep radial vignette. Pure CSS/SVG — no deps, no
 * canvas, GPU-light (transform/opacity only). All motion is disabled under
 * prefers-reduced-motion via the .animate-* utilities in globals.css, which
 * degrade to a static gradient.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      {/* Deep radial vignette base — pulls the eye toward center content. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -10%, color-mix(in oklch, var(--accent-violet) 16%, transparent) 0%, transparent 55%), radial-gradient(90% 70% at 100% 100%, color-mix(in oklch, var(--accent-cyan) 12%, transparent) 0%, transparent 50%), radial-gradient(90% 80% at 0% 100%, color-mix(in oklch, var(--accent-indigo) 14%, transparent) 0%, transparent 55%)",
        }}
      />

      {/* Aurora blobs — large, heavily blurred, slowly drifting. */}
      <div
        className="animate-aurora absolute -top-40 -left-32 size-[42rem] rounded-full opacity-60 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, color-mix(in oklch, var(--accent-indigo) 70%, transparent), transparent 70%)",
        }}
      />
      <div
        className="animate-aurora absolute top-1/4 -right-40 size-[38rem] rounded-full opacity-50 blur-[130px]"
        style={{
          animationDelay: "-7s",
          background:
            "radial-gradient(circle at 60% 40%, color-mix(in oklch, var(--accent-violet) 65%, transparent), transparent 70%)",
        }}
      />
      <div
        className="animate-aurora absolute -bottom-48 left-1/3 size-[40rem] rounded-full opacity-40 blur-[140px]"
        style={{
          animationDelay: "-14s",
          background:
            "radial-gradient(circle at 50% 50%, color-mix(in oklch, var(--accent-cyan) 55%, transparent), transparent 70%)",
        }}
      />

      {/* Constellation field — dim nodes + links echoing the memory graph. */}
      <svg
        className="absolute inset-0 size-full opacity-[0.35]"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
        fill="none"
      >
        <g stroke="color-mix(in oklch, var(--accent-indigo) 55%, transparent)" strokeWidth="0.6">
          <line x1="140" y1="120" x2="320" y2="230" />
          <line x1="320" y1="230" x2="230" y2="430" />
          <line x1="320" y1="230" x2="540" y2="180" />
          <line x1="540" y1="180" x2="760" y2="300" />
          <line x1="760" y1="300" x2="980" y2="220" />
          <line x1="760" y1="300" x2="700" y2="540" />
          <line x1="230" y1="430" x2="470" y2="600" />
          <line x1="470" y1="600" x2="700" y2="540" />
          <line x1="980" y1="220" x2="1060" y2="440" />
          <line x1="700" y1="540" x2="900" y2="660" />
        </g>
        <g className="animate-float" fill="color-mix(in oklch, var(--foreground) 70%, transparent)">
          <circle cx="140" cy="120" r="2.5" />
          <circle cx="320" cy="230" r="3" />
          <circle cx="540" cy="180" r="2" />
          <circle cx="760" cy="300" r="3.5" />
          <circle cx="980" cy="220" r="2.5" />
          <circle cx="230" cy="430" r="2" />
          <circle cx="470" cy="600" r="3" />
          <circle cx="700" cy="540" r="2.5" />
          <circle cx="1060" cy="440" r="2" />
          <circle cx="900" cy="660" r="2.5" />
        </g>
        {/* A few brighter accent nodes. */}
        <g fill="color-mix(in oklch, var(--accent-cyan) 85%, transparent)">
          <circle cx="320" cy="230" r="1.4" />
          <circle cx="760" cy="300" r="1.6" />
          <circle cx="470" cy="600" r="1.4" />
        </g>
      </svg>

      {/* Fine grain to kill gradient banding on large dark fills. */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
