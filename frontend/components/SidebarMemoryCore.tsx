'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import * as THREE from 'three';

import { cn } from '@/lib/utils';

/**
 * SidebarMemoryCore — a tiny, performant Three.js accent mounted at the top
 * of the `/app` sidebar. Reuses the per-face brand-gradient octahedron
 * pattern from `src/components/three/logo-crystal-3d.tsx` (the landing's
 * 3D logo) so the dashboard reads as a seamless extension of the marketing
 * site, but sized for the sidebar rail and capped at DPR [1, 1.5] with a
 * slow rotation only (no scroll/mouse reactivity) to stay GPU-light on
 * every `/app` route.
 *
 * Memory cleanup: R3F auto-disposes geometries/materials on unmount; the
 * memoized geometry/edges live for the component's lifetime and are
 * released when the canvas unmounts. No manual `dispose()` calls needed.
 */
function CrystalMesh({ reduceMotion }: { reduceMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  // One non-indexed octahedron, coloured per-face by hemisphere + side so the
  // facets read as the brand gradient (top = cyan/teal, bottom = indigo/violet).
  // Identical construction to logo-crystal-3d.tsx so the gem matches the
  // landing/auth wordmark crystal exactly.
  const geometry = useMemo(() => {
    const geo = new THREE.OctahedronGeometry(1, 0).toNonIndexed();
    const pos = geo.getAttribute('position');

    const topRight = new THREE.Color('#5eead4'); // teal
    const topLeft = new THREE.Color('#38bdf8'); // sky/cyan
    const bottomRight = new THREE.Color('#8b5cf6'); // violet
    const bottomLeft = new THREE.Color('#6366f1'); // indigo

    const colors: number[] = [];
    for (let i = 0; i < pos.count; i += 3) {
      const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const c =
        cy >= 0
          ? cx >= 0
            ? topRight
            : topLeft
          : cx >= 0
            ? bottomRight
            : bottomLeft;
      for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  useFrame((_, delta) => {
    if (reduceMotion || !groupRef.current) return;
    // Slow, hypnotic rotation — the only animation. No scroll/mouse input
    // keeps the sidebar canvas idle when the user is focused on content.
    groupRef.current.rotation.y += delta * 0.45;
  });

  return (
    <group ref={groupRef} rotation={[0.34, 0.62, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          flatShading
          metalness={0.55}
          roughness={0.22}
          emissive="#4338ca"
          emissiveIntensity={0.22}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#e0fbff" transparent opacity={0.85} />
      </lineSegments>
    </group>
  );
}

function SidebarMemoryCoreCanvas() {
  const reduceMotion = useReducedMotion();

  return (
    <Canvas
      // Pulled back so the gem never clips the panel corners as it spins.
      camera={{ position: [0, 0, 4.2], fov: 40 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[2, 3, 4]} intensity={2.2} color="#a5f3fc" />
      <directionalLight
        position={[-3, -2, 1]}
        intensity={1.4}
        color="#c4b5fd"
      />
      <CrystalMesh reduceMotion={Boolean(reduceMotion)} />
    </Canvas>
  );
}

/**
 * Static fallback for reduced-motion users — a CSS-only gradient orb that
 * echoes the crystal's brand ramp without any WebGL. Mirrors the fallback
 * pattern in `src/components/layouts/logo-crystal.tsx`.
 */
function StaticOrb() {
  return (
    <div
      aria-hidden="true"
      className="size-full rounded-full opacity-80"
      style={{
        background:
          'radial-gradient(circle at 35% 30%, #5eead4 0%, #38bdf8 30%, #6366f1 65%, #4338ca 100%)',
        boxShadow:
          '0 0 36px -6px color-mix(in oklch, var(--accent-violet) 60%, transparent)',
      }}
    />
  );
}

export function SidebarMemoryCore({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'bg-card ring-1 ring-foreground/10 relative flex items-center justify-center overflow-hidden rounded-2xl',
        className,
      )}
      aria-hidden="true"
    >
      {reduceMotion ? <StaticOrb /> : <SidebarMemoryCoreCanvas />}
    </div>
  );
}
