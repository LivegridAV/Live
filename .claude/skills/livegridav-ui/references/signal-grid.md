# SignalGrid component

The brand's core visual: a 5×5 LED matrix whose columns rise like signal bars.
Use it for the logo mark, loaders, section accents, empty states — anywhere you'd
otherwise reach for a generic icon.

## Behavior
- Column heights (left→right, counted from the bottom): `[2, 4, 3, 5, 4]`.
- A cell at `row` (0 = top) is **lit** when `(5 - row) <= heights[col]`.
- Lit cells glow; unlit cells are a dim version of the surface.
- When `animate`, lit cells pop in on a diagonal sweep from the bottom-left
  (`order = col + (4 - row)`, delay `order * 0.13s`), looping calmly.

## Component

Save as `src/components/SignalGrid.tsx`. Uses the `motion` package (`motion/react`).

```tsx
"use client";
import { motion, useReducedMotion } from "motion/react";

const HEIGHTS = [2, 4, 3, 5, 4] as const;

type Palette = "light" | "dark";

const PALETTES: Record<Palette, { on: string; off: string }> = {
  light: { on: "#1fa093", off: "#e1e6e5" },
  dark: { on: "#3fd6c8", off: "#22332f" },
};

export default function SignalGrid({
  cell = 48,
  gap = 9,
  palette = "dark",
  glow = true,
  animate = true,
  className,
}: {
  cell?: number;
  gap?: number;
  palette?: Palette;
  glow?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { on, off } = PALETTES[palette];
  const radius = cell <= 5 ? 1 : cell <= 9 ? 2 : cell <= 20 ? 3 : Math.round(cell * 0.125);
  const blur = Math.round(cell * 0.23);
  const play = animate && !reduce;

  const cells = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const lit = 5 - row <= HEIGHTS[col];
      const order = col + (4 - row);
      cells.push(
        <motion.div
          key={`${row}-${col}`}
          style={{
            width: cell,
            height: cell,
            borderRadius: radius,
            background: lit ? on : off,
            boxShadow: lit && glow ? `0 0 ${blur}px ${on}` : undefined,
          }}
          initial={play && lit ? { scale: 0.35, opacity: 0.12 } : false}
          animate={
            play && lit
              ? { scale: [0.35, 1, 1, 0.35], opacity: [0.12, 1, 1, 0.12] }
              : {}
          }
          transition={
            play && lit
              ? {
                  duration: 3.4,
                  times: [0, 0.14, 0.78, 1],
                  ease: "easeInOut",
                  repeat: Infinity,
                  delay: order * 0.13,
                }
              : undefined
          }
        />
      );
    }
  }

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(5, ${cell}px)`,
        gridTemplateRows: `repeat(5, ${cell}px)`,
        gap,
      }}
    >
      {cells}
    </div>
  );
}
```

## Usage

```tsx
// Hero mark (animated, on a dark section)
<SignalGrid cell={52} palette="dark" />

// Small static logo bug in the navbar
<SignalGrid cell={16} gap={3} palette="light" animate={false} />

// Loader — center it and let it sweep
<SignalGrid cell={28} palette="dark" />
```

Notes
- Pair with the wordmark for a full lockup: grid + `livegrid<span className="text-aqua">AV</span>`.
- On light surfaces pass `palette="light"`; on `bg-ink` sections use `palette="dark"`.
- For a purely decorative accent, keep `animate` on but small; for logos in dense UI
  (navbars, favicons) set `animate={false}` so it reads instantly.
- Static SVG/PNG versions of every lockup live in `public/brand/` if you need a
  non-React asset (og images, emails, favicons).
```
