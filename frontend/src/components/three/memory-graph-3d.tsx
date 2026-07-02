"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useReducedMotion } from "motion/react";

/**
 * 3D Memory Graph Scene — the "wow" visual for the landing hero.
 * Renders a rotating icosahedron wireframe (the "memory core") surrounded by
 * orbiting particle clouds and floating node spheres connected by lines.
 * The whole scene slowly auto-rotates, creating an immersive, living feel.
 *
 * Uses React Three Fiber + Drei for declarative 3D in React.
 * Performance: capped DPR, frameloop="always" but lightweight geometry.
 * Accessibility: respects prefers-reduced-motion (static, no rotation).
 */

const NODE_COUNT = 60;

function generateSpherePoints(count: number, radius: number): Float32Array {
	const arr = new Float32Array(count * 3);
	for (let i = 0; i < count; i++) {
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(2 * Math.random() - 1);
		const r = radius * (0.8 + Math.random() * 0.4);
		arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
		arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
		arr[i * 3 + 2] = r * Math.cos(phi);
	}
	return arr;
}

function MemoryCore({ reduceMotion }: { reduceMotion: boolean }) {
	const meshRef = useRef<THREE.Mesh>(null);
	const wireRef = useRef<THREE.Mesh>(null);

	useFrame((_, delta) => {
		if (reduceMotion) return;
		if (meshRef.current) {
			meshRef.current.rotation.y += delta * 0.15;
			meshRef.current.rotation.x += delta * 0.05;
		}
		if (wireRef.current) {
			wireRef.current.rotation.y -= delta * 0.1;
			wireRef.current.rotation.z += delta * 0.03;
		}
	});

	return (
		<group>
			{/* Inner solid core */}
			<mesh ref={meshRef}>
				<icosahedronGeometry args={[1.2, 1]} />
				<meshStandardMaterial
					color="#22d3ee"
					emissive="#0891b2"
					emissiveIntensity={0.4}
					transparent
					opacity={0.15}
					roughness={0.3}
					metalness={0.8}
				/>
			</mesh>
			{/* Wireframe overlay */}
			<mesh ref={wireRef} scale={1.02}>
				<icosahedronGeometry args={[1.2, 1]} />
				<meshBasicMaterial
					color="#22d3ee"
					wireframe
					transparent
					opacity={0.3}
				/>
			</mesh>
		</group>
	);
}

interface OrbitNode {
	position: [number, number, number];
	size: number;
	color: string;
}

function generateOrbitingNodes(): OrbitNode[] {
	return Array.from({ length: 8 }, (_, i) => {
		const angle = (i / 8) * Math.PI * 2;
		const radius = 2.5 + Math.random() * 0.8;
		const yOffset = (Math.random() - 0.5) * 1.5;
		return {
			position: [
				Math.cos(angle) * radius,
				yOffset,
				Math.sin(angle) * radius,
			] as [number, number, number],
			size: 0.06 + Math.random() * 0.08,
			color: i % 3 === 0 ? "#a78bfa" : i % 3 === 1 ? "#22d3ee" : "#34d399",
		};
	});
}

function OrbitingNodes({ reduceMotion }: { reduceMotion: boolean }) {
	const groupRef = useRef<THREE.Group>(null);

	const nodes = useMemo(() => generateOrbitingNodes(), []);

	useFrame((_, delta) => {
		if (reduceMotion) return;
		if (groupRef.current) {
			groupRef.current.rotation.y += delta * 0.08;
		}
	});

	return (
		<group ref={groupRef}>
			{nodes.map((node, i) => (
				<group key={i} position={node.position}>
					<Float
						speed={reduceMotion ? 0 : 2}
						rotationIntensity={reduceMotion ? 0 : 0.5}
						floatIntensity={reduceMotion ? 0 : 0.5}
					>
						<mesh>
							<sphereGeometry args={[node.size, 16, 16]} />
							<meshStandardMaterial
								color={node.color}
								emissive={node.color}
								emissiveIntensity={0.6}
								roughness={0.2}
								metalness={0.5}
							/>
						</mesh>
						{/* Glow halo */}
						<mesh scale={2.5}>
							<sphereGeometry args={[node.size, 8, 8]} />
							<meshBasicMaterial
								color={node.color}
								transparent
								opacity={0.08}
							/>
						</mesh>
					</Float>
				</group>
			))}
		</group>
	);
}

function ParticleCloud({ reduceMotion }: { reduceMotion: boolean }) {
	const ref = useRef<THREE.Points>(null);
	const positions = useMemo(() => generateSpherePoints(NODE_COUNT, 3.5), []);

	useFrame((_, delta) => {
		if (reduceMotion) return;
		if (ref.current) {
			ref.current.rotation.y += delta * 0.03;
			ref.current.rotation.x += delta * 0.01;
		}
	});

	return (
		<Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
			<PointMaterial
				transparent
				color="#22d3ee"
				size={0.03}
				sizeAttenuation
				depthWrite={false}
				opacity={0.6}
			/>
		</Points>
	);
}

export interface MemoryGraph3DProps {
	className?: string;
}

export function MemoryGraph3D({ className }: MemoryGraph3DProps) {
	const prefersReducedMotion = useReducedMotion();

	return (
		<div className={className} aria-hidden="true">
			<Canvas
				camera={{ position: [0, 0, 6], fov: 50 }}
				dpr={[1, 1.5]}
				gl={{ antialias: true, alpha: true }}
				style={{ background: "transparent" }}
			>
				<ambientLight intensity={0.4} />
				<pointLight position={[5, 5, 5]} intensity={0.8} color="#22d3ee" />
				<pointLight position={[-5, -3, 2]} intensity={0.5} color="#a78bfa" />
				<pointLight position={[0, 0, -5]} intensity={0.3} color="#34d399" />

				<MemoryCore reduceMotion={Boolean(prefersReducedMotion)} />
				<OrbitingNodes reduceMotion={Boolean(prefersReducedMotion)} />
				<ParticleCloud reduceMotion={Boolean(prefersReducedMotion)} />
			</Canvas>
		</div>
	);
}
