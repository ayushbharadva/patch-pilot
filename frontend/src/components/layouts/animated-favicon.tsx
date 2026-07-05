"use client";

import { useEffect } from "react";

/**
 * AnimatedFavicon — spins the PatchPilot crystal in the browser tab.
 *
 * Browsers don't animate favicon image files (Chrome/Safari ignore animated
 * GIFs), so the only way to move a tab icon is to redraw it from JS: render
 * each frame to a tiny offscreen 2D canvas and swap the `<link rel="icon">`
 * href. This reuses the SAME octahedron geometry, colours, tilt and spin speed
 * as the 3D logo (a pure 2D painter's-algorithm render — no extra WebGL
 * context), so the tab matches the in-app mark.
 *
 * Guards:
 *  - `prefers-reduced-motion`: leaves the static `icon.svg` untouched.
 *  - Hidden tab: pauses (browsers throttle background tabs to ~1fps anyway).
 *  - Frame-rate capped (~18fps) and driven by real elapsed time so the spin
 *    speed is constant regardless of frame rate.
 *
 * Note: Safari updates dynamic favicons inconsistently — treat this as
 * progressive enhancement on top of the static `icon.svg` fallback.
 */

// Renders at 2× the common 32px tab slot for a crisp downscale.
const SIZE = 64;
const CAM_DIST = 4.2;
const FOV_RAD = (40 * Math.PI) / 180;
const FOCAL = SIZE / 2 / Math.tan(FOV_RAD / 2);
const TILT_X = 0.34; // fixed pitch — matches the 3D group's base rotation.x
const SPIN_BASE = 0.62; // starting yaw — matches base rotation.y
const SPIN_RATE = 0.5; // rad/s — matches the 3D useFrame spin
const FPS = 18;

// Unit octahedron: ±X, ±Y, ±Z.
const VERTS: [number, number, number][] = [
  [1, 0, 0], // 0 +X
  [-1, 0, 0], // 1 -X
  [0, 1, 0], // 2 +Y
  [0, -1, 0], // 3 -Y
  [0, 0, 1], // 4 +Z
  [0, 0, -1], // 5 -Z
];

// Brand facet colours keyed by hemisphere + side (identical rule to the 3D).
const TEAL: [number, number, number] = [94, 234, 212]; // #5eead4
const SKY: [number, number, number] = [56, 189, 248]; // #38bdf8
const VIOLET: [number, number, number] = [139, 92, 246]; // #8b5cf6
const INDIGO: [number, number, number] = [99, 102, 241]; // #6366f1

interface Face {
  i: [number, number, number];
  normal: [number, number, number];
  color: [number, number, number];
}

// The 8 faces (one vertex per axis) with a precomputed outward normal + colour.
const FACES: Face[] = (() => {
  const out: Face[] = [];
  for (const sx of [0, 1]) {
    for (const sy of [2, 3]) {
      for (const sz of [4, 5]) {
        const nx = sx === 0 ? 1 : -1;
        const ny = sy === 2 ? 1 : -1;
        const nz = sz === 4 ? 1 : -1;
        const upper = ny >= 0;
        const right = nx >= 0;
        const color = upper
          ? right
            ? TEAL
            : SKY
          : right
            ? VIOLET
            : INDIGO;
        const inv = 1 / Math.sqrt(3);
        out.push({
          i: [sx, sy, sz],
          normal: [nx * inv, ny * inv, nz * inv],
          color,
        });
      }
    }
  }
  return out;
})();

const LIGHT: [number, number, number] = (() => {
  const v: [number, number, number] = [0.25, 0.45, 0.86];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
})();

function rotate(
  [x, y, z]: [number, number, number],
  c1: number,
  s1: number,
  c2: number,
  s2: number,
): [number, number, number] {
  // three.js Euler 'XYZ' with rz = 0 (pitch about X, then yaw about Y).
  return [
    c2 * x + s2 * z,
    s1 * s2 * x + c1 * y - c2 * s1 * z,
    -c1 * s2 * x + s1 * y + c1 * c2 * z,
  ];
}

export function AnimatedFavicon() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // The browser prefers the declared SVG icon and won't swap to our dynamic
    // PNG while that link exists, so remove any existing icon links. The static
    // `icon.svg` file still covers the pre-JS and reduced-motion cases (we
    // returned early above for reduced motion).
    document
      .querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
      .forEach((el) => {
        if (el.id !== "pp-favicon") el.remove();
      });

    let link = document.querySelector<HTMLLinkElement>("link#pp-favicon");
    if (!link) {
      link = document.createElement("link");
      link.id = "pp-favicon";
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
    }

    let raf = 0;
    let lastDraw = 0;
    const start = performance.now();

    const render = (yaw: number) => {
      const c1 = Math.cos(TILT_X);
      const s1 = Math.sin(TILT_X);
      const c2 = Math.cos(yaw);
      const s2 = Math.sin(yaw);

      const rv = VERTS.map((v) => rotate(v, c1, s1, c2, s2));
      const proj = rv.map(([x, y, z]) => {
        const d = CAM_DIST - z;
        return [SIZE / 2 + (FOCAL * x) / d, SIZE / 2 - (FOCAL * y) / d] as [
          number,
          number,
        ];
      });

      // Transparent background — just the crystal, so it adapts to any tab.
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Visible (front-facing) faces, sorted far → near (painter's).
      const visible = FACES.map((f) => {
        const rn = rotate(f.normal, c1, s1, c2, s2);
        const depth =
          (rv[f.i[0]][2] + rv[f.i[1]][2] + rv[f.i[2]][2]) / 3;
        return { f, rn, depth };
      })
        .filter((o) => o.rn[2] > 0)
        .sort((a, b) => a.depth - b.depth);

      for (const { f, rn } of visible) {
        const ndotl = Math.max(
          0,
          rn[0] * LIGHT[0] + rn[1] * LIGHT[1] + rn[2] * LIGHT[2],
        );
        const shade = 0.45 + 0.55 * ndotl;
        const spec = 0.4 * ndotl * ndotl * ndotl;
        const [br, bg, bb] = f.color;
        const r = Math.min(255, br * shade + 255 * spec);
        const g = Math.min(255, bg * shade + 255 * spec);
        const b = Math.min(255, bb * shade + 255 * spec);

        const [p0, p1, p2] = [proj[f.i[0]], proj[f.i[1]], proj[f.i[2]]];
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.closePath();
        ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
        ctx.fill();
        // Glowing hairline cuts.
        ctx.lineJoin = "round";
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "rgba(224, 251, 255, 0.85)";
        ctx.stroke();
      }

      link!.href = canvas.toDataURL("image/png");
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      if (now - lastDraw < 1000 / FPS) return;
      lastDraw = now;
      const elapsed = (now - start) / 1000;
      render(SPIN_BASE + elapsed * SPIN_RATE);
    };

    // Paint the first frame synchronously so the tab updates immediately.
    render(SPIN_BASE);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
