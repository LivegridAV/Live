/**
 * V2 service motifs — one distinct technical visual per service (brief §35).
 * Static, restrained line work on graphite; a single cyan signal accent each.
 * No two services share a motif — services read as visual stories, not cards.
 */
import type { JSX } from "react";

const METAL = "var(--v2-metal)";
const LINE = "rgba(240,232,216,0.22)";
const CYAN = "var(--v2-cyan)";
const RED = "var(--v2-red)";
const AMBER = "var(--v2-amber)";

const box = "0 0 400 300";

/** AV Engineering — the signal path across nodes. */
function Signal() {
  const nodes = [40, 130, 220, 310];
  return (
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="400" height="300" fill="transparent" />
      <line x1="40" y1="150" x2="360" y2="150" stroke={LINE} strokeWidth="1.5" />
      <line x1="40" y1="150" x2="360" y2="150" stroke={CYAN} strokeWidth="2"
        strokeDasharray="10 320" strokeDashoffset="0">
        <animate attributeName="stroke-dashoffset" from="330" to="0" dur="3.2s" repeatCount="indefinite" />
      </line>
      {nodes.map((x, i) => (
        <g key={x}>
          <rect x={x - 18} y={132} width="36" height="36" rx="6" fill="var(--v2-surface-2)" stroke={LINE} />
          <circle cx={x} cy={150} r="4" fill={i === 1 ? CYAN : METAL} />
        </g>
      ))}
      <text x="40" y="200" fill="var(--v2-faint)" fontFamily="monospace" fontSize="11" letterSpacing="2">SOURCE · PROC · SWITCH · SCREEN</text>
    </svg>
  );
}

/** LED Systems — a wall of modules, a few lit, seam grid visible. */
function Led() {
  const cols = 12, rows = 8, lit = new Set([27, 28, 39, 40, 51, 63, 64]);
  const cells: JSX.Element[] = [];
  const w = 26, h = 26, gap = 3, ox = 46, oy = 30;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    cells.push(<rect key={i} x={ox + c * (w + gap)} y={oy + r * (h + gap)} width={w} height={h} rx="2"
      fill={lit.has(i) ? CYAN : "var(--v2-surface-2)"} opacity={lit.has(i) ? 0.9 : 1}
      stroke={LINE} strokeWidth="0.5" />);
  }
  return (
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {cells}
    </svg>
  );
}

/** 3D / Anamorphic — L-corner LED, a form popping out, viewer sightlines. */
function Anamorphic() {
  return (
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {/* corner LED */}
      <polygon points="60,60 210,90 210,240 60,220" fill="var(--v2-surface-2)" stroke={LINE} />
      <polygon points="210,90 330,60 330,220 210,240" fill="var(--v2-surface)" stroke={LINE} />
      {/* popped-out form */}
      <path d="M150 175 q40 -70 90 -35 q30 25 -5 55 q-45 35 -85 -20 Z" fill="none" stroke={CYAN} strokeWidth="2" />
      <path d="M150 175 q40 -70 90 -35" fill="none" stroke={AMBER} strokeWidth="1.5" opacity="0.7" />
      {/* viewer + sightlines */}
      <circle cx="200" cy="270" r="6" fill={METAL} />
      <line x1="200" y1="270" x2="70" y2="70" stroke={LINE} strokeWidth="0.75" strokeDasharray="3 4" />
      <line x1="200" y1="270" x2="325" y2="70" stroke={LINE} strokeWidth="0.75" strokeDasharray="3 4" />
      <text x="176" y="292" fill="var(--v2-faint)" fontFamily="monospace" fontSize="10" letterSpacing="2">SWEET SPOT</text>
    </svg>
  );
}

/** Projection — projector, frustum, mapped surface. */
function Projection() {
  return (
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect x="40" y="140" width="46" height="26" rx="4" fill="var(--v2-surface-2)" stroke={LINE} />
      <circle cx="86" cy="153" r="6" fill={METAL} />
      <polygon points="90,148 90,158 320,90 320,230" fill={AMBER} opacity="0.12" />
      <polygon points="90,148 90,158 320,90 320,230" fill="none" stroke={AMBER} strokeWidth="1" opacity="0.5" />
      <rect x="316" y="86" width="44" height="150" rx="4" fill="var(--v2-surface)" stroke={LINE} />
      <path d="M326 120 q10 -14 22 0 t22 0" fill="none" stroke={CYAN} strokeWidth="1.5" />
      <text x="300" y="262" fill="var(--v2-faint)" fontFamily="monospace" fontSize="10" letterSpacing="2">WARP · BLEND</text>
    </svg>
  );
}

