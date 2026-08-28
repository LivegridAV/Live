"use client";
import { useMemo, useState } from "react";

/**
 * Interactive anamorphic viewpoint demonstrator (brief §10/§11/§25/§26).
 *
 * This is NOT a CSS `perspective()` fake. A virtual 3D object is *baked* onto the
 * physical LED surfaces (a floor panel + a back wall) exactly as it would be for a
 * real naked-eye-3D install: for every point of the object we trace the ray from
 * the DESIGN eye through the point and record where it lands on the LED. That
 * baked, flat content is then re-photographed from the visitor's *current* eye
 * position (the slider). From the design viewpoint the flat content resolves into
 * a solid standing object; move away and it visibly shears back into flat panels —
 * which is precisely why anamorphic content only works from one sweet spot.
 *
 * Colour: the LED panels + UI use LiveGrid cyan (digital), the reconstructed
 * object is a warm/neutral solid (physical world is never cyan, art-direction
 * rule) with only a faint cyan LED rim.
 */

type V3 = [number, number, number];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/* ── Scene (world units, y up; wall at z=0, floor at y=0 out to the viewer) ── */
const TARGET: V3 = [0, 0.5, 1.15]; // where every camera looks
// The anamorphic sweet spot — a 3/4 view so the reconstructed object reads as
// a solid with visible top + side faces, not a flat head-on rectangle.
const DESIGN_EYE: V3 = [1.15, 1.8, 4.3];
const F = 2.15; // focal length
const SCALE = 82; // world→viewBox scale
const CX = 170;
const CY = 132;

// A monolith standing on the floor in front of the wall.
const BOX = { x0: -0.55, x1: 0.55, y0: 0, y1: 1.35, z0: 1.05, z1: 1.95 };
const V = BOX;
const CORNERS: V3[] = [
  [V.x0, V.y0, V.z0], [V.x1, V.y0, V.z0], [V.x1, V.y0, V.z1], [V.x0, V.y0, V.z1],
  [V.x0, V.y1, V.z0], [V.x1, V.y1, V.z0], [V.x1, V.y1, V.z1], [V.x0, V.y1, V.z1],
];
const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], // base
  [4, 5], [5, 6], [6, 7], [7, 4], // top
  [0, 4], [1, 5], [2, 6], [3, 7], // verticals
];
// Faces (CCW-ish) for translucent solid fill, painter-sorted by baked depth.
const FACES: number[][] = [
  [0, 1, 2, 3], // bottom
  [4, 5, 6, 7], // top
  [0, 1, 5, 4], // front (toward wall)
  [3, 2, 6, 7], // back (toward viewer)
  [1, 2, 6, 5], // right
  [0, 3, 7, 4], // left
];

/** Perspective projection of a world point through `eye` looking at TARGET. */
function project(p: V3, eye: V3): [number, number] | null {
  const fwd = norm(sub(TARGET, eye));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const d = sub(p, eye);
  const z = dot(d, fwd);
  if (z <= 0.05) return null;
  const x = dot(d, right);
  const y = dot(d, up);
  return [CX + (x / z) * F * SCALE, CY - (y / z) * F * SCALE];
}

/**
 * Bake a world point onto the LED surfaces as seen from the design eye:
 * trace the ray design-eye → point, continue past the point, return the first
 * hit on the floor (y=0) or the back wall (z=0).
 */
function bake(p: V3): V3 {
  const dir = sub(p, DESIGN_EYE);
  const tFloor = dir[1] !== 0 ? -DESIGN_EYE[1] / dir[1] : Infinity;
  const tWall = dir[2] !== 0 ? -DESIGN_EYE[2] / dir[2] : Infinity;
  // only surfaces *behind* the object (t > 1) count
  const cand = [tFloor, tWall].filter((t) => t > 1.0001 && Number.isFinite(t));
  const t = cand.length ? Math.min(...cand) : 1;
  return [DESIGN_EYE[0] + dir[0] * t, DESIGN_EYE[1] + dir[1] * t, DESIGN_EYE[2] + dir[2] * t];
}

/** Sample a 3D edge, bake each sample → a flat surface polyline. */
function bakedEdge(a: V3, b: V3): V3[] {
  const N = 7;
  const out: V3[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    out.push(bake([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]));
  }
  return out;
}

const BAKED = EDGES.map(([i, j]) => bakedEdge(CORNERS[i], CORNERS[j]));

function poly(points: ([number, number] | null)[]): string {
  const pts = points.filter((p): p is [number, number] => !!p);
  if (pts.length < 2) return "";
  return "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L");
}

