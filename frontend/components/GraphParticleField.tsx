'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import * as THREE from 'three';

import { cn } from '@/lib/utils';

/**
 * GraphParticleField — a faint, fixed, pointer-events-none particle field
 * rendered behind the MemoryGraphView card on `/app/graph`. A stripped-down
 * version of the landing's `ScrollScene3D` galaxy particles (no scroll
 * reactivity, no camera fly-through — just slow rotation). Gives the graph
 * route a sense of depth without competing with the interactive force-graph
 * that is the route's centerpiece.
 *
 * Performance: 400 particles (half the landing's 800), DPR capped [1, 1.5],
 * additive blending, depthWrite disabled. Memory cleanup via R3F
 * auto-dispose on unmount.
 * Accessibility: `useReducedMotion()` → renders nothing (the card's own
 * glass surface is the fallback).
 */

const PARTICLE_COUNT = 400;

function generateGalaxy(count: number): {
  positions: Float32Array;
  colors: Float32Array;
} {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Spiral galaxy distribution
    const radius = Math.random() * 18 + 2;
    const branchAngle = (i % 3) * ((Math.PI * 2) / 3);
    const spinAngle = radius * 0.3;
    const randomX = (Math.random() - 0.5) * 0.5;
    const randomY = (Math.random() - 0.5) * 0.5;
    const randomZ = (Math.random() - 0.5) * 0.5;

    positions[i * 3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i * 3 + 1] = randomY * radius * 0.3;
    positions[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

    // Color: inner = cyan, outer = violet
    const mixed = Math.min(radius / 20, 1);
    colors[i * 3] = 0.13 + mixed * 0.5;
    colors[i * 3 + 1] = 0.83 - mixed * 0.6;
    colors[i * 3 + 2] = 0.83 - mixed * 0.05;
  }
  return { positions, colors };
}

function GalaxyParticles({ reduceMotion }: { reduceMotion: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(
    () => generateGalaxy(PARTICLE_COUNT),
    [],
  );

  useFrame((_, delta) => {
    if (reduceMotion || !ref.current) return;
    ref.current.rotation.y += delta * 0.04;
  });

  return (
    <Points
      ref={ref}
      positions={positions}
      colors={colors}
      stride={3}
      frustumCulled={false}
    >
      <PointMaterial
        transparent
        vertexColors
        size={0.08}
        sizeAttenuation
        depthWrite={false}
        opacity={0.5}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export function GraphParticleField({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  // Reduced-motion users get no particle field — the card's glass surface
  // and the global AuroraBackground are the fallback.
  if (reduceMotion) return null;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 14], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <GalaxyParticles reduceMotion={false} />
      </Canvas>
    </div>
  );
}
