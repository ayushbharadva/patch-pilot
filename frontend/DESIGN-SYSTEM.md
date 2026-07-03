# PatchPilot — Neural Dark Design System (260703-vga)

The contract for the "Neural Dark — living incident brain" redesign. Every
component MUST build on these tokens/primitives and **must not invent its own
colors** — reuse the ramp and utilities below so the whole app stays coherent.

The app is **dark-by-default**: `<html class="dark">` is hardcoded in
`app/layout.tsx` and the neural-dark palette lives on `:root` in
`app/globals.css`. You never need to wire theming; just style for dark.

The global **AuroraBackground** atmosphere is already mounted once in
`app/layout.tsx` (fixed, behind everything, `pointer-events-none`). **Do not
mount it again.** Let your content sit on top normally (it renders above the
`-z-10` atmosphere); use `.glass` surfaces so the aurora glows through.

---

## Color tokens (already themed dark — just use the utilities)

Standard shadcn tokens are redefined to neural-dark values, so existing
utilities already look right: `bg-background` (#07060f deep space-black),
`text-foreground` (#e8e9f5), `bg-card`, `text-muted-foreground` (#9fa2c0),
`border-border`, `bg-primary` / `text-primary` (indigo #6366f1),
`bg-secondary`, `bg-muted`, `bg-accent` (neutral hover), `text-destructive`
(#f87171), `ring-ring` (#818cf8 focus).

Brand accent ramp (indigo → violet → cyan), available as Tailwind color
utilities:

- `accent-indigo` = #6366f1 → `text-accent-indigo`, `bg-accent-indigo`, `border-accent-indigo`
- `accent-violet` = #8b5cf6 → `text-accent-violet`, …
- `accent-cyan` = #22d3ee → `text-accent-cyan`, …

Drift palette (names unchanged — luminous dark values). Utilities already
generated: `text-drift-stable` / `bg-drift-stable` / `border-drift-stable`
(#4ade80), `…-drift-aging` (#fbbf24), `…-drift-drifting` (#f87171). The
`data-[health-state=stable|aging|drifting]` variant hooks on the version badge
still work.

---

## Utility classes (defined in globals.css — compose via `cn()`)

- `.glass` — the default luminous frosted-glass surface (translucent fill,
  `backdrop-blur`, hairline border, inset top highlight, soft drop shadow).
  The `<Card>` primitive already applies this, so most panels get it free.
  Use directly on custom panels (search bar shell, graph frame, tiles).
- `.glass-strong` — more opaque glass for popovers/dropdowns/menus where
  legibility over the aurora matters.
- `.text-gradient` — indigo→violet→cyan gradient text. Pair with
  `font-display` for headlines/brand marks. Example:
  `<h1 className="font-display text-5xl font-semibold text-gradient">`.
- `.border-gradient` — gradient hairline border around a card-colored fill
  (for a highlighted/hero card).
- `.glow-primary` — brand indigo/violet halo. `.glow-soft` — subtler brand halo.
- `.glow-drift-stable` / `.glow-drift-aging` / `.glow-drift-drifting` — colored
  halos matching each drift state (put on the drift dot/badge/row).

## Motion utilities (all auto-disabled under `prefers-reduced-motion`)

- `.animate-rise-in` — entrance fade + rise (use on cards/results when they appear).
- `.animate-drift-pulse` — pulsing red halo for the **drifting** (🔴) state —
  put it on the drifting badge/dot so it visibly throbs.
- `.animate-aurora` — slow drift (used by the atmosphere; rarely needed elsewhere).
- `.animate-float` — gentle vertical float (accent nodes/particles).
- `.animate-shimmer` — sweeping shimmer for loading placeholders. The
  `<Skeleton>` primitive already uses it.

Prefer `transform`/`opacity` for any hand-rolled animation. Always keep new
motion behind the reduced-motion guard (adding a class from above already is).

---

## Elevated base primitives (already restyled — inherit them)

- `<Card>` (`components/ui/card.tsx`) → glass surface, `rounded-2xl`. Add
  `.glow-*`, `.animate-rise-in`, hover states via `className`.
- `<Button variant="default">` → indigo→violet→cyan gradient with a brand glow
  that intensifies + slides on hover. All other variants (outline, ghost,
  secondary, destructive, link) and the full API are unchanged.
- `<Input>` → translucent glass field with an indigo focus glow.
- `<Skeleton>` → shimmering glass placeholder.

APIs, exported names, and CVA variant names are all unchanged — restyle via
`className` only; never rename props or change component signatures.

---

## Hard rules for every component agent

1. **Restyle only.** Do not change exported component names, public props,
   import paths, react-query keys, or any API-call wiring. Preserve all D-xx
   behaviors (Dismiss = client-only, "Reinforced ✓", auto re-search keeps the
   card mounted, no_results copy, D-24 short messages verbatim, Forget two-step
   confirm + guard, EVIDENCE_DISPLAY_LIMIT=3, upload polling).
2. **Reuse these tokens/utilities.** No new hardcoded hex colors — use the ramp,
   the drift palette, and the glass/glow/gradient/motion utilities above.
3. **Accessibility:** keep aria-live regions, `sr-only` labels, `focus-visible`
   rings, 44px (`h-11`) hit targets, aria-labels. New motion must respect
   reduced motion (use the `.animate-*` utilities, which already do).
4. **Fonts stay locked:** `font-display` (Space Grotesk) for headings,
   `font-sans` (Inter) for body/UI, `font-mono` (IBM Plex Mono) for technical
   strings (dataset names, version tags, inline query text).
5. **No new npm dependencies. No backend edits.** CSS-first motion only.
6. Make it **bold and obviously different** — this redesign must read as a
   dramatic upgrade, not a subtle one.
