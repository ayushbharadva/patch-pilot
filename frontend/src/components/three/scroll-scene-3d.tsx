"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Float } from "@react-three/drei";
import * as THREE from "three";
import { useReducedMotion } from "motion/react";

/**
 * Scroll-Driven 3D Landing Scene
 *
 * A fixed full-viewport WebGL canvas that responds to scroll depth:
 * - Camera flies through a particle field (z-position tied to scroll)
 * - Particle colors shift from cyan → violet → green as you scroll
 * - A central icosahedron core scales and rotates based on scroll
 * - Orbiting node spheres speed up / slow down with scroll velocity
 * - Mouse movement subtly rotates the entire scene (parallax)
 *
 * Performance: DPR capped [1,1.5], instanced particles, no textures.
 * Accessibility: prefers-reduced-motion → static scene, no scroll reactivity.
 */

// ─── Particle generation ───────────────────────────────────────────────────

const PARTICLE_COUNT = 800;

function generateGalaxy(count: number): Float32Array {
	const arr = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);
	for (let i = 0; i < count; i++) {
		// Spiral galaxy distribution
		const radius = Math.random() * 18 + 2;
		const branchAngle = (i % 3) * ((Math.PI * 2) / 3);
		const spinAngle = radius * 0.3;
		const randomX = (Math.random() - 0.5) * 0.5;
		const randomY = (Math.random() - 0.5) * 0.5;
		const randomZ = (Math.random() - 0.5) * 0.5;

		arr[i * 3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
		arr[i * 3 + 1] = randomY * radius * 0.3;
		arr[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

		// Color: inner = cyan, outer = violet
		const mixed = radius / 20;
		colors[i * 3] = 0.13 + mixed * 0.4; // R
		colors[i * 3 + 1] = 0.83 - mixed * 0.5; // G
		colors[i * 3 + 2] = 0.83 - mixed * 0.1; // B
	}
	return arr;
}

function generateColors(count: number): Float32Array {
	const colors = new Float32Array(count * 3);
	for (let i = 0; i < count; i++) {
		const radius = Math.random() * 18 + 2;
		const mixed = Math.min(radius / 20, 1);
		colors[i * 3] = 0.13 + mixed * 0.5;
		colors[i * 3 + 1] = 0.83 - mixed * 0.6;
		colors[i * 3 + 2] = 0.83 - mixed * 0.05;
	}
	return colors;
}

// ─── Scroll hook (throttled via rAF) ───────────────────────────────────────

function useScrollProgress() {
	const [progress, setProgress] = useState(0);
	const [velocity, setVelocity] = useState(0);
	const lastScrollY = useRef(0);
	const rafId = useRef(0);

	useEffect(() => {
		const handleScroll = () => {
			cancelAnimationFrame(rafId.current);
			rafId.current = requestAnimationFrame(() => {
				const scrollY = window.scrollY;
				const maxScroll =
					document.documentElement.scrollHeight - window.innerHeight;
				const p = maxScroll > 0 ? scrollY / maxScroll : 0;
				const v = scrollY - lastScrollY.current;
				lastScrollY.current = scrollY;
				setProgress(p);
				setVelocity(v);
			});
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", handleScroll);
			cancelAnimationFrame(rafId.current);
		};
	}, []);

	return { progress, velocity };
}

// ─── Mouse hook ────────────────────────────────────────────────────────────

function useMouse() {
	const mouse = useRef({ x: 0, y: 0 });
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			mouse.current = {
				x: (e.clientX / window.innerWidth) * 2 - 1,
				y: -(e.clientY / window.innerHeight) * 2 + 1,
			};
		};
		window.addEventListener("mousemove", handler, { passive: true });
		return () => window.removeEventListener("mousemove", handler);
	}, []);
	return mouse;
}

// ─── Scene components ──────────────────────────────────────────────────────

interface SceneProps {
	scrollProgress: number;
	scrollVelocity: number;
	mouse: React.RefObject<{ x: number; y: number }>;
	reduceMotion: boolean;
}

function ScrollCamera({ scrollProgress, mouse, reduceMotion }: SceneProps) {
	const targetZ = useRef(0);
	const targetX = useRef(0);
	const targetY = useRef(0);

	useFrame((state) => {
		if (reduceMotion) return;

		const { camera } = state;

		// Camera flies forward through the galaxy as you scroll
		targetZ.current = 8 - scrollProgress * 22; // 8 → -14
		targetX.current = mouse.current.x * 2 + scrollProgress * 3;
		targetY.current = mouse.current.y * 1.5 - scrollProgress * 2;

		camera.position.x += (targetX.current - camera.position.x) * 0.05;
		camera.position.y += (targetY.current - camera.position.y) * 0.05;
		camera.position.z += (targetZ.current - camera.position.z) * 0.08;
		camera.lookAt(0, 0, -5);
	});

	return null;
}