/** Show Control — a cue stack with GO. */
function Cue() {
  const rows = ["01  HOUSE  →  DOWN", "02  VIDEO  →  IN", "03  TITLE  →  ON", "04  BAND   →  KEY"];
  return (
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {rows.map((t, i) => (
        <g key={i}>
          <rect x="44" y={60 + i * 42} width="240" height="32" rx="5"
            fill={i === 1 ? "rgba(70,216,202,0.10)" : "var(--v2-surface-2)"}
            stroke={i === 1 ? CYAN : LINE} />
          <text x="58" y={81 + i * 42} fill={i === 1 ? CYAN : "var(--v2-muted)"} fontFamily="monospace" fontSize="12" letterSpacing="1">{t}</text>
        </g>
      ))}
      <rect x="300" y="102" width="56" height="56" rx="10" fill={CYAN} />
      <text x="313" y="137" fill="#08110f" fontFamily="monospace" fontSize="17" fontWeight="700">GO</text>
    </svg>
  );
}

/** Live Production — PREVIEW / PROGRAM monitors + TAKE. */
function Switch() {
  return (
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect x="40" y="60" width="150" height="96" rx="6" fill="var(--v2-surface-2)" stroke={CYAN} />
      <rect x="210" y="60" width="150" height="96" rx="6" fill="var(--v2-surface-2)" stroke={RED} />
      <text x="48" y="176" fill={CYAN} fontFamily="monospace" fontSize="11" letterSpacing="2">PREVIEW</text>
      <text x="218" y="176" fill={RED} fontFamily="monospace" fontSize="11" letterSpacing="2">PROGRAM</text>
      <rect x="150" y="210" width="100" height="40" rx="8" fill="var(--v2-surface)" stroke={LINE} />
      <text x="176" y="235" fill="var(--v2-text)" fontFamily="monospace" fontSize="14" letterSpacing="3">TAKE</text>
    </svg>
  );
}

/** Content Design — layered timeline. */
function Content() {
  const bars = [
    { y: 70, w: 300, c: METAL }, { y: 110, w: 220, c: CYAN }, { y: 150, w: 270, c: METAL },
    { y: 190, w: 160, c: AMBER }, { y: 230, w: 240, c: METAL },
  ];
  return (
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {[70, 110, 150, 190, 230].map((y) => <line key={y} x1="44" y1={y + 12} x2="360" y2={y + 12} stroke={LINE} strokeWidth="0.5" />)}
      {bars.map((b, i) => (
        <rect key={i} x="44" y={b.y} width={b.w} height="20" rx="4" fill={b.c} opacity={b.c === METAL ? 0.35 : 0.8} />
      ))}
      <line x1="150" y1="54" x2="150" y2="262" stroke={CYAN} strokeWidth="1.5" />
      <circle cx="150" cy="54" r="4" fill={CYAN} />
    </svg>
  );
}

/** Immersive — a room wrapped in surfaces. */
function Immersive() {
  return (
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <polygon points="80,70 320,70 280,110 120,110" fill="var(--v2-surface-2)" stroke={LINE} />
      <polygon points="80,70 120,110 120,230 80,250" fill="var(--v2-surface)" stroke={LINE} />
      <polygon points="320,70 280,110 280,230 320,250" fill="var(--v2-surface)" stroke={LINE} />
      <polygon points="120,110 280,110 280,230 120,230" fill="rgba(70,216,202,0.06)" stroke={LINE} />
      <circle cx="200" cy="200" r="5" fill={CYAN} />
      <path d="M200 200 L120 110 M200 200 L280 110 M200 200 L120 230 M200 200 L280 230" stroke={LINE} strokeWidth="0.5" strokeDasharray="3 4" />
    </svg>
  );
}

/** Web Development — a browser frame with a live grid. */
function Web() {
  const cells: JSX.Element[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const lit = (r + c) % 4 === 0;
    cells.push(<rect key={`${r}${c}`} x={70 + c * 44} y={120 + r * 34} width="34" height="24" rx="3"
      fill={lit ? CYAN : "var(--v2-surface-2)"} opacity={lit ? 0.8 : 1} stroke={LINE} strokeWidth="0.5" />);
  }
  return (
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect x="52" y="70" width="296" height="180" rx="10" fill="var(--v2-surface)" stroke={LINE} />
      <line x1="52" y1="100" x2="348" y2="100" stroke={LINE} />
      <circle cx="68" cy="85" r="3.5" fill={METAL} /><circle cx="80" cy="85" r="3.5" fill={METAL} /><circle cx="92" cy="85" r="3.5" fill={METAL} />
      {cells}
    </svg>
  );
}

export const MOTIFS = {
  signal: Signal, led: Led, anamorphic: Anamorphic, projection: Projection,
  cue: Cue, switch: Switch, content: Content, immersive: Immersive, web: Web,
} as const;

export type MotifKey = keyof typeof MOTIFS;

export default function Motif({ name }: { name: MotifKey }) {
  const C = MOTIFS[name];
  return <C />;
}
