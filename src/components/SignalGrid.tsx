"use client";
import { useEffect, useState } from "react";
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
  // Only animate after mount so the server and first client render match
  // (avoids a hydration mismatch from reduced-motion detection).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { on, off } = PALETTES[palette];
  const radius =
    cell <= 5 ? 1 : cell <= 9 ? 2 : cell <= 20 ? 3 : Math.round(cell * 0.125);
  const blur = Math.round(cell * 0.23);
  const play = animate && !reduce && mounted;

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
      aria-hidden
    >
      {cells}
    </div>
  );
}
