'use client';

import { Float } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function OrbitGroup() {
  const groupRef = useRef<THREE.Group>(null);
  const positions = useMemo(
    () => [
      [-1.1, 0.3, 0.15],
      [0.8, 0.55, -0.1],
      [1.05, -0.5, 0.4],
    ],
    [],
  );

  useFrame(({ clock, mouse }) => {
    if (!groupRef.current) return;
    const elapsed = clock.getElapsedTime();
    groupRef.current.rotation.y = elapsed * 0.14 + mouse.x * 0.12;
    groupRef.current.rotation.x =
      Math.sin(elapsed * 0.2) * 0.04 + mouse.y * 0.08;
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.1} rotationIntensity={0.55} floatIntensity={0.6}>
        <mesh position={[0, 0, 0]}>
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
          <mesh position={position as [number, number, number]}>
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

export function AuthOrbitScene() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        className="opacity-75"
      >
        {/* Transparent canvas — panel background comes from the parent section,
            which is theme-aware (dark in dark mode, white in light mode). */}
        <ambientLight intensity={1.6} />
        <directionalLight
          position={[2, 2, 4]}
          intensity={2.5}
          color="#9ee7ff"
        />
        <directionalLight
          position={[-2, -1, 2]}
          intensity={1.3}
          color="#b17cff"
        />
        <OrbitGroup />
      </Canvas>
      {/* Theme-aware gradient overlay for text legibility.
          Dark mode keeps the deep-space feel; light mode uses a soft white wash. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(5,8,22,0.4),transparent_40%,rgba(5,8,22,0.55))] dark:bg-[linear-gradient(135deg,rgba(5,8,22,0.4),transparent_40%,rgba(5,8,22,0.55))]" />
    </div>
  );
}