export default function AnamorphicViewpoint() {
  const [pos, setPos] = useState(0); // -1 … 1, viewer x-offset from sweet spot

  const { content, faces, panels, alignPct, locked } = useMemo(() => {
    const eye: V3 = [DESIGN_EYE[0] + pos * 2.3, DESIGN_EYE[1], DESIGN_EYE[2]];
    // baked box corners → the flat content that actually lives on the LED
    const bc = CORNERS.map(bake);
    const pc = bc.map((c) => project(c, eye));
    // translucent solid faces, painter-sorted far→near for a believable volume
    const faces = FACES.map((f) => {
      const depth =
        f.reduce(
          (s, i) => s + Math.hypot(bc[i][0] - eye[0], bc[i][1] - eye[1], bc[i][2] - eye[2]),
          0,
        ) / f.length;
      return { d: poly([...f.map((i) => pc[i]), pc[f[0]]]), depth };
    }).sort((a, b) => b.depth - a.depth);
    const content = BAKED.map((edge) => poly(edge.map((s) => project(s, eye))));
    // LED panels
    const floor: V3[] = [[-2.2, 0, 0], [2.2, 0, 0], [2.2, 0, 2.7], [-2.2, 0, 2.7]];
    const wall: V3[] = [[-2.2, 0, 0], [2.2, 0, 0], [2.2, 2.3, 0], [-2.2, 2.3, 0]];
    const panels = {
      floor: poly([...floor, floor[0]].map((p) => project(p, eye))),
      wall: poly([...wall, wall[0]].map((p) => project(p, eye))),
    };
    const alignPct = Math.round(100 * Math.max(0, 1 - Math.abs(pos) / 0.82));
    return { content, faces, panels, alignPct, locked: Math.abs(pos) < 0.05 };
  }, [pos]);

  const fillA = 0.05 + 0.2 * (alignPct / 100);

  return (
    <div className="grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-center">
      <div className="overflow-hidden rounded-[20px] border border-line bg-white p-4">
        <svg viewBox="0 0 340 250" className="w-full" role="img"
             aria-label={`Anamorphic content viewed ${locked ? "from the design viewpoint" : "off-axis"}`}>
          <defs>
            <linearGradient id="lgAnaObj" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f4e7cf" />
              <stop offset="1" stopColor="#c9a26a" />
            </linearGradient>
          </defs>
          {/* void */}
          <rect x="0" y="0" width="340" height="250" fill="#070f0d" />
          {/* LED panels (digital → cyan) */}
          <path d={panels.floor} fill="rgba(31,160,147,0.07)" stroke="rgba(63,214,200,0.45)" strokeWidth="1" />
          <path d={panels.wall} fill="rgba(31,160,147,0.05)" stroke="rgba(63,214,200,0.32)" strokeWidth="1" />
          {/* solid faces — a believable volume at the sweet spot, sheared shards off-axis */}
          <g>
            {faces.map((f, i) =>
              f.d ? <path key={i} d={f.d} fill={`rgba(201,162,106,${fillA.toFixed(3)})`} stroke="none" /> : null,
            )}
          </g>
          {/* the baked flat content, re-seen from the current eye (natural, warm) */}
          <g
            fill="none"
            stroke={locked ? "url(#lgAnaObj)" : "rgba(201,162,106,0.5)"}
            strokeWidth={locked ? 2.4 : 1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: locked ? "drop-shadow(0 0 5px rgba(63,214,200,0.35))" : "none", transition: "stroke-width .2s" }}
          >
            {content.map((d, i) => (d ? <path key={i} d={d} /> : null))}
          </g>
          {/* sweet-spot readout */}
          <text x="16" y="238" fontSize="10" fill="#6c7a76" fontFamily="var(--font-mono)" letterSpacing="1.5">
            {locked ? "VIEWPOINT · LOCKED" : `ALIGNMENT · ${alignPct}%`}
          </text>
          <text x="324" y="238" textAnchor="end" fontSize="10"
                fill={locked ? "#3fd6c8" : "#6c7a76"} fontFamily="var(--font-mono)" letterSpacing="1.5">
            {locked ? "3D" : "FLAT LED"}
          </text>
        </svg>
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Move the viewer</p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-text">
          The illusion has one sweet spot
        </h3>
        <p className="mt-4 max-w-[42ch] leading-relaxed text-muted">
          {locked
            ? "From the design viewpoint the flat LED content resolves into a solid object standing on the floor — naked-eye 3D."
            : "Step off the design axis and the same content shears back into what it really is: flat pixels on two panels. That's why we build every anamorphic to a measured viewpoint."}
        </p>

        <label className="mt-7 block">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            Viewer position
          </span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={pos}
            onChange={(e) => setPos(parseFloat(e.target.value))}
            aria-label="Viewer position relative to the anamorphic sweet spot"
            className="lg-ana-range mt-3 w-full"
          />
          <span className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            <span>off-axis</span>
            <span className={locked ? "text-aqua" : ""}>design viewpoint</span>
            <span>off-axis</span>
          </span>
        </label>

        <button
          onClick={() => setPos(0)}
          className="mt-6 rounded-lg border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-aqua hover:text-aqua"
        >
          Snap to sweet spot
        </button>
      </div>
    </div>
  );
}
