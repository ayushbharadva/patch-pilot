'use client';

import dynamic from 'next/dynamic';
import { useReducedMotion } from 'motion/react';

/**
 * AppOrbitBackground — a fixed, pointer-events-none 3D background layer
 * mounted once in the `(mvp)` layout so it persists across all `/app/*`
 * routes. Reuses the exact same `AuthOrbitScene` (wireframe icosahedron +
 * orbiting brand-colored spheres) from the signin/signup pages, so the
 * dashboard reads as a seamless extension of the auth experience.
 *
 * Sits behind all content (negative z-index, like AuroraBackground) and
 * above the AuroraBackground's aurora blobs. Dynamic-imported with
 * `ssr: false` so Three.js stays out of the initial bundle and doesn't
 * touch `window`/WebGL during SSR. Reduced-motion users get a static
 * CSS gradient fallback.
 */

const AuthOrbitScene = dynamic(
  () =>
    import('@landing/components/auth/auth-orbit-scene').then(
      (m) => m.AuthOrbitScene,
    ),
  { ssr: false, loading: () => null },
);

/** Static fallback for reduced-motion users — a soft radial gradient orb. */
function StaticOrbFallback() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 30% 40%, color-mix(in oklch, var(--accent-cyan) 12%, transparent) 0%, transparent 50%), radial-gradient(circle at 70% 60%, color-mix(in oklch, var(--accent-violet) 10%, transparent) 0%, transparent 50%)',
      }}
    />
  );
}

export function AppOrbitBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Dim the orbit scene so it reads as atmosphere, not a distraction
          from the dashboard content. */}
      <div className="absolute inset-0 opacity-40">
        {reduceMotion ? <StaticOrbFallback /> : <AuthOrbitScene />}
      </div>
    </div>
  );
}