function GalaxyParticles({ scrollProgress, reduceMotion }: SceneProps) {
	const ref = useRef<THREE.Points>(null);
	const positions = useMemo(() => generateGalaxy(PARTICLE_COUNT), []);
	const colors = useMemo(() => generateColors(PARTICLE_COUNT), []);

	useFrame((_, delta) => {
		if (reduceMotion || !ref.current) return;
		// Rotate based on scroll — faster as you go deeper
		ref.current.rotation.y += delta * (0.02 + scrollProgress * 0.15);
		ref.current.rotation.x = scrollProgress * 0.3;
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
				opacity={0.8}
				blending={THREE.AdditiveBlending}
			/>
		</Points>
	);
}

function MemoryCore({
	scrollProgress,
	scrollVelocity,
	reduceMotion,
}: SceneProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const wireRef = useRef<THREE.Mesh>(null);

	useFrame((_, delta) => {
		if (reduceMotion) return;
		if (meshRef.current) {
			meshRef.current.rotation.y +=
				delta * (0.2 + Math.abs(scrollVelocity) * 0.01);
			meshRef.current.rotation.x += delta * 0.08;
			// Scale pulses with scroll
			const scale =
				1 + scrollProgress * 0.5 + Math.sin(Date.now() * 0.001) * 0.05;
			meshRef.current.scale.setScalar(scale);
		}
		if (wireRef.current) {
			wireRef.current.rotation.y -= delta * 0.15;
			wireRef.current.rotation.z += delta * 0.04;
			wireRef.current.scale.setScalar(1 + scrollProgress * 0.5);
		}
	});

	return (
		<group position={[0, 0, -5]}>
			<mesh ref={meshRef}>
				<icosahedronGeometry args={[1.5, 1]} />
				<meshStandardMaterial
					color="#22d3ee"
					emissive="#0891b2"
					emissiveIntensity={0.5}
					transparent
					opacity={0.12}
					roughness={0.2}
					metalness={0.9}
				/>
			</mesh>
			<mesh ref={wireRef} scale={1.03}>
				<icosahedronGeometry args={[1.5, 1]} />
				<meshBasicMaterial
					color="#22d3ee"
					wireframe
					transparent
					opacity={0.25}
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
	return Array.from({ length: 12 }, (_, i) => {
		const angle = (i / 12) * Math.PI * 2;
		const radius = 3 + Math.random() * 1.5;
		const yOffset = (Math.random() - 0.5) * 2;
		return {
			position: [
				Math.cos(angle) * radius,
				yOffset,
				Math.sin(angle) * radius - 5,
			] as [number, number, number],
			size: 0.05 + Math.random() * 0.08,
			color: i % 3 === 0 ? "#a78bfa" : i % 3 === 1 ? "#22d3ee" : "#34d399",
		};
	});
}

function OrbitingNodes({ scrollProgress, reduceMotion }: SceneProps) {
	const groupRef = useRef<THREE.Group>(null);

	const nodes = useMemo(() => generateOrbitingNodes(), []);

	useFrame((_, delta) => {
		if (reduceMotion || !groupRef.current) return;
		// Orbit speed increases with scroll
		groupRef.current.rotation.y += delta * (0.1 + scrollProgress * 0.3);
	});

	return (
		<group ref={groupRef}>
			{nodes.map((node, i) => (
				<Float
					key={i}
					speed={reduceMotion ? 0 : 2}
					rotationIntensity={reduceMotion ? 0 : 0.5}
					floatIntensity={reduceMotion ? 0 : 0.5}
				>
					<mesh position={node.position}>
						<sphereGeometry args={[node.size, 12, 12]} />
						<meshStandardMaterial
							color={node.color}
							emissive={node.color}
							emissiveIntensity={0.8}
						/>
					</mesh>
				</Float>
			))}
		</group>
	);
}

// ─── Main export ───────────────────────────────────────────────────────────

export function ScrollScene3D() {
	const prefersReducedMotion = useReducedMotion();
	const { progress, velocity } = useScrollProgress();
	const mouse = useMouse();

	const sceneProps: SceneProps = {
		scrollProgress: progress,
		scrollVelocity: velocity,
		mouse,
		reduceMotion: Boolean(prefersReducedMotion),
	};

	return (
		<div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
			<Canvas
				camera={{ position: [0, 0, 8], fov: 60 }}
				dpr={[1, 1.5]}
				gl={{
					antialias: true,
					alpha: true,
					powerPreference: "high-performance",
				}}
				style={{ background: "transparent" }}
			>
				<ambientLight intensity={0.3} />
				<pointLight position={[5, 5, 5]} intensity={0.6} color="#22d3ee" />
				<pointLight position={[-5, -3, 2]} intensity={0.4} color="#a78bfa" />
				<pointLight position={[0, 0, -10]} intensity={0.3} color="#34d399" />

				<ScrollCamera {...sceneProps} />
				<GalaxyParticles {...sceneProps} />
				<MemoryCore {...sceneProps} />
				<OrbitingNodes {...sceneProps} />
			</Canvas>
		</div>
	);
}
