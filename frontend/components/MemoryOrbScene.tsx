'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import * as THREE from 'three';

import { cn } from '@/lib/utils';

/**
 * MemoryOrbScene — a lightweight Three.js scene for empty-state
 * illustrations across `/app`. A wireframe icosahedron core (the "memory
 * node") with three orbiting brand-colored spheres — a simplified, smaller
 * version of the landing's `AuthOrbitScene`. Designed to sit inside a
 * glass panel and give "nothing here yet" moments a sense of life.
 *
 * Performance: DPR capped [1, 1.5], single slow rotation, no scroll/mouse
 * reactivity. Memory cleanup via R3F auto-dispose on unmount.
 * Accessibility: `useReducedMotion()` → static CSS gradient orb fallback.
 */

function OrbitGroup({ reduceMotion }: { reduceMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const positions = useMemo<readonly [number, number, number][]>(
    () => [
      [-1.1, 0.3, 0.15],
      [0.8, 0.55, -0.1],
      [1.05, -0.5, 0.4],
    ],
    [],
  );

  useFrame(({ clock }) => {
    if (reduceMotion || !groupRef.current) return;
    const elapsed = clock.getElapsedTime();
    groupRef.current.rotation.y = elapsed * 0.14;
    groupRef.current.rotation.x = Math.sin(elapsed * 0.2) * 0.04;
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.1} rotationIntensity={0.55} floatIntensity={0.6}>
        <mesh>
          <icosahedronGeometry args={[0.95, 1]} />
          <meshStandardMaterial
            color="#8ddcff"
            emissive="#1d4ed8"
            emissiveIntensity={0.45}
            roughness={0.26}
            metalness={0.55}
            wireframe
          />
        </mesh>
      </Float>
      {positions.map((position, index) => (
        <Float
          key={index}
          speed={1 + index * 0.18}
          rotationIntensity={0.45}
          floatIntensity={0.75}
        >
          <mesh position={position}>
            <sphereGeometry args={[0.18 + index * 0.03, 32, 32]} />
            <meshStandardMaterial
              color={index === 1 ? '#a78bfa' : '#22d3ee'}
              emissive={index === 1 ? '#6d28d9' : '#0f766e'}
              emissiveIntensity={0.55}
              roughness={0.2}
              metalness={0.65}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function MemoryOrbCanvas() {
  const reduceMotion = useReducedMotion();

  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 40 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={1.6} />
      <directionalLight position={[2, 2, 4]} intensity={2.5} color="#9ee7ff" />
      <directionalLight
        position={[-2, -1, 2]}
        intensity={1.3}
        color="#b17cff"
      />
      <OrbitGroup reduceMotion={Boolean(reduceMotion)} />
    </Canvas>
  );
}

/** Static fallback for reduced-motion users. */
function StaticOrb() {
  return (
    <div
      aria-hidden="true"
      className="size-full rounded-full opacity-70"
      style={{
        background:
          'radial-gradient(circle at 35% 30%, #8ddcff 0%, #1d4ed8 50%, #6d28d9 100%)',
        boxShadow:
          '0 0 48px -8px color-mix(in oklch, var(--accent-violet) 60%, transparent)',
      }}
    />
  );
}

export function MemoryOrbScene({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'pointer-events-none flex items-center justify-center',
        className,
      )}
      aria-hidden="true"
    >
      {reduceMotion ? <StaticOrb /> : <MemoryOrbCanvas />}
    </div>
  );
}
