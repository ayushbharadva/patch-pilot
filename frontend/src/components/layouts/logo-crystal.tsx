"use client";

import dynamic from "next/dynamic";

import { cn } from "@landing/lib/utils";

function LogoMarkColor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient
          id="pp-crystal-front"
          x1="16"
          y1="5.3"
          x2="15"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f0feff" />
          <stop offset="1" stopColor="#6fdcea" />
        </linearGradient>
      </defs>

      {/* Facets — front lit, teal right, sky left, indigo bottom (match 3D) */}
      <polygon points="6.2,18.3 16,5.3 23.4,19.5" fill="url(#pp-crystal-front)" />
      <polygon points="16,5.3 23.5,14.2 23.4,19.5" fill="#5eead4" />
      <polygon points="6.2,18.3 16,5.3 10.9,13.6" fill="#38bdf8" />
      <polygon points="6.2,18.3 23.4,19.5 16,25.2" fill="#6366f1" />

      {/* Glowing hairline cuts — hexagon silhouette + internal ridges */}
      <g
        stroke="#e0fbff"
        strokeWidth="0.9"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      >
        <polygon
          points="23.5,14.2 16,5.3 10.9,13.6 6.2,18.3 16,25.2 23.4,19.5"
          strokeOpacity="0.9"
        />
        <line x1="16" y1="5.3" x2="23.4" y2="19.5" strokeOpacity="0.5" />
        <line x1="16" y1="5.3" x2="6.2" y2="18.3" strokeOpacity="0.5" />
        <line x1="23.4" y1="19.5" x2="6.2" y2="18.3" strokeOpacity="0.5" />
      </g>
    </svg>
  );
}

const Crystal3D = dynamic(
  () =>
    import("@landing/components/three/logo-crystal-3d").then(
      (m) => m.LogoCrystal3D,
    ),
  {
    ssr: false,
    loading: () => <LogoMarkColor className="size-full" />,
  },
);

export function LogoCrystal({ className }: { className?: string }) {
  return (
    <span className={cn("relative block shrink-0", className)}>
      <Crystal3D className="size-full" />
    </span>
  );
}
