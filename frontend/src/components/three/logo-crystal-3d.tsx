"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "motion/react";

import { cn } from "@landing/lib/utils";


function CrystalMesh({ reduceMotion }: { reduceMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  // One non-indexed octahedron, coloured per-face by hemisphere + side so the
  // facets read as the brand gradient (top = cyan/teal, bottom = indigo/violet).
  const geometry = useMemo(() => {
    const geo = new THREE.OctahedronGeometry(1, 0).toNonIndexed();
    const pos = geo.getAttribute("position");

    const topRight = new THREE.Color("#5eead4"); // teal
    const topLeft = new THREE.Color("#38bdf8"); // sky/cyan
    const bottomRight = new THREE.Color("#8b5cf6"); // violet
    const bottomLeft = new THREE.Color("#6366f1"); // indigo

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
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  useFrame((_, delta) => {
    if (reduceMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.5;
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

export function LogoCrystal3D({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("pointer-events-none", className)} aria-hidden="true">
      <Canvas
        // Pulled back so the gem never clips its container corners as it
        // spins (widest silhouette ≈ √2 · radius).
        camera={{ position: [0, 0, 4.2], fov: 40 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
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
    </div>
  );
}
