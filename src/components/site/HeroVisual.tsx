/**
 * Procedural hero visual — a glowing LED wall receding in perspective, matching
 * the reference comps' rich hero imagery without needing photo assets. Pure
 * CSS/SVG-free divs: server-rendered, lightweight, theme-cyan, and calmed under
 * prefers-reduced-motion (see globals.css). `variant` shifts the angle + focal
 * bloom so each page reads a little differently.
 */

const COLS = 14;
const ROWS = 8;

type Variant =
  | "stage" | "signal" | "led" | "work" | "projection"
  | "contact" | "about" | "lab" | "insights" | "equipment";

const CONF: Record<Variant, { rot: number; fx: number; fy: number }> = {
  stage: { rot: -16, fx: 0.5, fy: 0.42 },
  signal: { rot: -14, fx: 0.18, fy: 0.5 },
  led: { rot: -20, fx: 0.5, fy: 0.5 },
  work: { rot: -12, fx: 0.68, fy: 0.36 },
  projection: { rot: -22, fx: 0.6, fy: 0.32 },
  contact: { rot: -10, fx: 0.5, fy: 0.46 },
  about: { rot: -16, fx: 0.4, fy: 0.42 },
  lab: { rot: -18, fx: 0.5, fy: 0.5 },
  insights: { rot: -14, fx: 0.56, fy: 0.4 },
  equipment: { rot: -18, fx: 0.46, fy: 0.5 },
};

/** Deterministic 0..1 hash so server and client render identically. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export default function HeroVisual({
  variant = "stage",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const { rot, fx, fy } = CONF[variant];
  const maxD = Math.hypot(Math.max(fx, 1 - fx), Math.max(fy, 1 - fy));

  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const nx = c / (COLS - 1);
      const ny = r / (ROWS - 1);
      const d = Math.hypot(nx - fx, ny - fy) / maxD;
      const base = Math.max(0, 1 - d * 1.25);
      const sparkle = 0.45 + hash(r * COLS + c) * 0.95;
      const b = Math.min(1, base * sparkle);
      const lit = b > 0.16;
      const alpha = lit ? 0.16 + b * 0.72 : 0.05;
      cells.push(
        <span
          key={`${r}-${c}`}
          className="lg-herovis-cell"
          style={{
            background: `rgba(63, 214, 200, ${alpha})`,
            boxShadow: lit && b > 0.52 ? `0 0 ${7 + b * 11}px rgba(63,214,200,${b * 0.6})` : undefined,
            animationDelay: `${((c + r) % 9) * 0.22}s`,
            opacity: lit ? 1 : 0.7,
          }}
        />,
      );
    }
  }

  return (
    <div className={`lg-herovis ${className}`} aria-hidden>
      <div className="lg-herovis-panel" style={{ transform: `rotateY(${rot}deg) rotateX(5deg)` }}>
        {cells}
      </div>
      <span className="lg-herovis-bloom" style={{ left: `${fx * 100}%`, top: `${fy * 100}%` }} />
      <span className="lg-herovis-scan" />
    </div>
  );
}
